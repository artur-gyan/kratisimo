package com.github.arturgyan.kratisimo.controller;

import com.github.arturgyan.kratisimo.dto.*;
import com.github.arturgyan.kratisimo.security.CustomUserDetails;
import com.github.arturgyan.kratisimo.service.ReviewService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    /**
     * POST: ο customer αξιολογεί δικό του COMPLETED ραντεβού.
     * customerId ΑΠΟ ΤΟ TOKEN (D78) — ποτέ από το body.
     */
    @PostMapping("/api/reviews")
    public ResponseEntity<ReviewResponse> create(
            @Valid @RequestBody ReviewRequest request,
            @AuthenticationPrincipal CustomUserDetails principal) {

        // customerId από το authenticated principal — η ταυτότητα έρχεται από το token (D52).
        Long customerId = principal.getUser().getId();
        ReviewResponse response = reviewService.create(request, customerId);

        // 201 Created — δημιουργήθηκε νέος πόρος.
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** GET: τα δικά μου reviews (customer από token). */
    @GetMapping("/api/reviews/me")
    public List<ReviewResponse> getMyReviews(
            @AuthenticationPrincipal CustomUserDetails principal) {
        Long customerId = principal.getUser().getId();
        return reviewService.getMyReviews(customerId);
    }

    /** GET: όλα τα reviews (admin view, ΜΕ customerName). Path /api/admin/** → hasRole ADMIN. */
    @GetMapping("/api/admin/reviews")
    public List<AdminReviewResponse> getAllForAdmin() {
        return reviewService.getAllForAdmin();
    }

    /** GET: reviews ανά υπάλληλο + μέσος όρος. PUBLIC (permitAll στο SecurityConfig). */
    @GetMapping("/api/employees/{id}/reviews")
    public EmployeeRatingResponse getEmployeeReviews(@PathVariable Long id) {
        return reviewService.getEmployeeReviews(id);
    }
}