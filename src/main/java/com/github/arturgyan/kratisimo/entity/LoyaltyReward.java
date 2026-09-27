package com.github.arturgyan.kratisimo.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Ένα κερδισμένο δώρο επιβράβευσης (V8, D173).
 *
 * ΑΜΕΤΑΒΛΗΤΟ μετά τη δημιουργία — ΚΑΝΕΝΑΣ setter:
 *  - Το % και το N "παγώνουν" τη στιγμή που κερδίζεται (D173 κανόνας 6).
 *    Αλλαγή ρυθμίσεων δεν μπορεί να το αγγίξει — δεν υπάρχει καν μέθοδος γι' αυτό.
 *  - Το αν είναι ελεύθερο ΔΕΝ αποθηκεύεται εδώ: προκύπτει από τα ραντεβού
 *    (D173 κανόνας 4) → ούτε γι' αυτό χρειάζεται setter.
 *
 * Ο Hibernate γεμίζει τα πεδία με reflection (field access, επειδή το @Id είναι
 * σε πεδίο) → δεν χρειάζεται setters. Χρειάζεται ΜΟΝΟ no-args constructor,
 * που τον κάνουμε protected: υπάρχει για τον Hibernate, όχι για τον κώδικά μας.
 */
@Entity
@Table(name = "loyalty_rewards")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LoyaltyReward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @Column(name = "discount_percent", nullable = false)
    private int discountPercent;

    @Column(name = "visits_required", nullable = false)
    private int visitsRequired;

    @CreationTimestamp
    @Column(name = "earned_at", nullable = false, updatable = false)
    private Instant earnedAt;

    /**
     * Ο ΜΟΝΟΣ τρόπος να φτιαχτεί δώρο: με τον κανόνα που ισχύει ΤΩΡΑ.
     *
     * Static factory αντί για constructor(customer, int, int): δύο int στη σειρά
     * μπερδεύονται εύκολα (5 σφραγίδες / 20% ↔ 20 σφραγίδες / 5%) χωρίς compile
     * error. Εδώ και τα δύο διαβάζονται από το ίδιο αντικείμενο → η αντιμετάθεση
     * είναι αδύνατη, και το όνομα λέει τι συμβαίνει: "κερδίζεται με τον τρέχοντα κανόνα".
     */
    public static LoyaltyReward earn(User customer, BusinessSettings currentRule) {
        LoyaltyReward reward = new LoyaltyReward();
        reward.customer = customer;
        reward.visitsRequired = currentRule.getLoyaltyVisitsRequired();
        reward.discountPercent = currentRule.getLoyaltyDiscountPercent();
        return reward;
    }
}
