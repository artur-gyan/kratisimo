package com.github.arturgyan.kratisimo.dto;

/**
 * Public-safe προβολή υπαλλήλου για τη ροή κράτησης (βήμα 2).
 *
 * ΜΟΝΟ ό,τι επιτρέπεται να δει ανώνυμος/πελάτης: id (για το επόμενο βήμα),
 * όνομα, φωτογραφία, + βαθμολογία (average + count). ΟΧΙ bio/services/active —
 * αυτά είναι admin πληροφορία (EmployeeResponse). Ίδια αρχή με D109: ξεχωριστό
 * DTO ανά κοινό, ΔΟΜΙΚΑ αδύνατη η διαρροή.
 *
 * averageRating: Double (nullable) — null όταν 0 reviews (D110: null όχι 0,
 * "μέσος όρος 0 παραπλανητικό, min rating=1"). Το frontend δείχνει "Χωρίς κριτικές".
 * reviewCount: πάντα int (0 όταν καμία) — count 0 έχει νόημα, δεν παραπλανά.
 */
public record PublicEmployeeResponse(
        Long id,
        String fullName,
        String photoUrl,
        Double averageRating,
        int reviewCount
) {}
