package com.github.arturgyan.kratisimo.dto;

import java.time.Instant;

/**
 * Admin review view. ΜΕ customerName — ο admin έχει νόμιμο λόγο (moderation).
 * Ξεχωριστό DTO από το ReviewResponse: το public response ΔΟΜΙΚΑ δεν έχει
 * πεδίο για customerName → αδύνατο να διαρρεύσει κατά λάθος.
 */
public record AdminReviewResponse(
        Long id,
        int rating,
        String comment,
        Instant createdAt,
        Long appointmentId,
        String employeeName,
        String customerName
) {}