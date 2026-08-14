package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.AdminAppointmentResponse;
import com.github.arturgyan.kratisimo.entity.Appointment;
import com.github.arturgyan.kratisimo.entity.AppointmentItem;
import com.github.arturgyan.kratisimo.entity.EmployeeProfile;
import com.github.arturgyan.kratisimo.exception.ForbiddenException;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
import com.github.arturgyan.kratisimo.repository.EmployeeProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Read-only πρόγραμμα υπαλλήλου. Ο υπάλληλος βλέπει ΜΟΝΟ τα δικά του ραντεβού,
 * καμία τροποποίηση (D148 actions ανήκουν στον admin/receptionist).
 *
 * Ownership: το employeeProfile βγαίνει από τον LOGGED-IN user (token, D52),
 * ΠΟΤΕ από param → αδύνατο να δει άλλου υπαλλήλου το πρόγραμμα.
 */
@Service
public class EmployeeAppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final EmployeeProfileRepository employeeProfileRepository;
    private final SettingsProvider settingsProvider;

    public EmployeeAppointmentService(AppointmentRepository appointmentRepository,
                                      EmployeeProfileRepository employeeProfileRepository,
                                      SettingsProvider settingsProvider) {
        this.appointmentRepository = appointmentRepository;
        this.employeeProfileRepository = employeeProfileRepository;
        this.settingsProvider = settingsProvider;
    }

    @Transactional(readOnly = true)
    public List<AdminAppointmentResponse> getMyAppointments(Long userId, LocalDate from, LocalDate to) {

        // userId (token) → employeeProfile. Αν δεν υπάρχει profile → 403.
        EmployeeProfile profile = employeeProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new ForbiddenException(
                        "You are not registered as an employee"));

        ZoneId zone = settingsProvider.getZone();
        Instant fromInstant = from.atStartOfDay(zone).toInstant();
        Instant toInstant = to.plusDays(1).atStartOfDay(zone).toInstant();

        return appointmentRepository
                .findByEmployeeInRange(profile.getId(), fromInstant, toInstant).stream()
                .map(this::toResponse)
                .toList();
    }

    private AdminAppointmentResponse toResponse(Appointment a) {
        List<String> serviceNames = a.getItems().stream()
                .map(AppointmentItem::getService)
                .map(s -> s.getName())
                .toList();

        String customerName = (a.getCustomer() != null)
                ? a.getCustomer().getFullName()
                : a.getGuestName();

        return new AdminAppointmentResponse(
                a.getId(),
                a.getEmployee().getId(),
                customerName,
                a.getEmployee().getUser().getFullName(),
                a.getStartsAt(),
                a.getEndsAt(),
                a.getStatus(),
                a.getTotalPrice(),
                a.getTotalDurationMinutes(),
                serviceNames
        );
    }
}