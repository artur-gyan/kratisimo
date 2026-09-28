package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.LoyaltyResponse;
import com.github.arturgyan.kratisimo.security.CustomUserDetails;
import com.github.arturgyan.kratisimo.service.LoyaltyService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class LoyaltyController {

    private final LoyaltyService loyaltyService;

    public LoyaltyController(LoyaltyService loyaltyService) {
        this.loyaltyService = loyaltyService;
    }

    /**
     * GET /api/loyalty/me — η πρόοδος του συνδεδεμένου πελάτη.
     * customerId ΑΠΟ ΤΟ TOKEN (D52) — ποτέ από param. Αλλιώς οποιοσδήποτε
     * βλέπει την πρόοδο άλλου αλλάζοντας ένα νούμερο (IDOR).
     */
    @GetMapping("/api/loyalty/me")
    public LoyaltyResponse getMyLoyalty(@AuthenticationPrincipal CustomUserDetails principal) {
        return loyaltyService.getStatus(principal.getUser().getId());
    }
}