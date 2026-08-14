package com.github.arturgyan.kratisimo.dto;

/**
 * Πλήρες DTO για τη σελίδα διαχείρισης πελατών (admin).
 * Διαφορά από CustomerResponse (D141, minimal για dropdown): +email +active.
 * email ορατό (authenticated admin, όχι public leak)· active για ban/toggle.
 */
public record AdminCustomerResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        boolean active
) {}