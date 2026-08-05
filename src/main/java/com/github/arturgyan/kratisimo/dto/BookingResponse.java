package com.github.arturgyan.kratisimo.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Τι επιστρέφουμε μετά από επιτυχές booking.
 * ΟΧΙ το entity — DTO με ΜΟΝΟ τα πεδία που χρειάζεται ο client.
 * Καμία σχέση/lazy proxy, κανένα ευαίσθητο πεδίο.
 */
public record BookingResponse(
        Long appointmentId,
        String employeeName,       // resolved: appt.getEmployee().getUser().getFullName()
        Instant startsAt,
        Instant endsAt,            // ΥΠΟΛΟΓΙΣΜΕΝΟ server-side, το βλέπει ο client
        BigDecimal totalPrice,
        int totalDurationMinutes,
        String status,             // π.χ. "PENDING"
        List<String> serviceNames  // ονόματα των υπηρεσιών, όχι ids
) {}