package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.Interval;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.entity.WorkingHours;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
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
    private final AppointmentRepository appointmentRepository;
    private final TimeOffRepository timeOffRepository;
    private final SettingsProvider settingsProvider;

    public AvailabilityService(WorkingHoursRepository workingHoursRepository,
                               AppointmentRepository appointmentRepository,
                               TimeOffRepository timeOffRepository,
                               SettingsProvider settingsProvider) {
        this.workingHoursRepository = workingHoursRepository;
        this.appointmentRepository = appointmentRepository;
        this.timeOffRepository = timeOffRepository;
        this.settingsProvider = settingsProvider;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ΔΗΜΟΣΙΟ API
    // ═══════════════════════════════════════════════════════════════════

    public List<Instant> findAvailableSlotsRaw(Long employeeId, LocalDate date,
                                               int rawDurationMinutes) {
        int granularity = settingsProvider.get().getSlotGranularityMinutes();

        int effectiveDuration =
                ((rawDurationMinutes + granularity - 1) / granularity) * granularity;

        return findAvailableSlots(employeeId, date, effectiveDuration);
    }

    public List<Instant> findAvailableSlots(Long employeeId, LocalDate date,
                                            int effectiveDurationMinutes) {
        BusinessSettings settings = settingsProvider.get();
        ZoneId zone = ZoneId.of(settings.getTimezone());
        int granularity = settings.getSlotGranularityMinutes();
        int leadTime = settings.getBookingLeadTimeMinutes();

        List<Interval> free = freeIntervals(employeeId, date, zone);

        List<Instant> candidateStarts = free.stream()
                .flatMap(interval -> {
                    List<Instant> starts = generateStarts(interval, granularity, zone);
                    return filterByCapacity(starts, interval, effectiveDurationMinutes).stream();
                })
                .toList();

        return filterPast(candidateStarts, leadTime);
    }

    public void validateWithinWorkingHours(Long employeeId, Instant startsAt, Instant endsAt) {
        ZoneId zone = settingsProvider.getZone();

        if (!hasShiftOnDay(employeeId, startsAt, zone)) {
            throw new IllegalArgumentException(
                    "The employee does not work on the selected day");
        }
        if (!isWithinWorkingHours(employeeId, startsAt, endsAt, zone)) {
            throw new IllegalArgumentException(
                    "The selected time is outside the employee's working hours");
        }
    }

    public boolean isWithinWorkingHours(Long employeeId, Instant startsAt,
                                        Instant endsAt, ZoneId zone) {
        ZonedDateTime localStart = startsAt.atZone(zone);
        DayOfWeek day = localStart.getDayOfWeek();
        LocalDate date = localStart.toLocalDate();

        List<WorkingHours> shifts =
                workingHoursRepository.findByEmployeeIdAndDayOfWeek(employeeId, day);

        return shifts.stream().anyMatch(shift -> {
            Instant shiftStart = toInstant(date, shift.getStartTime(), zone);
            Instant shiftEnd = toInstant(date, shift.getEndTime(), zone);
            return !startsAt.isBefore(shiftStart) && !endsAt.isAfter(shiftEnd);
        });
    }

    private boolean hasShiftOnDay(Long employeeId, Instant startsAt, ZoneId zone) {
        DayOfWeek day = startsAt.atZone(zone).getDayOfWeek();
        return !workingHoursRepository.findByEmployeeIdAndDayOfWeek(employeeId, day).isEmpty();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ΣΤΑΔΙΑ 1-3: free = working − busy
    // ═══════════════════════════════════════════════════════════════════

    List<Interval> freeIntervals(Long employeeId, LocalDate date, ZoneId zone) {
        List<Interval> working = workingIntervals(employeeId, date, zone);
        List<Interval> busy = busyIntervals(employeeId, date, zone);

        return working.stream()
                .flatMap(w -> subtractBusy(w, busy).stream())
                .toList();
    }

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

    private List<Interval> subtractBusy(Interval working, List<Interval> busyList) {
        List<Interval> free = new ArrayList<>();
        Instant cursor = working.start();

        List<Interval> sortedBusy = busyList.stream()
                .sorted(Comparator.comparing(Interval::start))
                .toList();

        for (Interval busy : sortedBusy) {
            if (!busy.end().isAfter(cursor)) {
                continue;
            }
            if (!busy.start().isBefore(working.end())) {
                break;
            }
            if (busy.start().isAfter(cursor)) {
                free.add(new Interval(cursor, busy.start()));
            }
            if (busy.end().isAfter(cursor)) {
                cursor = busy.end();
            }
        }

        if (cursor.isBefore(working.end())) {
            free.add(new Interval(cursor, working.end()));
        }

        return free;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ΣΤΑΔΙΑ 4-6: slot generation & φιλτραρίσματα
    // ═══════════════════════════════════════════════════════════════════

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

    private List<Instant> filterByCapacity(List<Instant> starts, Interval free,
                                           int effectiveDurationMinutes) {
        Duration duration = Duration.ofMinutes(effectiveDurationMinutes);

        return starts.stream()
                .filter(start -> !start.plus(duration).isAfter(free.end()))
                .toList();
    }

    private List<Instant> filterPast(List<Instant> starts, int leadTimeMinutes) {
        Instant earliest = Instant.now().plus(Duration.ofMinutes(leadTimeMinutes));

        return starts.stream()
                .filter(start -> !start.isBefore(earliest))
                .toList();
    }

    // ═══════════════════════════════════════════════════════════════════
    //  ΒΟΗΘΗΤΙΚΕΣ
    // ═══════════════════════════════════════════════════════════════════

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

    private Instant toInstant(LocalDate date, LocalTime time, ZoneId zone) {
        return date.atTime(time).atZone(zone).toInstant();
    }

    private Interval dayRange(LocalDate date, ZoneId zone) {
        Instant dayStart = date.atStartOfDay(zone).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(zone).toInstant();
        return new Interval(dayStart, dayEnd);
    }
}