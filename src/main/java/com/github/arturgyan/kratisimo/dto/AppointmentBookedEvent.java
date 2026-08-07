package com.github.arturgyan.kratisimo.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Immutable snapshot ενός επιτυχημένου booking.
 *
 * Γιατί record: immutable value object — μόλις φτιαχτεί, δεν αλλάζει.
 * Γιατί ΟΧΙ το Appointment entity: το entity κουβαλάει lazy proxies
 * (employee, customer, items). Ο listener τρέχει σε @Async thread ΜΕΤΑ το
 * commit, όπου το Hibernate session έχει ΚΛΕΙΣΕΙ (open-in-view:false, D22).
 * Οποιαδήποτε προσπάθεια resolve ενός lazy proxy εκεί → LazyInitializationException.
 * Άρα κουβαλάμε ΜΟΝΟ ήδη-διαβασμένες, "flat" τιμές — ίδια αρχή με D87.
 */
public record AppointmentBookedEvent(
        String customerEmail,       // πού στέλνουμε το email
        String customerName,        // για το "Αγαπητέ/ή {name}"
        String employeeName,        // ποιος υπάλληλος
        Instant startsAt,           // πότε το ραντεβού
        List<String> serviceNames,  // ποιες υπηρεσίες
        BigDecimal totalPrice       // συνολική τιμή
) {}