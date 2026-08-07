package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SettingsRequest(

        @NotBlank(message = "Business name is required")
        String name,

        String address,   // προαιρετικό
        String phone,     // προαιρετικό

        @NotNull(message = "Slot granularity is required")
        @Min(value = 1, message = "Slot granularity must be positive")
        Integer slotGranularityMinutes,

        @NotNull(message = "Booking lead time is required")
        @Min(value = 0, message = "Booking lead time cannot be negative")
        Integer bookingLeadTimeMinutes
) {}