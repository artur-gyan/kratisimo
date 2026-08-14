package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.DashboardResponse;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.repository.DashboardRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.EnumMap;
import java.util.Map;

@Service
public class DashboardService {

    private final DashboardRepository dashboardRepository;
    private final SettingsProvider settingsProvider;

    public DashboardService(DashboardRepository dashboardRepository,
                            SettingsProvider settingsProvider) {
        this.dashboardRepository = dashboardRepository;
        this.settingsProvider = settingsProvider;
    }

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard(LocalDate from, LocalDate to) {

        LocalDate effectiveTo = (to != null) ? to : LocalDate.now();
        LocalDate effectiveFrom = (from != null) ? from : effectiveTo.minusDays(30);

        if (effectiveFrom.isAfter(effectiveTo)) {
            throw new IllegalArgumentException("'from' date cannot be after 'to' date");
        }

        ZoneId zone = settingsProvider.getZone();
        Instant fromInstant = effectiveFrom.atStartOfDay(zone).toInstant();
        Instant toInstant = effectiveTo.plusDays(1).atStartOfDay(zone).toInstant();

        AppointmentStatus completed = AppointmentStatus.COMPLETED;

        var totalRevenue = dashboardRepository.totalRevenue(completed, fromInstant, toInstant);

        var popularServices = dashboardRepository
                .popularServices(completed, fromInstant, toInstant)
                .stream()
                .map(p -> new DashboardResponse.PopularService(
                        p.getServiceId(),
                        p.getServiceName(),
                        p.getUnitPrice(),
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

        Map<AppointmentStatus, Long> byStatus = new EnumMap<>(AppointmentStatus.class);
        for (var row : dashboardRepository.appointmentsByStatus(fromInstant, toInstant)) {
            byStatus.put(row.getStatus(), row.getCount());
        }

        return new DashboardResponse(
                effectiveFrom,
                effectiveTo,
                totalRevenue,
                popularServices,
                employeeStats,
                byStatus
        );
    }
}