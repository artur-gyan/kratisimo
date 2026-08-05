package com.github.arturgyan.kratisimo.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Σταθερό σχήμα για ΟΛΑ τα error responses του API.
 * Record γιατί είναι immutable value object — μία φορά το φτιάχνει ο handler,
 * κανείς δεν το πειράζει (ίδια λογική με το Interval, D62).
 *
 * Το fieldErrors είναι nullable: γεμίζει ΜΟΝΟ στα validation errors (@Valid).
 * Σε όλα τα άλλα σφάλματα μένει null και ο Jackson το παραλείπει (βλ. σχόλιο κάτω).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors
) {
    // Factory για τη συνηθισμένη περίπτωση (χωρίς field errors).
    // Γιατί factory: αποφεύγει να γράφουμε "null" σε κάθε call-site του handler
    // — καθαρότερο και δείχνει πρόθεση ("αυτό ΔΕΝ είναι validation error").
    public static ErrorResponse of(int status, String error, String message, String path) {
        return new ErrorResponse(Instant.now(), status, error, message, path, null);
    }
}