package com.github.arturgyan.kratisimo.dto;

import java.time.Instant;
import java.util.List;

/**
 * Immutable snapshot ακύρωσης ραντεβού (D105 μοτίβο).
 * Flat strings μόνο — ο listener τρέχει async μετά το commit, session κλειστό.
 */
public record AppointmentCancelledEvent(
        String customerEmail,
        String customerName,
        String employeeName,
        Instant startsAt,
        List<String> serviceNames
) {}