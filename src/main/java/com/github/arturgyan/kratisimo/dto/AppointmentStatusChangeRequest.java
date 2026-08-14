package com.github.arturgyan.kratisimo.dto;

import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Αλλαγή status ραντεβού από admin (D148). State machine — μόνο έγκυρες
 * μεταβάσεις επιτρέπονται (έλεγχος στο service).
 */
public record AppointmentStatusChangeRequest(
        @NotNull(message = "Target status is required")
        AppointmentStatus status
) {}