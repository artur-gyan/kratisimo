package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.TimeOffRequest;
import com.github.arturgyan.kratisimo.dto.TimeOffResponse;
import com.github.arturgyan.kratisimo.service.TimeOffService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin-only διαχείριση αδειών υπαλλήλου.
 * Nested resource κάτω από employee (ίδιο pattern με WorkingHoursController).
 * /api/admin/** ήδη secured με hasRole("ADMIN") στο SecurityConfig.
 */
@RestController
@RequestMapping("/api/admin/employees/{employeeId}/time-off")
public class TimeOffController {

    private final TimeOffService timeOffService;

    public TimeOffController(TimeOffService timeOffService) {
        this.timeOffService = timeOffService;
    }

    // CREATE → 201
    @PostMapping
    public ResponseEntity<TimeOffResponse> create(
            @PathVariable Long employeeId,
            @Valid @RequestBody TimeOffRequest request) {
        TimeOffResponse created = timeOffService.create(employeeId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // LIST → 200
    @GetMapping
    public List<TimeOffResponse> list(@PathVariable Long employeeId) {
        return timeOffService.list(employeeId);
    }

    // DELETE → 204
    @DeleteMapping("/{timeOffId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long employeeId, @PathVariable Long timeOffId) {
        timeOffService.delete(employeeId, timeOffId);
    }
}