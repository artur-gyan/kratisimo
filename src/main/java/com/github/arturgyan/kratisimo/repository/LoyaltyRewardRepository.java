package com.github.arturgyan.kratisimo.repository;

import com.github.arturgyan.kratisimo.entity.LoyaltyReward;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Τα κερδισμένα δώρα (V8, D173).
 *
 * «Ελεύθερο» δώρο = ΔΕΝ υπάρχει μη ακυρωμένο ραντεβού δεμένο μαζί του.
 * Δεν αποθηκεύεται πουθενά — προκύπτει από το appointments (D173 κανόνας 4).
 * Το αν το πρόγραμμα είναι ενεργό ΔΕΝ ελέγχεται εδώ: τα queries λένε τι ισχύει
 * στα δεδομένα, ο LoyaltyService αποφασίζει τι εμφανίζεται (κανόνας 7).
 */
public interface LoyaltyRewardRepository extends JpaRepository<LoyaltyReward, Long> {

    // ── Σύνολα δώρων για ΕΝΑΝ ή ΠΟΛΛΟΥΣ πελάτες σε ΕΝΑ query (D128 μοτίβο) ──
    //  - consumedStamps: Σ visits_required = πόσες σφραγίδες «ξόδεψαν» τα δώρα που κερδήθηκαν
    //                    → πρόοδος τρέχουσας κάρτας = σφραγίδες − consumedStamps
    //  - freeRewards:    πόσα δώρα δεν έχουν δεθεί σε ενεργό ραντεβού
    //
    // LEFT JOIN ΧΩΡΙΣ fan-out: κάθε δώρο ταιριάζει με το ΠΟΛΥ ΕΝΑ μη ακυρωμένο ραντεβού,
    // το εγγυάται ο partial unique index uq_loyalty_reward_single_use → κάθε δώρο
    // εμφανίζεται ακριβώς μία φορά → το SUM(visitsRequired) είναι σωστό.
    //
    // Το φίλτρο status ΜΠΑΙΝΕΙ ΣΤΟ ON, ΟΧΙ ΣΤΟ WHERE: για ελεύθερο δώρο το a είναι NULL,
    // και στο WHERE το "NULL <> 'CANCELLED'" = unknown → η γραμμή θα πετιόταν
    // → τα ελεύθερα δώρα θα εξαφανίζονταν.
    //
    // Πελάτης χωρίς κανένα δώρο → καμία γραμμή → ο service το θεωρεί 0/0.
    @Query("""
            SELECT r.customer.id AS customerId,
                   SUM(r.visitsRequired) AS consumedStamps,
                   SUM(CASE WHEN a.id IS NULL THEN 1 ELSE 0 END) AS freeRewards
            FROM LoyaltyReward r
            LEFT JOIN Appointment a
                   ON a.loyaltyReward = r AND a.status <> :cancelled
            WHERE r.customer.id IN :customerIds
            GROUP BY r.customer.id
            """)
    List<RewardTotalsProjection> findTotalsByCustomer(
            @Param("customerIds") List<Long> customerIds,
            @Param("cancelled") AppointmentStatus cancelled);

    // ── Ελεύθερα δώρα ενός πελάτη, ΠΑΛΑΙΟΤΕΡΟ πρώτο (κράτηση, D173 κανόνας 3) ──
    // NOT EXISTS = κατά λέξη ο ορισμός του «ελεύθερου».
    // id ως δεύτερο κριτήριο: δύο δώρα που γεννιούνται στην ίδια συναλλαγή μπορεί να
    // έχουν ίδιο earnedAt· το IDENTITY id είναι πάντα αύξον → σταθερή σειρά.
    // Χωρίς LIMIT: ένας πελάτης έχει το πολύ λίγα ελεύθερα δώρα· ο service παίρνει το 1ο.
    @Query("""
            SELECT r FROM LoyaltyReward r
            WHERE r.customer.id = :customerId
              AND NOT EXISTS (
                    SELECT a.id FROM Appointment a
                    WHERE a.loyaltyReward = r AND a.status <> :cancelled)
            ORDER BY r.earnedAt ASC, r.id ASC
            """)
    List<LoyaltyReward> findFreeOldestFirst(
            @Param("customerId") Long customerId,
            @Param("cancelled") AppointmentStatus cancelled);

    interface RewardTotalsProjection {
        Long getCustomerId();
        long getConsumedStamps();
        long getFreeRewards();
    }
}
