package com.github.arturgyan.kratisimo.entity;

import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "appointments")
@Getter
@Setter
@NoArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private User customer;

    @Column(name = "guest_name", length = 255)
    private String guestName;

    @Column(name = "guest_phone", length = 50)
    private String guestPhone;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private EmployeeProfile employee;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @Column(name = "total_price", nullable = false, precision = 8, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "total_duration_minutes", nullable = false)
    private int totalDurationMinutes;

    // ── Έκπτωση (V7) — snapshot ΤΙΜΗΣ τη στιγμή της κράτησης (D6) ──
    // totalPrice = ΤΕΛΙΚΗ τιμή (μετά την έκπτωση).
    // Invariant: totalPrice + discountAmount = Σ priceSnapshot.
    // ΑΛΛΑΓΗ (D173): το «χρησιμοποίησε δώρο» το λέει πλέον το loyaltyReward != null,
    // ΟΧΙ το discountPercent > 0 — τα ραντεβού του Chat 16 έχουν έκπτωση ΧΩΡΙΣ δώρο.

    @Column(name = "discount_percent", nullable = false)
    private int discountPercent = 0;

    @Column(name = "discount_amount", nullable = false, precision = 8, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    // ── ΝΕΟ (V8, D173): επιβράβευση ως ledger ──

    // Σφραγίδα: μπαίνει ΜΙΑ φορά, στο «Ολοκληρώθηκε», αν το πρόγραμμα είναι ενεργό ΤΟΤΕ.
    // Δεν ξαναγίνεται ποτέ false: το COMPLETED είναι τελική κατάσταση (D148)
    // → οι σφραγίδες μόνο προστίθενται (append-only).
    // Java default ΠΑΡΑ το DB DEFAULT: ο Hibernate στέλνει ΟΛΕΣ τις mapped στήλες στο INSERT (D167).
    @Column(name = "loyalty_stamp", nullable = false)
    private boolean loyaltyStamp = false;

    // Το δώρο που εξαργυρώνει αυτό το ραντεβού (null = κανένα).
    // Στη βάση το FK είναι ΣΥΝΘΕΤΟ (customer_id, loyalty_reward_id) → μόνο δώρο του ίδιου πελάτη.
    // Εδώ χαρτογραφείται ΜΟΝΟ η loyalty_reward_id: την customer_id την «κατέχει» ήδη το πεδίο
    // customer. Το σύνθετο FK μένει δίχτυ της βάσης (D45) — ο Hibernate δεν χρειάζεται να το ξέρει.
    // Στην ακύρωση ΔΕΝ μηδενίζεται: μένει ως ιστορικό. Ο partial unique index αγνοεί τα
    // CANCELLED → το δώρο ελευθερώνεται χωρίς καμία γραμμή κώδικα (D173 κανόνας 4).
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "loyalty_reward_id")
    private LoyaltyReward loyaltyReward;

    @OneToMany(
            mappedBy = "appointment",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    @OrderBy("sortOrder ASC")
    private List<AppointmentItem> items = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "cancellation_reason", length = 300)
    private String cancellationReason;

    // --- helper method: κρατάει και τις δύο πλευρές συνεπείς ---
    public void addItem(AppointmentItem item) {
        items.add(item);
        item.setAppointment(this);
    }
}
