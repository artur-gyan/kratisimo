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

    // ── Lock του «βιβλίου» ενός πελάτη (D176) ──
    // SELECT … FOR UPDATE στη γραμμή του πελάτη στο users: όποια ΑΛΛΗ συναλλαγή
    // ζητήσει το ίδιο lock ΠΕΡΙΜΕΝΕΙ μέχρι αυτή να κάνει commit/rollback.
    // → δύο εγγραφές στο ledger του ίδιου πελάτη εκτελούνται η μία ΜΕΤΑ την άλλη.
    // Διαφορετικοί πελάτες = διαφορετικές γραμμές → δεν περιμένουν ο ένας τον άλλον.
    //
    // Native και μόνο το id: δεν φορτώνεται entity User (ούτε τα EAGER roles, D31)
    // και φαίνεται ΑΚΡΙΒΩΣ το SQL που τρέχει.
    // Ζει εδώ και όχι στο UserRepository: σκοπός του είναι το loyalty ledger·
    // η γραμμή του users είναι απλώς το «λουκέτο» του.
    // ΠΡΕΠΕΙ να καλείται μέσα σε read-write transaction: το lock κρατιέται μέχρι το
    // commit, και η PostgreSQL απαγορεύει FOR UPDATE σε read-only transaction.
    @Query(value = "SELECT id FROM users WHERE id = :customerId FOR UPDATE", nativeQuery = true)
    Long lockLedgerOf(@Param("customerId") Long customerId);

    // ── Σφραγίδες που «ξόδεψαν» τα δώρα, ανά πελάτη (D128 μοτίβο) ──
    // Σ visits_required: κάθε δώρο αφαιρεί ΟΣΕΣ σφραγίδες κόστισε ΟΤΑΝ κερδήθηκε,
    // όχι το τρέχον N. Γι' αυτό το N αποθηκεύεται σε κάθε δώρο: αύξηση 5→7 δεν
    // κάνει ένα παλιό δώρο να «κοστίζει» ξαφνικά 7 (το bug του D168).
    // Πελάτης χωρίς δώρα → καμία γραμμή → ο service το θεωρεί 0.
    @Query("""
            SELECT r.customer.id AS customerId,
                   SUM(r.visitsRequired) AS consumedStamps
            FROM LoyaltyReward r
            WHERE r.customer.id IN :customerIds
            GROUP BY r.customer.id
            """)
    List<ConsumedStampsProjection> sumConsumedStampsByCustomer(
            @Param("customerIds") List<Long> customerIds);

    // ── Ελεύθερα δώρα, ΠΑΛΑΙΟΤΕΡΟ πρώτο (D173 κανόνας 3) ──
    // Ένα query για τρεις χρήσεις:
    //   - πλήθος ελεύθερων      = μέγεθος λίστας ανά πελάτη
    //   - % επόμενου δώρου      = το 1ο της λίστας
    //   - δώρο για την κράτηση  = το 1ο της λίστας (List.of(customerId))
    // NOT EXISTS = κατά λέξη ο ορισμός του «ελεύθερου».
    // id ως δεύτερο κριτήριο: δώρα που γεννιούνται στην ίδια συναλλαγή μπορεί να
    // έχουν ίδιο earnedAt· το IDENTITY id είναι πάντα αύξον → σταθερή σειρά.
    @Query("""
            SELECT r FROM LoyaltyReward r
            WHERE r.customer.id IN :customerIds
              AND NOT EXISTS (
                    SELECT a.id FROM Appointment a
                    WHERE a.loyaltyReward = r AND a.status <> :cancelled)
            ORDER BY r.earnedAt ASC, r.id ASC
            """)
    List<LoyaltyReward> findFreeOldestFirst(
            @Param("customerIds") List<Long> customerIds,
            @Param("cancelled") AppointmentStatus cancelled);

    interface ConsumedStampsProjection {
        Long getCustomerId();
        long getConsumedStamps();
    }
}
