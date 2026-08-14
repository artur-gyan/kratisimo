package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.*;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.service.AdminAppointmentService;
import com.github.arturgyan.kratisimo.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/admin/appointments")
public class AdminAppointmentController {

    private final AdminAppointmentService adminAppointmentService;
    private final BookingService bookingService;

    public AdminAppointmentController(AdminAppointmentService adminAppointmentService,
                                      BookingService bookingService) {
        this.adminAppointmentService = adminAppointmentService;
        this.bookingService = bookingService;
    }

    @GetMapping
    public List<AdminAppointmentResponse> getAppointments(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return adminAppointmentService.getAppointmentsInRange(from, to);
    }

    // GET /api/admin/appointments/by-status?status=&from=&to= — drill-down (D149).
    @GetMapping("/by-status")
    public List<AdminAppointmentResponse> getByStatus(
            @RequestParam AppointmentStatus status,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return adminAppointmentService.getByStatusInRange(status, from, to);
    }

    // POST /api/admin/appointments — admin κλείνει ραντεβού (registered ή walk-in, D142).
    @PostMapping
    public ResponseEntity<BookingResponse> adminBook(
            @Valid @RequestBody AdminBookingRequest request) {
        BookingResponse response = bookingService.adminBook(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // POST /api/admin/appointments/{id}/cancel — admin ακυρώνει (D143). 204.
    // PUT /api/admin/appointments/{id}/status — αλλαγή status (state machine, D148). 204.
    // Αντικαθιστά το παλιό /cancel: ένα endpoint για complete + cancel.
    @PutMapping("/{id}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changeStatus(@PathVariable Long id,
                             @Valid @RequestBody AppointmentStatusChangeRequest request) {
        adminAppointmentService.changeStatus(id, request.status());
    }

    // PUT /api/admin/appointments/{id}/reschedule — admin μετακινεί ραντεβού (D145). 204.
    // PUT: ενημέρωση υπάρχοντος πόρου (idempotent — ίδιο body → ίδιο αποτέλεσμα).
    @PutMapping("/{id}/reschedule")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reschedule(@PathVariable Long id,
                           @Valid @RequestBody RescheduleRequest request) {
        adminAppointmentService.reschedule(id, request);
    }
}