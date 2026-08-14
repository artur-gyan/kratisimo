package com.github.arturgyan.kratisimo.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

/**
 * Admin booking (D142): ο admin κλείνει ραντεβού για πελάτη.
 *
 * Διαφορά από BookingRequest:
 *  - customerId ΣΤΟ BODY (επιτρεπτό — ο admin ενεργεί εκ μέρους, ΟΧΙ IDOR/D52:
 *    η ταυτότητα του actor έρχεται από το token, ο customer είναι δεδομένο της πράξης).
 *  - guestName/guestPhone: walk-in χωρίς λογαριασμό.
 *  - XOR: ή customerId ή guestName, ποτέ και τα δύο, ποτέ κανένα (έλεγχος στο service).
 *
 * customerId/guest ΧΩΡΙΣ validation annotations — το XOR δεν εκφράζεται με @NotNull
 * (κανένα από τα δύο δεν είναι πάντα υποχρεωτικό). Ελέγχεται στο service.
 */
public record AdminBookingRequest(

        @NotEmpty(message = "At least one service is required")
        List<Long> serviceIds,

        // null = "οποιοσδήποτε διαθέσιμος" (D17)
        Long employeeId,

        @NotNull(message = "Start time is required")
        Instant startsAt,

        // Registered πελάτης (ή null αν walk-in)
        Long customerId,

        // Walk-in στοιχεία (ή null αν registered)
        String guestName,
        String guestPhone

) {}