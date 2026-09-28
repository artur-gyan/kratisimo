package com.github.arturgyan.kratisimo.dto;

import com.github.arturgyan.kratisimo.entity.Appointment;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Προβολή ραντεβού για admin (ημερολόγιο, ιστορικό πελάτη) και employee (D154).
 *
 * totalPrice = ΤΕΛΙΚΗ τιμή (μετά την έκπτωση).
 * discountPercent / discountAmount = snapshot επιβράβευσης (0 / 0,00 αν καμία).
 */
public record AdminAppointmentResponse(
        Long id,
        Long employeeId,          // employeeProfileId — για φιλτράρισμα ανά υπάλληλο
        String customerName,
        String employeeName,
        Instant startsAt,
        Instant endsAt,
        AppointmentStatus status,
        BigDecimal totalPrice,
        int discountPercent,        // ΝΕΟ (2e)
        BigDecimal discountAmount,  // ΝΕΟ (2e)
        int totalDurationMinutes,
        List<String> serviceNames
) {

    /**
     * ΕΝΑ σημείο mapping Entity → DTO. Πριν υπήρχαν 3 σχεδόν ίδια αντίγραφα
     * (AdminAppointmentService, AdminCustomerService, EmployeeAppointmentService):
     * κάθε νέο πεδίο απαιτούσε 3 αλλαγές — και μια ξεχασμένη = bug.
     *
     * Πρέπει να καλείται ΜΕΣΑ σε @Transactional: διαβάζει lazy σχέσεις
     * (items → service, employee → user, customer) — D87.
     */
    public static AdminAppointmentResponse from(Appointment a) {
        List<String> serviceNames = a.getItems().stream()
                .map(item -> item.getService().getName())
                .toList();

        // Walk-in (D139/D140): customer = null → όνομα από guestName.
        String customerName = (a.getCustomer() != null)
                ? a.getCustomer().getFullName()
                : a.getGuestName();

        return new AdminAppointmentResponse(
                a.getId(),
                a.getEmployee().getId(),
                customerName,
                a.getEmployee().getUser().getFullName(),
                a.getStartsAt(),
                a.getEndsAt(),
                a.getStatus(),
                a.getTotalPrice(),
                a.getDiscountPercent(),
                a.getDiscountAmount(),
                a.getTotalDurationMinutes(),
                serviceNames
        );
    }
}