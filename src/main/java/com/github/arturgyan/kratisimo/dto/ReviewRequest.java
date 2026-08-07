package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Τι στέλνει ο customer για να αξιολογήσει.
 * ΔΕΝ περιέχει customerId (έρχεται από token, D52) ούτε createdAt (server-managed).
 * appointmentId: ΠΟΙΟ ραντεβού αξιολογεί — ο server επαληθεύει ιδιοκτησία + COMPLETED.
 */
public record ReviewRequest(
        @NotNull(message = "Appointment id is required")
        Long appointmentId,

        // Integer wrapper (όχι int) → το @NotNull διακρίνει "λείπει" από "0" (ίδια αρχή με D-DTO κανόνα).
        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be between 1 and 5")
        @Max(value = 5, message = "Rating must be between 1 and 5")
        Integer rating,

        // comment προαιρετικό (μπορεί μόνο rating). @Size αν δοθεί, αλιγνεσμένο στο DB length=1000.
        @Size(max = 1000, message = "Comment must not exceed 1000 characters")
        String comment
) {}