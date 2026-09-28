package com.github.arturgyan.kratisimo.dto;

import java.util.List;

/**
 * Βαθμολογία ΟΛΟΥ του μαγαζιού + πρόσφατες κριτικές. Public.
 * Ίδια λογική με EmployeeRatingResponse, αλλά για το σύνολο.
 * averageRating: null αν 0 reviews (D110 — όχι 0).
 * recentReviews: public-safe ReviewResponse (χωρίς customerName, D109).
 */
public record ShopRatingResponse(
        Double averageRating,
        long reviewCount,
        List<ReviewResponse> recentReviews
) {}