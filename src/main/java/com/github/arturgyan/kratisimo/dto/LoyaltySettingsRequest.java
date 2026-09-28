package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * PUT /api/admin/settings/loyalty — ρυθμίσεις προγράμματος επιβράβευσης.
 *
 * Wrapper τύποι (Boolean/Integer) + @NotNull, ΟΧΙ primitives:
 * αν λείπει το πεδίο από το JSON, ένα primitive θα γινόταν σιωπηλά false/0
 * (λάθος τιμή χωρίς σφάλμα). Με wrapper → null → @NotNull → καθαρό 400.
 * (Στο entity το ανάποδο — primitive, γιατί η βάση είναι NOT NULL, D36.)
 *
 * Τα όρια εδώ είναι απλοί range checks → annotations (D32).
 * Η βάση έχει τους ΙΔΙΟΥΣ κανόνες ως CHECK (V7) — τελευταίο δίχτυ (D45).
 */
public record LoyaltySettingsRequest(

        @NotNull(message = "Enabled flag is required")
        Boolean enabled,

        @NotNull(message = "Visits required is required")
        @Min(value = 2, message = "Visits required must be at least 2")
        Integer visitsRequired,

        @NotNull(message = "Discount percent is required")
        @Min(value = 1, message = "Discount percent must be between 1 and 100")
        @Max(value = 100, message = "Discount percent must be between 1 and 100")
        Integer discountPercent
) {}