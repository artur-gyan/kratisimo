package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

/**
 * Το συμβόλαιο του booking POST: τι στέλνει ο client.
 *
 * ΔΕΝ περιέχει: customerId (D52 — από token), endsAt/totalPrice/totalDuration
 * (υπολογίζονται server-side). Ο client στέλνει ΜΟΝΟ επιλογές, ποτέ παράγωγα.
 */
public record BookingRequest(

        // Ποιες υπηρεσίες. @NotEmpty: πρέπει να υπάρχει τουλάχιστον μία.
        @NotEmpty(message = "At least one service is required")
        List<Long> serviceIds,

        // Ποιος υπάλληλος. NULLABLE: null = "οποιοσδήποτε διαθέσιμος" (D17).
        // ΚΑΝΕΝΑ validation annotation — το null είναι έγκυρη, επιθυμητή τιμή.
        Long employeeId,

        // Πότε ξεκινά. Το slot που διάλεξε ο client από τη λίστα του engine.
        // @NotNull: υποχρεωτικό. Το endsAt ΔΕΝ έρχεται — το υπολογίζουμε εμείς.
        @NotNull(message = "Start time is required")
        Instant startsAt

) {}