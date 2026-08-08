package com.github.arturgyan.kratisimo.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Προβολή ραντεβού για τη σελίδα «Τα ραντεβού μου» (customer).
 *
 * ΔΕΝ περιέχει customer στοιχεία (ο ίδιος τα ξέρει) ούτε εσωτερικά πεδία.
 * Περιέχει 'canCancel' — παράγωγο boolean που λέει στο frontend αν να δείξει
 * το κουμπί ακύρωσης. Ο υπολογισμός γίνεται server-side (ο client δεν
 * αποφασίζει τι επιτρέπεται — ίδια αρχή με το enforcement server-side).
 */
public record MyAppointmentResponse(
        Long id,
        Instant startsAt,
        Instant endsAt,
        String employeeName,
        List<String> serviceNames,
        BigDecimal totalPrice,
        String status,
        boolean canCancel
) {}