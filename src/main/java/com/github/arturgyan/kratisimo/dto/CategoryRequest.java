package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

// Record = immutable DTO. Validation στο DTO, όχι στο entity (D32).
public record CategoryRequest(
        @NotBlank(message = "Category name is required")
        String name,

        // displayOrder μπορεί να είναι 0 (πρώτη θέση) → PositiveOrZero, όχι Positive.
        @PositiveOrZero(message = "Display order must be zero or positive")
        int displayOrder
) {}