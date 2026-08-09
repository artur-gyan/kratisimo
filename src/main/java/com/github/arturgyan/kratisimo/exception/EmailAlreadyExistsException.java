package com.github.arturgyan.kratisimo.exception;

/**
 * Πετιέται όταν γίνεται εγγραφή με email που υπάρχει ήδη.
 * 409 Conflict — σύγκρουση με υπάρχουσα κατάσταση (το email είναι πιασμένο),
 * ΟΧΙ 400 "κακό input" (το input είναι έγκυρο). Ίδια σημασιολογία με
 * AlreadyReviewedException (D110) και SlotUnavailableException (D85).
 */
public class EmailAlreadyExistsException extends RuntimeException {
    public EmailAlreadyExistsException(String message) {
        super(message);
    }
}