package com.github.arturgyan.kratisimo.dto;

import java.util.List;

/**
 * "Ανά υπάλληλο + μέσος όρος". Public. averageRating = AVG στη βάση (D100 αρχή),
 * null αν δεν υπάρχουν reviews. reviews = public-safe (χωρίς customerName).
 */
public record EmployeeRatingResponse(
        Long employeeId,
        String employeeName,
        Double averageRating,
        long reviewCount,
        List<ReviewResponse> reviews
) {}