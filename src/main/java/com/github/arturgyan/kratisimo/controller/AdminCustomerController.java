package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.AdminAppointmentResponse;
import com.github.arturgyan.kratisimo.dto.AdminCustomerResponse;
import com.github.arturgyan.kratisimo.dto.AdminCustomerUpdateRequest;
import com.github.arturgyan.kratisimo.dto.CustomerResponse;
import com.github.arturgyan.kratisimo.dto.LoyaltyResponse;
import com.github.arturgyan.kratisimo.repository.UserRepository;
import com.github.arturgyan.kratisimo.service.AdminCustomerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/customers")
public class AdminCustomerController {

    private static final int MIN_QUERY_LENGTH = 3;

    private final UserRepository userRepository;
    private final AdminCustomerService adminCustomerService;

    public AdminCustomerController(UserRepository userRepository,
                                   AdminCustomerService adminCustomerService) {
        this.userRepository = userRepository;
        this.adminCustomerService = adminCustomerService;
    }

    // ── ΥΠΑΡΧΟΝ (D141): search για το booking dropdown. ΑΜΕΤΑΒΛΗΤΟ. ──
    // GET /api/admin/customers?q=κωσ  → minimal CustomerResponse (id/name/phone)
    @GetMapping
    public List<CustomerResponse> searchCustomers(@RequestParam(required = false) String q) {
        if (q == null || q.trim().length() < MIN_QUERY_LENGTH) {
            return List.of();
        }
        String pattern = "%" + q.trim() + "%";
        return userRepository.searchCustomers(pattern).stream()
                .map(u -> new CustomerResponse(u.getId(), u.getFullName(), u.getPhone()))
                .toList();
    }

    // ── Πλήρης λίστα για τη σελίδα διαχείρισης (AdminCustomerResponse + loyalty). ──
    // GET /api/admin/customers/all
    @GetMapping("/all")
    public List<AdminCustomerResponse> getAll() {
        return adminCustomerService.getAllCustomers();
    }

    // ── Πλούσιο search (για τη σελίδα, με email/active/loyalty). ──
    // GET /api/admin/customers/manage?q=...
    @GetMapping("/manage")
    public List<AdminCustomerResponse> searchForManagement(
            @RequestParam(required = false) String q) {
        if (q == null || q.trim().length() < MIN_QUERY_LENGTH) {
            return List.of();
        }
        return adminCustomerService.search(q);
    }

    // ── Update στοιχείων (fullName + phone μόνο). ──
    @PutMapping("/{id}")
    public AdminCustomerResponse update(@PathVariable Long id,
                                        @Valid @RequestBody AdminCustomerUpdateRequest request) {
        return adminCustomerService.update(id, request);
    }

    // ── Ενεργοποίηση/απενεργοποίηση (active toggle, D131 μοτίβο). ──
    // @ResponseStatus(NO_CONTENT): επιτυχία ΧΩΡΙΣ body → 204.
    // Χωρίς αυτό, μια void μέθοδος δίνει 200 με ΚΕΝΟ body· ο client (api.js) βλέπει 200,
    // περιμένει JSON, το response.json() σκάει → «η αλλαγή απέτυχε» ενώ η βάση άλλαξε κανονικά.
    // Ίδια σύμβαση με όλα τα υπόλοιπα void endpoints (delete, cancel, status, reschedule).
    @PostMapping("/{id}/activate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void activate(@PathVariable Long id) {
        adminCustomerService.setActive(id, true);
    }

    @PostMapping("/{id}/deactivate")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivate(@PathVariable Long id) {
        adminCustomerService.setActive(id, false);
    }

    // ── Ιστορικό ραντεβού πελάτη. ──
    @GetMapping("/{id}/appointments")
    public List<AdminAppointmentResponse> getHistory(@PathVariable Long id) {
        return adminCustomerService.getCustomerHistory(id);
    }

    // ── ΝΕΟ (2e): πρόοδος επιβράβευσης ενός πελάτη («Νέο ραντεβού»). ──
    // GET /api/admin/customers/{id}/loyalty — ADMIN (μέσω /api/admin/**).
    @GetMapping("/{id}/loyalty")
    public LoyaltyResponse getLoyalty(@PathVariable Long id) {
        return adminCustomerService.getLoyalty(id);
    }
}