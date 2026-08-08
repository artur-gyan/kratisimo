package com.github.arturgyan.kratisimo.dto;

import com.github.arturgyan.kratisimo.enums.TargetAudience;

import java.math.BigDecimal;

/**
 * Public-safe προβολή υπηρεσίας για τη ροή κράτησης (βήμα 1).
 *
 * Ίδιο με το admin ServiceOfferingResponse ΜΕΙΟΝ το 'active':
 * το public endpoint γυρνάει ΜΟΝΟ active υπηρεσίες, άρα το πεδίο θα ήταν
 * πάντα true → μηδέν πληροφορία + διαρροή του soft-delete concept (D20).
 * Ίδια αρχή D109: DTO ανά κοινό, μόνο τα πεδία που χρειάζεται αυτό το κοινό.
 *
 * Το 'id' ΜΕΝΕΙ: αόρατο στον χρήστη, αλλά απαραίτητο — το frontend το στέλνει
 * ως serviceIds στο booking POST. Αόρατο ≠ περιττό.
 */
public record PublicServiceResponse(
        Long id,
        String name,
        String description,
        int durationMinutes,
        BigDecimal price,
        TargetAudience targetAudience,
        Long categoryId,
        String categoryName
) {}