package com.github.arturgyan.kratisimo.dto;

import com.github.arturgyan.kratisimo.enums.BusinessType;

public record SettingsResponse(
        String name,
        String address,
        String phone,
        String email,
        String timezone,
        BusinessType businessType,
        int slotGranularityMinutes,
        int bookingLeadTimeMinutes,
        boolean setupCompleted
) {}