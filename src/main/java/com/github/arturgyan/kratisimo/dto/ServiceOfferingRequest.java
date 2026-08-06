package com.github.arturgyan.kratisimo.dto;

import com.github.arturgyan.kratisimo.enums.TargetAudience;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record ServiceOfferingRequest(

        @NotBlank(message = "Service name is required")
        String name,

        // description προαιρετικό — καμία annotation, null/empty επιτρεπτό
        String description,

        // Integer (wrapper), ΟΧΙ int — το χρειάζεται το @NotNull (δες σημείωση)
        @NotNull(message = "Duration is required")
        @Positive(message = "Duration must be a positive number of minutes")
        Integer durationMinutes,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.00", inclusive = false, message = "Price must be greater than 0")
        @Digits(integer = 6, fraction = 2, message = "Price must fit NUMERIC(8,2)")
        BigDecimal price,

        // Ο client στέλνει "MAN"/"WOMAN"/"UNISEX" ως string — ο Jackson το κάνει enum
        @NotNull(message = "Target audience is required")
        TargetAudience targetAudience,

        // Σκέτο FK id — ο client στέλνει αναφορά, ΟΧΙ nested αντικείμενο (D76)
        @NotNull(message = "Category is required")
        Long categoryId
) {}