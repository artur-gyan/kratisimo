package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

/**
 * Reschedule ραντεβού (D145): νέα ώρα + προαιρετικά νέος υπάλληλος.
 *
 * ΔΕΝ αλλάζει υπηρεσίες/snapshots — μόνο ΠΟΤΕ και ΠΟΙΟΣ. Το endsAt
 * υπολογίζεται από το υπάρχον totalDurationMinutes (η διάρκεια δεν αλλάζει).
 *
 * employeeId nullable: null = κράτα τον ίδιο υπάλληλο (drag στο εβδομαδιαίο
 * αλλάζει μόνο ώρα/μέρα). Τιμή = μετακίνηση σε άλλον υπάλληλο (drag σε άλλη
 * στήλη στο ημερήσιο).
 */
public record RescheduleRequest(

        @NotNull(message = "New start time is required")
        Instant startsAt,

        Long employeeId

) {}