package com.github.arturgyan.kratisimo.dto;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/**
 * Response DTO για το εβδομαδιαίο πρόγραμμα ενός υπαλλήλου.
 * Επιστρέφει ΟΛΕΣ τις βάρδιες (sorted server-side για UX consistency).
 *
 * Σημειώσεις:
 * - Το id κάθε shift περιλαμβάνεται για διαγνωστικούς λόγους (debugging,
 *   logging), αλλά το frontend ΔΕΝ το χρειάζεται — το replace είναι atomic.
 * - Το employeeId είναι redundant (ο client το ξέρει από το URL path),
 *   αλλά το συμπεριλαμβάνουμε για αυτοδιάγνωση του response (thesis best practice).
 */
public record WorkingHoursResponse(

        Long employeeId,

        List<Shift> shifts

) {
    public record Shift(

            Long id,              // DB primary key (για διαγνωστικούς λόγους)

            DayOfWeek dayOfWeek,

            LocalTime startTime,

            LocalTime endTime

    ) {}
}
