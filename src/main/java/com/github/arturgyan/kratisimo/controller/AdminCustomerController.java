package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.AdminAppointmentResponse;
import com.github.arturgyan.kratisimo.dto.AdminCustomerResponse;
import com.github.arturgyan.kratisimo.dto.AdminCustomerUpdateRequest;
import com.github.arturgyan.kratisimo.dto.CustomerResponse;
import com.github.arturgyan.kratisimo.repository.UserRepository;
import com.github.arturgyan.kratisimo.service.AdminCustomerService;
import jakarta.validation.Valid;
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

    // ── ΝΕΟ: πλήρης λίστα για τη σελίδα διαχείρισης (AdminCustomerResponse). ──
    // GET /api/admin/customers/all
    @GetMapping("/all")
    public List<AdminCustomerResponse> getAll() {
        return adminCustomerService.getAllCustomers();
    }

    // ── ΝΕΟ: πλούσιο search (για τη σελίδα, με email/active). ──
    // GET /api/admin/customers/manage?q=...
    @GetMapping("/manage")
    public List<AdminCustomerResponse> searchForManagement(
            @RequestParam(required = false) String q) {
        if (q == null || q.trim().length() < MIN_QUERY_LENGTH) {
            return List.of();
        }
        return adminCustomerService.search(q);
    }

    // ── ΝΕΟ: update στοιχείων (fullName + phone μόνο). ──
    @PutMapping("/{id}")
    public AdminCustomerResponse update(@PathVariable Long id,
                                        @Valid @RequestBody AdminCustomerUpdateRequest request) {
        return adminCustomerService.update(id, request);
    }

    // ── ΝΕΟ: ενεργοποίηση/απενεργοποίηση (active toggle, D131 μοτίβο). ──
    @PostMapping("/{id}/activate")
    public void activate(@PathVariable Long id) {
        adminCustomerService.setActive(id, true);
    }

    @PostMapping("/{id}/deactivate")
    public void deactivate(@PathVariable Long id) {
        adminCustomerService.setActive(id, false);
    }

    // ── ΝΕΟ: ιστορικό ραντεβού πελάτη. ──
    @GetMapping("/{id}/appointments")
    public List<AdminAppointmentResponse> getHistory(@PathVariable Long id) {
        return adminCustomerService.getCustomerHistory(id);
    }
}