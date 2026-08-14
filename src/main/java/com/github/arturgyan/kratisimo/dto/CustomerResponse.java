package com.github.arturgyan.kratisimo.dto;

/**
 * Ελάχιστο DTO για το admin customer-search dropdown (D141).
 * phone: για disambiguation (10 «Μαρίες» → το τηλέφωνο τις ξεχωρίζει).
 * ΟΧΙ email, ΟΧΙ roles/active — ο admin επιλέγει πελάτη, δεν τον διαχειρίζεται.
 */
public record CustomerResponse(
        Long id,
        String fullName,
        String phone
) {}