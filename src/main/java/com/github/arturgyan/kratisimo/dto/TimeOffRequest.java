package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record TimeOffRequest(

        @NotNull(message = "Start date is required")
        LocalDate startDate,

        @NotNull(message = "End date is required")
        LocalDate endDate,

        @Size(max = 200, message = "Reason must not exceed 200 characters")
        String reason  // Optional — αλλά αν δοθεί, ≤200 χαρ (ταιριάζει με @Column length=200)

) {}