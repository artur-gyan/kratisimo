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
     *
     * Public (permitAll): ο ανώνυμος βλέπει υπαλλήλους στο βήμα 2 της
     * κράτησης, ΠΡΙΝ κάνει login (D51 — guest booking flow).
     *
     * serviceIds ως query param: το Spring παρσάρει "1,2,3" σε List<Long>
     * αυτόματα (comma-separated → λίστα).
     */
    @GetMapping("/api/employees/available")
    public List<PublicEmployeeResponse> getAvailableEmployees(
            @RequestParam List<Long> serviceIds) {

        return publicEmployeeService.findAvailableForServices(serviceIds);
    }
}