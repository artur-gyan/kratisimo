package com.github.arturgyan.kratisimo.dto;

/**
 * Public-safe προβολή υπαλλήλου για τη ροή κράτησης (βήμα 2).
 *
 * ΜΟΝΟ ό,τι επιτρέπεται να δει ανώνυμος/πελάτης: id (για το επόμενο βήμα),
 * όνομα, φωτογραφία. ΟΧΙ bio/services/active — αυτά είναι admin πληροφορία
 * (EmployeeResponse). Ίδια αρχή με D109: ξεχωριστό DTO ανά κοινό,
 * ΔΟΜΙΚΑ αδύνατη η διαρροή (δεν υπάρχει καν πεδίο για τα ευαίσθητα).
 */
public record PublicEmployeeResponse(
        Long id,
        String fullName,
        String photoUrl
) {}