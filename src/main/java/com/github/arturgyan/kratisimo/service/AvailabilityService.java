package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.Interval;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.entity.WorkingHours;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
import com.github.arturgyan.kratisimo.repository.BusinessSettingsRepository;
import com.github.arturgyan.kratisimo.repository.TimeOffRepository;
import com.github.arturgyan.kratisimo.repository.WorkingHoursRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Service
public class AvailabilityService {

    private final WorkingHoursRepository workingHoursRepository;
    private final BusinessSettingsRepository businessSettingsRepository;
    private final AppointmentRepository appointmentRepository;
    private final TimeOffRepository timeOffRepository;

    public AvailabilityService(WorkingHoursRepository workingHoursRepository,
                               BusinessSettingsRepository businessSettingsRepository,
                               AppointmentRepository appointmentRepository,
                               TimeOffRepository timeOffRepository) {
        this.workingHoursRepository = workingHoursRepository;
        this.businessSettingsRepository = businessSettingsRepository;
        this.appointmentRepository = appointmentRepository;
        this.timeOffRepository = timeOffRepository;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ΔΗΜΟΣΙΟ API
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Όλα τα διαθέσιμα start times ενός υπαλλήλου για μια μέρα, δεδομένης της
     * effective διάρκειας. Ενώνει τα 6 στάδια του engine.
     *
     * Το BusinessSettings φορτώνεται ΜΙΑ φορά εδώ· το zone περνιέται ως
     * παράμετρος στα στάδια που το χρειάζονται — καμία επανάληψη query.
     *
     * Η effectiveDuration υπολογίζεται ΕΞΩ (booking service, ceiling D16).
     */
    public List<Instant> findAvailableSlots(Long employeeId, LocalDate date,
                                            int effectiveDurationMinutes) {
        BusinessSettings settings = loadSettings();
        ZoneId zone = ZoneId.of(settings.getTimezone());
        int granularity = settings.getSlotGranularityMinutes();
        int leadTime = settings.getBookingLeadTimeMinutes();

        List<Interval> free = freeIntervals(employeeId, date, zone);   // Στάδια 1-3

        List<Instant> candidateStarts = free.stream()
                .flatMap(interval -> {
                    List<Instant> starts = generateStarts(interval, granularity, zone);
                    return filterByCapacity(starts, interval, effectiveDurationMinutes).stream();
                })
                .toList();

        return filterPast(candidateStarts, leadTime);   // Στάδιο 6
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ΣΤΑΔΙΑ 1-3: free = working − busy
    // ═══════════════════════════════════════════════════════════════════

    /**
     * ΣΤΑΔΙΑ 1-3 μαζί: free intervals = working − busy, ανά βάρδια.
     */
    List<Interval> freeIntervals(Long employeeId, LocalDate date, ZoneId zone) {
        List<Interval> working = workingIntervals(employeeId, date, zone);
        List<Interval> busy = busyIntervals(employeeId, date, zone);

        return working.stream()
                .flatMap(w -> subtractBusy(w, busy).stream())
                .toList();
    }

    /**
     * ΣΤΑΔΙΟ 1: working intervals της μέρας (βάρδιες D34), LocalTime → Instant (D35).
     */
    List<Interval> workingIntervals(Long employeeId, LocalDate date, ZoneId zone) {
        DayOfWeek day = date.getDayOfWeek();

        List<WorkingHours> shifts =
                workingHoursRepository.findByEmployeeIdAndDayOfWeek(employeeId, day);

        return shifts.stream()
                .map(wh -> new Interval(
                        toInstant(date, wh.getStartTime(), zone),
                        toInstant(date, wh.getEndTime(), zone)))
                .toList();
    }

    /**
     * ΣΤΑΔΙΟ 2: busy intervals = Appointments (που blocksTime, D50) ∪ TimeOff,
     * ισοπεδωμένα σε μία λίστα Interval.
     */
    List<Interval> busyIntervals(Long employeeId, LocalDate date, ZoneId zone) {
        Interval dayRange = dayRange(date, zone);

        List<AppointmentStatus> blocking = Arrays.stream(AppointmentStatus.values())
                .filter(AppointmentStatus::blocksTime)
                .toList();

        List<Interval> fromAppointments = appointmentRepository
                .findOverlapping(employeeId, dayRange.start(), dayRange.end(), blocking)
                .stream()
                .map(a -> new Interval(a.getStartsAt(), a.getEndsAt()))
                .toList();

        List<Interval> fromTimeOff = timeOffRepository
                .findOverlapping(employeeId, dayRange.start(), dayRange.end())
                .stream()
                .map(t -> new Interval(t.getStartsAt(), t.getEndsAt()))
                .toList();

        return Stream.concat(fromAppointments.stream(), fromTimeOff.stream())
                .toList();
    }

    /**
     * ΣΤΑΔΙΟ 3: αφαιρεί όλα τα busy από ΕΝΑ working interval (cursor scan).
     * Επιστρέφει τα free κομμάτια (0, 1 ή περισσότερα).
     */
    private List<Interval> subtractBusy(Interval working, List<Interval> busyList) {
        List<Interval> free = new ArrayList<>();
        Instant cursor = working.start();

        List<Interval> sortedBusy = busyList.stream()
                .sorted(Comparator.comparing(Interval::start))
                .toList();

        for (Interval busy : sortedBusy) {
            if (!busy.end().isAfter(cursor)) {
                continue;   // busy ήδη πίσω από τον cursor
            }
            if (!busy.start().isBefore(working.end())) {
                break;      // busy πέρα από το working — τέλος
            }
            if (busy.start().isAfter(cursor)) {
                free.add(new Interval(cursor, busy.start()));   // κενό πριν το busy
            }
            if (busy.end().isAfter(cursor)) {
                cursor = busy.end();   // προχώρα μπροστά
            }
        }

        if (cursor.isBefore(working.end())) {
            free.add(new Interval(cursor, working.end()));   // ουρά
        }

        return free;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ΣΤΑΔΙΑ 4-6: slot generation & φιλτραρίσματα
    // ═══════════════════════════════════════════════════════════════════

    /**
     * ΣΤΑΔΙΟ 4: candidate starts μέσα σε ΕΝΑ free interval, ανά granularity,
     * με πρώτο start στρογγυλεμένο ΠΑΝΩ στο πλέγμα (D15).
     */
    private List<Instant> generateStarts(Interval free, int granularityMinutes, ZoneId zone) {
        List<Instant> starts = new ArrayList<>();
        Duration step = Duration.ofMinutes(granularityMinutes);

        Instant cursor = ceilToGranularity(free.start(), granularityMinutes, zone);

        while (!cursor.isAfter(free.end())) {
            starts.add(cursor);
            cursor = cursor.plus(step);
        }

        return starts;
    }

    /**
     * ΣΤΑΔΙΟ 5: κρατά μόνο starts όπου η υπηρεσία χωράει ολόκληρη μέσα στο
     * free interval — start + effectiveDuration ≤ free.end() (Παγίδα Β).
     */
    private List<Instant> filterByCapacity(List<Instant> starts, Interval free,
                                           int effectiveDurationMinutes) {
        Duration duration = Duration.ofMinutes(effectiveDurationMinutes);

        return starts.stream()
                .filter(start -> !start.plus(duration).isAfter(free.end()))
                .toList();
    }

    /**
     * ΣΤΑΔΙΟ 6: πετά starts πιο κοντά από bookingLeadTimeMinutes στο «τώρα» (D40).
     */
    private List<Instant> filterPast(List<Instant> starts, int leadTimeMinutes) {
        Instant earliest = Instant.now().plus(Duration.ofMinutes(leadTimeMinutes));

        return starts.stream()
                .filter(start -> !start.isBefore(earliest))
                .toList();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ΒΟΗΘΗΤΙΚΕΣ
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Στρογγυλοποιεί ΠΑΝΩ στο επόμενο πολλαπλάσιο του granularity, σε ΤΟΠΙΚΗ
     * ώρα (το πλέγμα είναι τοπική επιχειρησιακή έννοια, όχι UTC).
     */
    private Instant ceilToGranularity(Instant instant, int granularityMinutes, ZoneId zone) {
        ZonedDateTime zdt = instant.atZone(zone);

        int remainder = zdt.getMinute() % granularityMinutes;
        if (remainder == 0 && zdt.getSecond() == 0 && zdt.getNano() == 0) {
            return instant;
        }

        return zdt.plusMinutes(granularityMinutes - remainder)
                .withSecond(0)
                .withNano(0)
                .toInstant();
    }

    /**
     * Γέφυρα LocalTime → Instant μέσω ζώνης (D35). Η ζώνη χειρίζεται DST.
     */
    private Instant toInstant(LocalDate date, LocalTime time, ZoneId zone) {
        return date.atTime(time).atZone(zone).toInstant();
    }

    /**
     * Μια τοπική μέρα ως διάστημα Instant [00:00, 24:00) της ζώνης.
     */
    private Interval dayRange(LocalDate date, ZoneId zone) {
        Instant dayStart = date.atStartOfDay(zone).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(zone).toInstant();
        return new Interval(dayStart, dayEnd);
    }

    /**
     * Φορτώνει το BusinessSettings singleton (D39) — ΜΙΑ κλήση ανά
     * findAvailableSlots. Το zone/granularity/leadTime βγαίνουν από εδώ.
     */
    private BusinessSettings loadSettings() {
        return businessSettingsRepository.findById(BusinessSettings.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "BusinessSettings singleton δεν βρέθηκε — το setup δεν έχει τρέξει;"));
    }
}