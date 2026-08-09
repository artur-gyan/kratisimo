package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.MyAppointmentResponse;
import com.github.arturgyan.kratisimo.entity.Appointment;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.exception.ForbiddenException;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
import com.github.arturgyan.kratisimo.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
public class MyAppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final ReviewRepository reviewRepository;

    public MyAppointmentService(AppointmentRepository appointmentRepository,
                                ReviewRepository reviewRepository) {
        this.appointmentRepository = appointmentRepository;
        this.reviewRepository = reviewRepository;
    }

    /**
     * Τα ραντεβού του συνδεδεμένου πελάτη (customerId από token, D52).
     * readOnly: μόνο διαβάζουμε· το DTO χτίζεται ΜΕΣΑ στο transaction γιατί
     * διαβάζει lazy πεδία (employee.user.fullName, items) — D87.
     */
    @Transactional(readOnly = true)
    public List<MyAppointmentResponse> findMyAppointments(Long customerId) {
        // Ένα query φέρνει ΟΛΑ τα αξιολογημένα ids — έξω από το loop (κανένα N+1).
        Set<Long> reviewedIds =
                reviewRepository.findReviewedAppointmentIdsByCustomerId(customerId);

        return appointmentRepository
                .findByCustomerIdOrderByStartsAtDesc(customerId)
                .stream()
                .map(a -> toResponse(a, reviewedIds))
                .toList();
    }

    /**
     * Ακύρωση ραντεβού. Τρεις έλεγχοι με σειρά ευαισθησίας:
     * ownership (403) → status (400) → χρόνος (400).
     * Soft cancel (D20): status→CANCELLED + cancelledAt. Το CANCELLED ΔΕΝ
     * μπλοκάρει χρόνο → το slot ελευθερώνεται αυτόματα.
     */
    @Transactional
    public void cancelAppointment(Long appointmentId, Long customerId, String reason) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        // 1. OWNERSHIP (D52) — πρώτα απ' όλα: είναι δικό σου;
        //    getId() σε lazy proxy: το FK υπάρχει, κανένα SELECT.
        if (!appointment.getCustomer().getId().equals(customerId)) {
            throw new ForbiddenException("You can only cancel your own appointments");
        }

        // 2. STATUS — μόνο CONFIRMED ακυρώνεται.
        if (appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new IllegalArgumentException(
                    "Only confirmed appointments can be cancelled");
        }

        // 3. ΧΡΟΝΟΣ — μόνο μελλοντικά. Παρελθόν δεν ακυρώνεται.
        if (appointment.getStartsAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException(
                    "Past appointments cannot be cancelled");
        }

        // Soft cancel (D20) — dirty checking κάνει το UPDATE στο commit.
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancelledAt(Instant.now());
        appointment.setCancellationReason(reason);
    }

    // ── Mapping helper ──
    private MyAppointmentResponse toResponse(Appointment a, Set<Long> reviewedIds) {
        // Ονόματα υπηρεσιών από τα items (lazy → resolve μέσα στο transaction).
        List<String> serviceNames = a.getItems().stream()
                .map(item -> item.getService().getName())
                .toList();

        // canCancel: το ΙΔΙΟ κριτήριο με το cancelAppointment (μελλοντικό + CONFIRMED).
        // Υπολογίζεται server-side ώστε το frontend να ξέρει αν δείξει το κουμπί.
        boolean canCancel = a.getStatus() == AppointmentStatus.CONFIRMED
                && a.getStartsAt().isAfter(Instant.now());

        // canReview: COMPLETED ΚΑΙ δεν υπάρχει ήδη review γι' αυτό.
        // Το ΙΔΙΟ κριτήριο με το ReviewService.create (COMPLETED + no duplicate).
        // O(1) lookup στο Set — κανένα ανά-ραντεβού query.
        boolean canReview = a.getStatus() == AppointmentStatus.COMPLETED
                && !reviewedIds.contains(a.getId());

        return new MyAppointmentResponse(
                a.getId(),
                a.getStartsAt(),
                a.getEndsAt(),
                a.getEmployee().getUser().getFullName(),  // ασυμμετρία FK
                serviceNames,
                a.getTotalPrice(),
                a.getStatus().name(),
                canCancel,
                canReview
        );
    }
}