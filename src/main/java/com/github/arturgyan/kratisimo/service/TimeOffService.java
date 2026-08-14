package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.TimeOffRequest;
import com.github.arturgyan.kratisimo.dto.TimeOffResponse;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.entity.EmployeeProfile;
import com.github.arturgyan.kratisimo.entity.TimeOff;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.exception.SlotUnavailableException;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
import com.github.arturgyan.kratisimo.repository.BusinessSettingsRepository;
import com.github.arturgyan.kratisimo.repository.EmployeeProfileRepository;
import com.github.arturgyan.kratisimo.repository.TimeOffRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;

@Service
public class TimeOffService {

    private final TimeOffRepository timeOffRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final BusinessSettingsRepository businessSettingsRepository;
    private final AppointmentRepository appointmentRepository;   // ΝΕΟ: για έλεγχο ραντεβού

    public TimeOffService(TimeOffRepository timeOffRepository,
                          EmployeeProfileRepository employeeProfileRepository,
                          BusinessSettingsRepository businessSettingsRepository,
                          AppointmentRepository appointmentRepository) {
        this.timeOffRepository = timeOffRepository;
        this.employeeProfileRepository = employeeProfileRepository;
        this.businessSettingsRepository = businessSettingsRepository;
        this.appointmentRepository = appointmentRepository;
    }

    @Transactional
    public TimeOffResponse create(Long employeeId, TimeOffRequest request) {

        // ── Επικύρωση 1: υπάρχει ο υπάλληλος; ──
        EmployeeProfile employee = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + employeeId));

        // ── Επικύρωση 2: endDate ≥ startDate ──
        if (request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }

        // ── Επικύρωση 3: όχι άδεια στο παρελθόν ──
        // Κριτήριο: η startDate δεν επιτρέπεται να είναι πριν από ΣΗΜΕΡΑ (τοπική μέρα).
        // "Σήμερα" εξαρτάται από τη ζώνη του καταστήματος, όχι του server (D35/D67).
        BusinessSettings settings = businessSettingsRepository
                .findById(BusinessSettings.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("BusinessSettings not found"));
        ZoneId zone = ZoneId.of(settings.getTimezone());

        LocalDate today = LocalDate.now(zone);
        if (request.startDate().isBefore(today)) {
            throw new IllegalArgumentException("Cannot create time off in the past");
        }

        // ── Γέφυρα LocalDate → Instant (ολόκληρες μέρες, half-open) ──
        // [startDate 00:00, endDate+1 00:00): η endDate είναι INCLUSIVE μέρα, οπότε
        // το τέλος είναι η αρχή της ΕΠΟΜΕΝΗΣ μέρας. Ίδιο μοτίβο με dayRange του engine.
        Instant startsAt = request.startDate().atStartOfDay(zone).toInstant();
        Instant endsAt = request.endDate().plusDays(1).atStartOfDay(zone).toInstant();

        // ── Επικύρωση 4: όχι επικάλυψη με ΑΛΛΗ άδεια (409) ──
        List<TimeOff> overlappingTimeOff =
                timeOffRepository.findOverlapping(employeeId, startsAt, endsAt);
        if (!overlappingTimeOff.isEmpty()) {
            throw new SlotUnavailableException(
                    "Time off overlaps with an existing time off period");
        }

        // ── Επικύρωση 5: όχι υπάρχοντα ραντεβού μέσα στην περίοδο (409) ──
        // Αν ο υπάλληλος έχει ήδη κλεισμένο ραντεβού που πιάνει χρόνο μέσα στην άδεια,
        // η άδεια θα δημιουργούσε ασυνέπεια (πελάτης περιμένει, υπάλληλος απών).
        // Ο admin πρέπει να ακυρώσει τα ραντεβού ΠΡΩΤΑ. Ίδιο overlap query με το booking (D49).
        List<AppointmentStatus> blocking = Arrays.stream(AppointmentStatus.values())
                .filter(AppointmentStatus::blocksTime)
                .toList();
        boolean hasAppointments =
                appointmentRepository.existsOverlapping(employeeId, startsAt, endsAt, blocking);
        if (hasAppointments) {
            throw new SlotUnavailableException(
                    "The employee has appointments during this period; cancel them first");
        }

        // ── Δημιουργία & save ──
        TimeOff timeOff = new TimeOff();
        timeOff.setEmployee(employee);
        timeOff.setStartsAt(startsAt);
        timeOff.setEndsAt(endsAt);
        timeOff.setReason(request.reason());

        return toResponse(timeOffRepository.save(timeOff));
    }

    @Transactional(readOnly = true)
    public List<TimeOffResponse> list(Long employeeId) {
        employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found: " + employeeId));

        // Καθαρό derived query — sorting στη βάση, όχι EPOCH/3650-days hack.
        return timeOffRepository.findByEmployeeIdOrderByStartsAtAsc(employeeId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void delete(Long employeeId, Long timeOffId) {
        TimeOff timeOff = timeOffRepository.findById(timeOffId)
                .orElseThrow(() -> new IllegalArgumentException("Time off not found: " + timeOffId));

        // Ownership check: η άδεια ανήκει στον σωστό υπάλληλο; (URL consistency, όχι IDOR εδώ
        // αφού είναι admin-only, αλλά αποτρέπει λάθος nested-path χρήση).
        if (!timeOff.getEmployee().getId().equals(employeeId)) {
            throw new IllegalArgumentException(
                    "Time off " + timeOffId + " does not belong to employee " + employeeId);
        }

        timeOffRepository.delete(timeOff);   // hard delete — άδεια δεν έχει ιστορική αξία
    }

    private TimeOffResponse toResponse(TimeOff timeOff) {
        return new TimeOffResponse(
                timeOff.getId(),
                timeOff.getStartsAt(),
                timeOff.getEndsAt(),
                timeOff.getReason()
        );
    }
}