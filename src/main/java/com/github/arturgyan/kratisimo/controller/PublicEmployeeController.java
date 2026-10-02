package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.PublicEmployeeResponse;
import com.github.arturgyan.kratisimo.security.CustomUserDetails;
import com.github.arturgyan.kratisimo.service.PublicEmployeeService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class PublicEmployeeController {

    private final PublicEmployeeService publicEmployeeService;

    public PublicEmployeeController(PublicEmployeeService publicEmployeeService) {
        this.publicEmployeeService = publicEmployeeService;
    }

    /**
     * GET /api/employees/available?serviceIds=1,2,3
     * Public: βήμα 2 της κράτησης (D51). Υπάλληλοι που κάνουν ΟΛΕΣ τις υπηρεσίες.
     *
     * Public endpoint ΑΛΛΑ «ξέρει» ποιος ρωτάει, αν στείλει token:
     * το JwtAuthenticationFilter τρέχει σε ΚΑΘΕ request και, αν υπάρχει έγκυρο token,
     * γεμίζει το SecurityContext (το permitAll σημαίνει «δεν απαιτείται», όχι «αγνοείται»).
     * - συνδεδεμένος → principal = CustomUserDetails → εξαιρείται ο εαυτός του (D155)
     * - ανώνυμος     → principal = null (ο anonymous principal δεν είναι CustomUserDetails)
     * Ο userId έρχεται από το token, ΠΟΤΕ από παράμετρο (D52).
     */
    @GetMapping("/api/employees/available")
    public List<PublicEmployeeResponse> getAvailableEmployees(
            @RequestParam List<Long> serviceIds,
            @AuthenticationPrincipal CustomUserDetails principal) {
        Long excludeUserId = (principal != null) ? principal.getUser().getId() : null;
        return publicEmployeeService.findAvailableForServices(serviceIds, excludeUserId);
    }

    /**
     * GET /api/employees — ΝΕΟ.
     * Public: σελίδα "Η ομάδα μας" + landing. Όλοι οι ενεργοί + bio + βαθμολογία.
     * Ίδιος controller με το /available: ίδιο επίπεδο πρόσβασης (D119).
     */
    @GetMapping("/api/employees")
    public List<PublicEmployeeResponse> getAllActiveEmployees() {
        return publicEmployeeService.findAllActive();
    }
}