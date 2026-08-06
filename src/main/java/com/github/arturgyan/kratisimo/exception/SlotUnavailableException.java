package com.github.arturgyan.kratisimo.exception;

public class SlotUnavailableException extends RuntimeException{
    /**
     * Το ζητούμενο slot δεν είναι διαθέσιμο — είτε το έπιασε ο Java έλεγχος (στάδιο 5),
     * είτε το EXCLUDE constraint της βάσης (στάδιο 7, race που ξέφυγε).
     * RuntimeException → το @Transactional κάνει rollback αυτόματα.
     * Ξεχωριστός τύπος (όχι IllegalState) → ο handler το μεταφράζει σε 409, όχι 500.
     */
    public SlotUnavailableException(String message) {
        super(message);
    }
}
