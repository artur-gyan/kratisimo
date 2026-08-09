package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.*;
import com.github.arturgyan.kratisimo.entity.Appointment;
import com.github.arturgyan.kratisimo.entity.EmployeeProfile;
import com.github.arturgyan.kratisimo.entity.Review;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.exception.SlotUnavailableException;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
import com.github.arturgyan.kratisimo.repository.EmployeeProfileRepository;
import com.github.arturgyan.kratisimo.repository.ReviewRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.github.arturgyan.kratisimo.exception.ForbiddenException;
import com.github.arturgyan.kratisimo.exception.AlreadyReviewedException;

import java.util.List;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final AppointmentRepository appointmentRepository;
    private final EmployeeProfileRepository employeeProfileRepository;


    public ReviewService(ReviewRepository reviewRepository,
                         AppointmentRepository appointmentRepository,
                         EmployeeProfileRepository employeeProfileRepository) {
        this.reviewRepository = reviewRepository;
        this.appointmentRepository = appointmentRepository;
        this.employeeProfileRepository = employeeProfileRepository;
    }

    /**
     * Δημιουργία review. customerId ΑΠΟ ΤΟ TOKEN (D52) — ποτέ από το request.
     * Κανόνες: (1) το ραντεβού υπάρχει, (2) ανήκει στον customer, (3) είναι COMPLETED,
     * (4) δεν έχει ήδη αξιολογηθεί.
     */
    @Transactional
    public ReviewResponse create(ReviewRequest request, Long customerId) {

        // (1) Φόρτωση ραντεβού. findById (χρειαζόμαστε πεδία: customer, status, employee).
        Appointment appointment = appointmentRepository.findById(request.appointmentId())
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));

        // (2) OWNERSHIP CHECK (D52): ανήκει το ραντεβού στον συνδεδεμένο customer;
        // Χωρίς αυτό, οποιοσδήποτε αξιολογεί ραντεβού άλλου αλλάζοντας το appointmentId (IDOR).
        if (!appointment.getCustomer().getId().equals(customerId)) {
            throw new ForbiddenException("You can only review your own appointments");  // 403
        }

        // (3) COMPLETED CHECK: μόνο ολοκληρωμένα ραντεβού αξιολογούνται.
        if (appointment.getStatus() != AppointmentStatus.COMPLETED) {
            throw new IllegalArgumentException("Only completed appointments can be reviewed");
        }

        // (4) DUPLICATE CHECK ΠΡΙΝ το save (D95): καθαρό μήνυμα αντί για DataIntegrityViolation.
        // Έχει DB backing (appointment_id UNIQUE, V1) → ο check είναι σωστός (D96 τηρείται).
        if (reviewRepository.existsByAppointmentId(request.appointmentId())) {
            throw new AlreadyReviewedException("You have already reviewed this appointment");  // 409
        }

        // Χτίσιμο & save.
        Review review = new Review();
        review.setAppointment(appointment);   // managed entity (findById) → σωστό FK
        review.setRating(request.rating());   // Integer → int autoboxing (ήδη validated 1-5)
        review.setComment(request.comment()); // nullable — OK
        // createdAt: @CreationTimestamp το γεμίζει αυτόματα.

        Review saved = reviewRepository.save(review);

        return toResponse(saved);
    }

    /** "Τα δικά μου" reviews. customerId από token. */
    @Transactional(readOnly = true)
    public List<ReviewResponse> getMyReviews(Long customerId) {
        return reviewRepository
                .findByAppointmentCustomerIdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    /** "Όλα" (admin view) — ΜΕ customerName. */
    @Transactional(readOnly = true)
    public List<AdminReviewResponse> getAllForAdmin() {
        return reviewRepository
                .findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toAdminResponse)
                .toList();
    }

    /** "Ανά υπάλληλο + μέσος όρος" — public, χωρίς customerName. */
    @Transactional(readOnly = true)
    public EmployeeRatingResponse getEmployeeReviews(Long employeeId) {
        // Επικύρωση: υπάρχει ο υπάλληλος; findById (χρειαζόμαστε το όνομα).
        EmployeeProfile employee = employeeProfileRepository.findById(employeeId)
                .orElseThrow(() -> new IllegalArgumentException("Employee not found"));

        List<Review> reviews = reviewRepository
                .findByAppointmentEmployeeIdOrderByCreatedAtDesc(employeeId);

        Double average = reviewRepository.findAverageRatingByEmployeeId(employeeId);
        // average = null αν 0 reviews → το αφήνουμε null (σημασιολογικά σωστό, ΟΧΙ 0).

        List<ReviewResponse> reviewDtos = reviews.stream()
                .map(this::toResponse)
                .toList();

        return new EmployeeRatingResponse(
                employee.getId(),
                employee.getUser().getFullName(),
                average,
                reviewDtos.size(),   // count από τη λίστα — κανένα ξεχωριστό COUNT query
                reviewDtos
        );
    }

    // ── Private mappers (μέσα στο @Transactional → lazy proxies resolve, D87) ──

    private ReviewResponse toResponse(Review r) {
        Appointment a = r.getAppointment();
        return new ReviewResponse(
                r.getId(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt(),
                a.getId(),
                a.getEmployee().getUser().getFullName()  // ασυμμετρία FK: employee → user
        );
    }

    private AdminReviewResponse toAdminResponse(Review r) {
        Appointment a = r.getAppointment();
        return new AdminReviewResponse(
                r.getId(),
                r.getRating(),
                r.getComment(),
                r.getCreatedAt(),
                a.getId(),
                a.getEmployee().getUser().getFullName(),
                a.getCustomer().getFullName()   // customer FK → users (άμεσο, όχι μέσω profile)
        );
    }
}