package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.LoyaltyResponse;
import com.github.arturgyan.kratisimo.entity.Appointment;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.entity.LoyaltyReward;
import com.github.arturgyan.kratisimo.entity.User;
import com.github.arturgyan.kratisimo.enums.AppointmentStatus;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository;
import com.github.arturgyan.kratisimo.repository.AppointmentRepository.StampCountProjection;
import com.github.arturgyan.kratisimo.repository.LoyaltyRewardRepository;
import com.github.arturgyan.kratisimo.repository.LoyaltyRewardRepository.ConsumedStampsProjection;
import com.github.arturgyan.kratisimo.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * ΜΟΝΑΔΙΚΗ πηγή αλήθειας για την επιβράβευση — μοντέλο ledger (D173).
 *
 * ΑΠΟΘΗΚΕΥΟΝΤΑΙ (γεγονότα — γράφονται μία φορά, δεν ξαναϋπολογίζονται):
 *   - σφραγίδα   : appointments.loyalty_stamp      → στο «Ολοκληρώθηκε», αν το πρόγραμμα είναι ενεργό
 *   - δώρο       : γραμμή στο loyalty_rewards      → με το % και το N της στιγμής
 *   - εξαργύρωση : appointments.loyalty_reward_id  → στην κράτηση
 *
 * ΠΡΟΚΥΠΤΟΥΝ (δεν αποθηκεύονται):
 *   - πρόοδος  = σφραγίδες − Σ visits_required των δώρων
 *   - ελεύθερο = δώρο χωρίς μη ακυρωμένο ραντεβού → η ακύρωση το επιστρέφει με ΜΗΔΕΝ κώδικα
 *
 * Κάθε ΕΓΓΡΑΦΗ στο ledger ενός πελάτη περνά από lockLedgerOf (D176).
 * Οι αναγνώσεις δεν κλειδώνουν τίποτα.
 */
@Service
public class LoyaltyService {

    private static final AppointmentStatus CANCELLED = AppointmentStatus.CANCELLED;

    private final AppointmentRepository appointmentRepository;
    private final LoyaltyRewardRepository rewardRepository;
    private final UserRepository userRepository;
    private final SettingsProvider settingsProvider;

    public LoyaltyService(AppointmentRepository appointmentRepository,
                          LoyaltyRewardRepository rewardRepository,
                          UserRepository userRepository,
                          SettingsProvider settingsProvider) {
        this.appointmentRepository = appointmentRepository;
        this.rewardRepository = rewardRepository;
        this.userRepository = userRepository;
        this.settingsProvider = settingsProvider;
    }

    // ═══════════════════════════════ ΑΝΑΓΝΩΣΗ ═══════════════════════════════

    /** Ένας πελάτης ("Τα ραντεβού μου", «Νέο ραντεβού» του admin). */
    @Transactional(readOnly = true)
    public LoyaltyResponse getStatus(Long customerId) {
        return getStatuses(List.of(customerId)).get(customerId);
    }

    /**
     * Πολλοί πελάτες με ΣΤΑΘΕΡΟ πλήθος queries (3), όσοι κι αν είναι (D128).
     * Κλειδί: customerId. Πελάτης χωρίς τίποτα → 0 σφραγίδες, 0 δώρα.
     */
    @Transactional(readOnly = true)
    public Map<Long, LoyaltyResponse> getStatuses(List<Long> customerIds) {
        if (customerIds.isEmpty()) {
            return Map.of();   // guard: μη τρέξεις IN () με άδεια λίστα
        }

        BusinessSettings rule = settingsProvider.get();   // ΜΙΑ φορά (D69)

        Map<Long, Long> stamps = stampsOf(customerIds);
        Map<Long, Long> consumed = consumedOf(customerIds);

        // groupingBy κρατά τη σειρά του query → σε κάθε λίστα, το 1ο = το παλαιότερο.
        // r.getCustomer() είναι lazy proxy· το getId() ΔΕΝ τον φορτώνει (το id το ξέρει ήδη).
        Map<Long, List<LoyaltyReward>> free = rewardRepository
                .findFreeOldestFirst(customerIds, CANCELLED).stream()
                .collect(Collectors.groupingBy(r -> r.getCustomer().getId()));

        return customerIds.stream()
                .distinct()
                .collect(Collectors.toMap(
                        Function.identity(),
                        id -> compute(
                                stamps.getOrDefault(id, 0L),
                                consumed.getOrDefault(id, 0L),
                                free.getOrDefault(id, List.of()),
                                rule)));
    }

    // ═══════════════════════ ΕΓΓΡΑΦΗ 1: «Ολοκληρώθηκε» ═══════════════════════

    /**
     * Καλείται από τον AdminAppointmentService ΜΕΤΑ το setStatus(COMPLETED)
     * (το CHECK του V8 δέχεται σφραγίδα ΜΟΝΟ σε COMPLETED).
     *
     * Walk-in → τίποτα (χωρίς λογαριασμό = εκτός προγράμματος, D139).
     * Ανενεργό πρόγραμμα → τίποτα (κανόνας 7). Η σφραγίδα ΔΕΝ δίνεται ποτέ αργότερα:
     * είναι γεγονός της στιγμής, όχι κάτι που υπολογίζεται εκ των υστέρων.
     */
    @Transactional
    public void recordCompletion(Appointment appointment) {
        User customer = appointment.getCustomer();
        if (customer == null) {
            return;
        }

        BusinessSettings rule = settingsProvider.get();
        if (!rule.isLoyaltyEnabled()) {
            return;
        }

        appointment.setLoyaltyStamp(true);
        settle(customer, rule);
    }

    // ═══════════════════════════ ΕΓΓΡΑΦΗ 2: κράτηση ═══════════════════════════

    /**
     * Γεμίζει ΟΛΑ τα πεδία τιμής του ραντεβού: δώρο, %, ποσό έκπτωσης, τελική τιμή.
     * ΕΝΑ σημείο για book() ΚΑΙ adminBook() — ο κανόνας τιμολόγησης δεν διπλασιάζεται.
     *
     * Προϋπόθεση: appointment.customer ΗΔΗ ορισμένος (null = walk-in).
     *
     * Lock ΠΡΙΝ το «ποιο δώρο είναι ελεύθερο;»: δεύτερη ταυτόχρονη κράτηση του ίδιου
     * πελάτη περιμένει, και μετά το commit της πρώτης βλέπει το δώρο ΔΕΜΕΝΟ
     * → παίρνει το επόμενο ή 0%. Ο partial unique index μένει δίχτυ (D45).
     *
     * Η έκπτωση μπαίνει ΜΟΝΟ σε αυτό το νέο ραντεβού — τα ήδη κλεισμένα δεν αλλάζουν (κανόνας 8).
     */
    @Transactional
    public void applyLoyaltyPricing(Appointment appointment, BigDecimal subtotal) {
        LoyaltyReward reward = null;

        User customer = appointment.getCustomer();
        if (customer != null && settingsProvider.get().isLoyaltyEnabled()) {
            rewardRepository.lockLedgerOf(customer.getId());
            reward = rewardRepository
                    .findFreeOldestFirst(List.of(customer.getId()), CANCELLED).stream()
                    .findFirst()
                    .orElse(null);
        }

        // Το % του ΔΩΡΟΥ, όχι του τρέχοντος κανόνα (κανόνας 6).
        int percent = (reward != null) ? reward.getDiscountPercent() : 0;
        BigDecimal discountAmount = discountAmount(subtotal, percent);

        appointment.setLoyaltyReward(reward);
        appointment.setDiscountPercent(percent);             // snapshot (D6)
        appointment.setDiscountAmount(discountAmount);
        appointment.setTotalPrice(subtotal.subtract(discountAmount));
        // Invariant: totalPrice + discountAmount = subtotal = Σ priceSnapshot.
    }

    // ═══════════════════ ΕΓΓΡΑΦΗ 3: αλλαγή ρυθμίσεων (D175) ═══════════════════

    /**
     * Μετά την αποθήκευση ρυθμίσεων: όποιος φτάνει ΠΛΕΟΝ τον στόχο (π.χ. το N μειώθηκε)
     * κερδίζει τα δώρα του ΑΜΕΣΩΣ, με τον κανόνα που μόλις αποθηκεύτηκε.
     *
     * Καλείται μέσα στο transaction του SettingsService: το settingsProvider.get()
     * κάνει findById στο ίδιο EntityManager → επιστρέφει το ΙΔΙΟ managed αντικείμενο
     * (first-level cache), με τις ΝΕΕΣ τιμές, ακόμα και πριν το flush.
     *
     * Δύο φάσεις:
     *   1) χωρίς lock, 2 batch queries → ποιοι ΙΣΩΣ φτάνουν τον στόχο (συνήθως κανείς)
     *   2) μόνο γι' αυτούς: settle() = lock + ΞΑΝΑμέτρημα + δημιουργία
     * Το ξαναμέτρημα υπό lock είναι αυτό που μετράει· η φάση 1 απλώς αποφεύγει να
     * κλειδώσει όλους τους πελάτες σε κάθε αποθήκευση.
     */
    @Transactional
    public void settleAll() {
        BusinessSettings rule = settingsProvider.get();
        if (!rule.isLoyaltyEnabled()) {
            return;   // ανενεργό: τα δώρα θα γεννηθούν στην επανενεργοποίηση (ίδιο endpoint)
        }

        Map<Long, Long> stamps = appointmentRepository.countStampsForAllCustomers().stream()
                .collect(Collectors.toMap(
                        StampCountProjection::getCustomerId,
                        StampCountProjection::getStamps));
        if (stamps.isEmpty()) {
            return;
        }

        Map<Long, Long> consumed = consumedOf(new ArrayList<>(stamps.keySet()));
        int n = rule.getLoyaltyVisitsRequired();

        stamps.forEach((customerId, stampCount) -> {
            long progress = stampCount - consumed.getOrDefault(customerId, 0L);
            if (progress >= n) {
                // getReferenceById: proxy χωρίς SELECT — αρκεί για το FK του δώρου.
                settle(userRepository.getReferenceById(customerId), rule);
            }
        });
    }

    // ═════════════════════════════ ΕΣΩΤΕΡΙΚΑ ═════════════════════════════

    /**
     * Ο ΜΟΝΟΣ τόπος όπου γεννιούνται δώρα. Κοινός για ολοκλήρωση και ρυθμίσεις (D175).
     *
     * lock → μέτρηση → όσο πρόοδος ≥ N: νέο δώρο με τον τρέχοντα κανόνα.
     * Οι μετρήσεις γίνονται ΜΕΤΑ το lock: αν άλλη συναλλαγή έφτιαξε δώρο για τον ίδιο
     * πελάτη, την περιμέναμε, και το COUNT/SUM (READ COMMITTED) βλέπει ήδη το commit της.
     *
     * while, όχι if: μείωση N 7→3 με πρόοδο 6 = ΔΥΟ δώρα, πρόοδος 0/3
     * (κανόνας 6: οι σφραγίδες δεν χάνονται, απλώς γεμίζουν μικρότερες κάρτες).
     */
    private void settle(User customer, BusinessSettings rule) {
        Long id = customer.getId();
        rewardRepository.lockLedgerOf(id);

        List<Long> ids = List.of(id);
        long progress = stampsOf(ids).getOrDefault(id, 0L)
                - consumedOf(ids).getOrDefault(id, 0L);

        int n = rule.getLoyaltyVisitsRequired();
        while (progress >= n) {
            rewardRepository.save(LoyaltyReward.earn(customer, rule));
            progress -= n;
        }
    }

    private Map<Long, Long> stampsOf(List<Long> customerIds) {
        return appointmentRepository.countStampsByCustomer(customerIds).stream()
                .collect(Collectors.toMap(
                        StampCountProjection::getCustomerId,
                        StampCountProjection::getStamps));
    }

    private Map<Long, Long> consumedOf(List<Long> customerIds) {
        return rewardRepository.sumConsumedStampsByCustomer(customerIds).stream()
                .collect(Collectors.toMap(
                        ConsumedStampsProjection::getCustomerId,
                        ConsumedStampsProjection::getConsumedStamps));
    }

    /**
     * Ο κανόνας εμφάνισης — ΚΑΘΑΡΗ συνάρτηση (αριθμοί/λίστα μέσα, DTO έξω).
     */
    private static LoyaltyResponse compute(long stamps, long consumed,
                                           List<LoyaltyReward> freeOldestFirst,
                                           BusinessSettings rule) {
        int n = rule.getLoyaltyVisitsRequired();
        boolean enabled = rule.isLoyaltyEnabled();

        // Ενεργό: το settle κρατά πάντα την πρόοδο < N.
        // Ανενεργό + μειωμένο N: μπορεί ≥ N → δείχνουμε «γεμάτη κάρτα» (N/N)·
        // τα δώρα γεννιούνται στην επανενεργοποίηση (settleAll).
        int progress = (int) Math.min(stamps - consumed, n);

        long available = enabled ? freeOldestFirst.size() : 0;   // κανόνας 7: παγωμένα
        int nextRewardPercent = (available > 0)
                ? freeOldestFirst.get(0).getDiscountPercent()
                : 0;

        return new LoyaltyResponse(
                enabled,
                n,
                rule.getLoyaltyDiscountPercent(),
                stamps,
                progress,
                available,
                nextRewardPercent);
    }

    /**
     * subtotal × percent / 100, σε 2 δεκαδικά, HALF_UP (D29: BigDecimal, ποτέ double).
     * Χωρίς scale + RoundingMode, μια διαίρεση με άπειρα δεκαδικά πετάει ArithmeticException.
     * private πλέον: μόνο το applyLoyaltyPricing τιμολογεί.
     */
    private static BigDecimal discountAmount(BigDecimal subtotal, int percent) {
        return subtotal
                .multiply(BigDecimal.valueOf(percent))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
    }
}
