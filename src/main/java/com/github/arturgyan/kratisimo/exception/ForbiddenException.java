package com.github.arturgyan.kratisimo.exception;

/**
 * Ο πόρος υπάρχει αλλά ο χρήστης δεν έχει δικαίωμα σε αυτόν (403).
 * Διαφορετικό από 400 (κακό input) και 404 (δεν υπάρχει).
 * Χρήση: ownership violations (D52) — π.χ. review σε ξένο ραντεβού.
 */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}