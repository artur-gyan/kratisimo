package com.github.arturgyan.kratisimo.dto;

import com.github.arturgyan.kratisimo.enums.AppointmentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record AdminAppointmentResponse(
        Long id,
        Long employeeId,          // employeeProfileId — για φιλτράρισμα ανά υπάλληλο
        String customerName,
        String employeeName,
        Instant startsAt,
        Instant endsAt,
        AppointmentStatus status,
        BigDecimal totalPrice,
        int totalDurationMinutes,
        List<String> serviceNames
) {}