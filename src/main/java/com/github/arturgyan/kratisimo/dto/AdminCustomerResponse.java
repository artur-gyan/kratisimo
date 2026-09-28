package com.github.arturgyan.kratisimo.dto;

/**
 * Πλήρες DTO για τη σελίδα διαχείρισης πελατών (admin).
 * Διαφορά από CustomerResponse (D141, minimal για dropdown): +email +active +loyalty.
 * email ορατό (authenticated admin, όχι public leak)· active για ban/toggle.
 *
 * loyalty: ΟΛΟΚΛΗΡΟ το LoyaltyResponse (reuse — ίδια δομή που βλέπει ο πελάτης
 * στο /api/loyalty/me). enabled=false → το frontend δεν δείχνει τίποτα.
 */
public record AdminCustomerResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        boolean active,
        LoyaltyResponse loyalty   // ΝΕΟ (2e)
) {}