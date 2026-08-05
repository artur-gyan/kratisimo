package com.github.arturgyan.kratisimo.dto;

import java.time.Instant;

/**
 * Ένα διάστημα χρόνου [start, end) — κλειστό στην αρχή, ανοιχτό στο τέλος.
 * Δομικός λίθος όλου του availability engine: working hours, busy periods
 * και free slots αναπαρίστανται όλα ως Interval.
 *
 * Ημι-ανοιχτό [start, end): κρίσιμη σύμβαση. Δύο διαδοχικά ραντεβού
 * 10:00-10:30 και 10:30-11:00 ΔΕΝ επικαλύπτονται — το πρώτο τελειώνει
 * τη στιγμή που ξεκινά το δεύτερο, δεν τη μοιράζονται. (Ίδια λογική με
 * το tstzrange του EXCLUDE constraint: το '&&' θεωρεί τα ranges ημι-ανοιχτά.)
 */
public record Interval(Instant start, Instant end) {

    /**
     * Compact constructor: τρέχει ΠΡΙΝ ανατεθούν τα πεδία. Εδώ επιβάλλουμε
     * το invariant «start < end» — ένα interval με start >= end δεν έχει
     * νόημα (μηδενική ή αρνητική διάρκεια) και θα έσπαγε σιωπηλά τον
     * αλγόριθμο αφαίρεσης παρακάτω. Fail-fast: σκάμε στην κατασκευή, όχι
     * αργότερα με λάθος αποτελέσματα.
     */
    public Interval {
        if (start == null || end == null) {
            throw new IllegalArgumentException("Interval: start/end δεν επιτρέπεται null");
        }
        if (!start.isBefore(end)) {
            throw new IllegalArgumentException(
                    "Interval: start (" + start + ") πρέπει να είναι πριν το end (" + end + ")");
        }
    }
}