package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.service.AvailabilityService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@RestController
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    public AvailabilityController(AvailabilityService availabilityService) {
        this.availabilityService = availabilityService;
    }

    @GetMapping("/api/availability")
    public List<Instant> getAvailability(
            @RequestParam Long employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam int durationMinutes) {

        // Ο controller ΔΕΝ υπολογίζει τίποτα — προωθεί στον engine.
        // Επιστρέφει List<Instant>: τα σημεία εκκίνησης διαθέσιμων slots.
        return availabilityService.findAvailableSlots(employeeId, date, durationMinutes);
    }
}