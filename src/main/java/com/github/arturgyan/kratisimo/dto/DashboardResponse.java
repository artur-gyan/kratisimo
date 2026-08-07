package com.github.arturgyan.kratisimo.dto;

import com.github.arturgyan.kratisimo.enums.AppointmentStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record DashboardResponse(
        LocalDate from,
        LocalDate to,
        BigDecimal totalRevenue,
        List<PopularService> popularServices,
        List<EmployeeStat> employeeStats,
        Map<AppointmentStatus, Long> appointmentsByStatus
) {
    public record PopularService(
            Long serviceId,
            String serviceName,
            long timesBooked,
            BigDecimal revenue
    ) {}

    public record EmployeeStat(
            Long employeeProfileId,
            String employeeName,
            long appointmentCount,
            BigDecimal revenue
    ) {}
}