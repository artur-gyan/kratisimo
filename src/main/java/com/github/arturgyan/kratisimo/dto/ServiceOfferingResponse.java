package com.github.arturgyan.kratisimo.dto;

import com.github.arturgyan.kratisimo.enums.TargetAudience;

import java.math.BigDecimal;

public record ServiceOfferingResponse(
        Long id,
        String name,
        String description,
        int durationMinutes,
        BigDecimal price,
        TargetAudience targetAudience,
        boolean active,
        Long categoryId,
        String categoryName   // flattened — το frontend δεν χρειάζεται 2ο request για το όνομα
) {}