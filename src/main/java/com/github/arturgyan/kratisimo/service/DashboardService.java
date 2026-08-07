package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.DashboardResponse;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.repository.BusinessSettingsRepository;
import com.github.arturgyan.kratisimo.repository.DashboardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final BusinessSettingsRepository businessSettingsRepository;

    public DashboardService(DashboardRepository dashboardRepository,
                            BusinessSettingsRepository businessSettingsRepository) {
        this.dashboardRepository = dashboardRepository;
        this.businessSettingsRepository = businessSettingsRepository;
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(LocalDate from, LocalDate to) {

        // 1. Default εύρος αν λείπουν: τελευταίες 30 μέρες
        LocalDate effectiveTo = (to != null) ? to : LocalDate.now();
        LocalDate effectiveFrom = (from != null) ? from : effectiveTo.minusDays(30);

        // 2. Validation: from δεν μπορεί να είναι μετά το to
        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new IllegalArgumentException("'from' date cannot be after 'to' date");
        }

        // 3. Γέφυρα LocalDate → Instant μέσω business timezone (D35)
        ZoneId zone = loadZone();
        Instant fromInstant = effectiveFrom.atStartOfDay(zone).toInstant();
        // half-open [from, to): +1 μέρα ώστε να ΣΥΜΠΕΡΙΛΑΒΟΥΜΕ ολόκληρη την ημέρα 'to' (D63)
        Instant toInstant = effectiveTo.plusDays(1).atStartOfDay(zone).toInstant();

        AppointmentStatus completed = AppointmentStatus.COMPLETED;

        // 4. Τρέξε τα 4 queries
        var totalRevenue = dashboardRepository.totalRevenue(completed, fromInstant, toInstant);

        var popularServices = dashboardRepository
                .popularServices(completed, fromInstant, toInstant)
                .stream()
                .map(p -> new DashboardResponse.PopularService(
                        p.getServiceId(),
                        p.getServiceName(),
                        p.getTimesBooked(),
                        p.getRevenue()))
                .toList();

        var employeeStats = dashboardRepository
                .employeeStats(completed, fromInstant, toInstant)
                .stream()
                .map(e -> new DashboardResponse.EmployeeStat(
                        e.getEmployeeProfileId(),
                        e.getEmployeeName(),
                        e.getAppointmentCount(),
                        e.getRevenue()))
                .toList();

        // byStatus: projection list → Map. EnumMap = ταξινομημένο κατά enum order, αποδοτικό
        Map<AppointmentStatus, Long> byStatus = new EnumMap<>(AppointmentStatus.class);
        for (var row : dashboardRepository.appointmentsByStatus(fromInstant, toInstant)) {
            byStatus.put(row.getStatus(), row.getCount());
        }

        // 5. Σύνθεσε το response (γυρνάμε τα ΑΡΧΙΚΑ LocalDate, όχι τα Instant)
        return new DashboardResponse(
                effectiveFrom,
                effectiveTo,
                totalRevenue,
                popularServices,
                employeeStats,
                byStatus
        );
    }

    // Φόρτωσε το timezone του μαγαζιού (ίδια πηγή με το Availability Engine, D35)
    private ZoneId loadZone() {
        BusinessSettings settings = businessSettingsRepository
                .findById(BusinessSettings.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("Business settings not found"));
        return ZoneId.of(settings.getTimezone());
    }
}