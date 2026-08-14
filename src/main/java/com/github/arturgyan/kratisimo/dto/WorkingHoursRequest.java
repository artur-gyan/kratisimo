package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

/**
 * Request DTO για full-replace του εβδομαδιαίου προγράμματος ενός υπαλλήλου.
 * Περιέχει λίστα βαρδιών (shifts) — κάθε βάρδια = μία γραμμή working_hours.
 *
 * Παρατηρήσεις:
 * - @Valid στη λίστα → κάθε Shift επικυρώνεται ξεχωριστά (cascade validation).
 * - @NotEmpty → απαιτείται τουλάχιστον μία βάρδια (κενό πρόγραμμα = άκυρο).
 *   Αν θέλεις "κανένας δεν δουλεύει" → διαγραφή υπαλλήλου (soft delete).
 */
public record WorkingHoursRequest(

        @NotEmpty(message = "At least one shift is required")
        @Valid
        List<Shift> shifts

) {
    /**
     * Μία βάρδια = (μέρα, ώρα έναρξης, ώρα λήξης).
     * Nested record — επικυρώνεται μέσω του @Valid στο parent.
     */
    public record Shift(

            @NotNull(message = "Day of week is required")
            DayOfWeek dayOfWeek,

            @NotNull(message = "Start time is required")
            LocalTime startTime,

            @NotNull(message = "End time is required")
            LocalTime endTime

    ) {}
}
