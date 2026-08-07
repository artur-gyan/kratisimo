package com.github.arturgyan.kratisimo.exception;

/**
 * Το ραντεβού έχει ήδη αξιολογηθεί (409 Conflict).
 * Ίδια λογική με SlotUnavailableException (D85): conflict = ειδική σημασία,
 * δικός του τύπος. Έχει DB backing (appointment_id UNIQUE) → check έγκυρος (D96).
 */
public class AlreadyReviewedException extends RuntimeException {
    public AlreadyReviewedException(String message) {
        super(message);
    }
}