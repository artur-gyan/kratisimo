package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.PublicEmployeeResponse;
import com.github.arturgyan.kratisimo.service.PublicEmployeeService;
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
     */
    @GetMapping("/api/employees/available")
    public List<PublicEmployeeResponse> getAvailableEmployees(
            @RequestParam List<Long> serviceIds) {
        return publicEmployeeService.findAvailableForServices(serviceIds);
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