package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.AdminAppointmentResponse;
import com.github.arturgyan.kratisimo.security.CustomUserDetails;
import com.github.arturgyan.kratisimo.service.EmployeeAppointmentService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/employee")
public class EmployeeAppointmentController {

    private final EmployeeAppointmentService employeeAppointmentService;

    public EmployeeAppointmentController(EmployeeAppointmentService employeeAppointmentService) {
        this.employeeAppointmentService = employeeAppointmentService;
    }

    /**
     * Τα ραντεβού του LOGGED-IN υπαλλήλου σε date range.
     * userId από το token (D52) — ο employee δεν μπορεί να δει άλλου το πρόγραμμα.
     */
    @GetMapping("/appointments")
    public List<AdminAppointmentResponse> getMyAppointments(
            @AuthenticationPrincipal CustomUserDetails principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        Long userId = principal.getUser().getId();
        return employeeAppointmentService.getMyAppointments(userId, from, to);
    }
}