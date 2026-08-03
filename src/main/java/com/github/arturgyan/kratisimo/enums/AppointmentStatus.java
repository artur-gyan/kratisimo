package com.github.arturgyan.kratisimo.enums;

public enum AppointmentStatus {
    PENDING,
    CONFIRMED,
    COMPLETED,
    CANCELLED,
    NO_SHOW;

    /**
     * Statuses που δεσμεύουν χρόνο στο ημερολόγιο του υπαλλήλου.
     */
    public boolean blocksTime() {
        return this == PENDING || this == CONFIRMED || this == COMPLETED;
    }
}
