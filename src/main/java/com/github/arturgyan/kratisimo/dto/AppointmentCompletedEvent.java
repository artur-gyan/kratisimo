package com.github.arturgyan.kratisimo.dto;

import java.time.Instant;
import java.util.List;

/**
 * Immutable snapshot ολοκλήρωσης ραντεβού (D105 μοτίβο).
 * Το completion email περιέχει link προς τη σελίδα "Ραντεβού μου" για αξιολόγηση.
 */
public record AppointmentCompletedEvent(
        String customerEmail,
        String customerName,
        String employeeName,
        Instant startsAt,
        List<String> serviceNames
) {}