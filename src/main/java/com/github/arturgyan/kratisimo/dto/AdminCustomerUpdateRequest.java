package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Update πελάτη από admin. ΜΟΝΟ fullName + phone.
 * ΟΧΙ email (login credential — read-only), ΟΧΙ password/roles/active
 * (active = ξεχωριστό endpoint, D131 μοτίβο: server-managed πεδίο εκτός update DTO).
 */
public record AdminCustomerUpdateRequest(
        @NotBlank String fullName,
        String phone
) {}