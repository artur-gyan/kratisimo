package com.github.arturgyan.kratisimo.dto;

import java.time.Instant;

/**
 * Public-safe review view. ΧΩΡΙΣ customerName — χρησιμοποιείται στο δημόσιο
 * "ανά υπάλληλο" endpoint όπου η ταυτότητα πελάτη ΔΕΝ πρέπει να διαρρεύσει.
 * Flattened (D6): employeeName αντί για nested entity → κανένα 2ο request.
 */
public record ReviewResponse(
        Long id,
        int rating,
        String comment,
        Instant createdAt,
        Long appointmentId,
        String employeeName
) {}