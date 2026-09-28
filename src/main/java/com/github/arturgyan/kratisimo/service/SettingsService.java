package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.SettingsRequest;
import com.github.arturgyan.kratisimo.dto.SettingsResponse;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.repository.BusinessSettingsRepository;
import org.springframework.stereotype.Service;
import com.github.arturgyan.kratisimo.dto.LoyaltySettingsRequest;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    private final BusinessSettingsRepository settingsRepository;
    private final LoyaltyService loyaltyService;   // ── ΝΕΟ (D175)

    public SettingsService(BusinessSettingsRepository settingsRepository,
                           LoyaltyService loyaltyService) {   // ── ΝΕΟ (D175)
        this.settingsRepository = settingsRepository;
        this.loyaltyService = loyaltyService;
    }

    // ---------- READ ----------
    @Transactional(readOnly = true)
    public SettingsResponse getSettings() {
        BusinessSettings s = loadSingleton();
        return toResponse(s);
    }

    // ---------- UPDATE ----------
    @Transactional
    public SettingsResponse updateSettings(SettingsRequest request) {

        // ⭐ ΤΟ ΚΡΙΣΙΜΟ VALIDATION (D70): το granularity ΠΡΕΠΕΙ να διαιρεί το 60.
        // Αλλιώς τα slots δεν στοιχίζονται στην ώρα (π.χ. 7' → 9:00, 9:07, 9:14... χάος).
        // Δεν μπαίνει ως annotation στο DTO γιατί είναι business rule, όχι απλό range check.
        if (60 % request.slotGranularityMinutes() != 0) {
            throw new IllegalArgumentException(
                    "Slot granularity must divide 60 evenly (allowed: 5, 10, 15, 20, 30, 60)");
        }

        BusinessSettings s = loadSingleton();

        // Dirty checking — managed entity, UPDATE στο commit χωρίς save()
        s.setName(request.name());
        s.setAddress(request.address());
        s.setPhone(request.phone());
        s.setSlotGranularityMinutes(request.slotGranularityMinutes());
        s.setBookingLeadTimeMinutes(request.bookingLeadTimeMinutes());
        // timezone, email, businessType, setupCompleted: ΟΧΙ editable εδώ (σκόπιμα)

        return toResponse(s);
    }

    // ---------- UPDATE LOYALTY ----------
    // Ξεχωριστή πράξη από τις γενικές ρυθμίσεις (δική της ενότητα στο UI).
    // Κανένας επιπλέον έλεγχος εδώ: τα όρια είναι range checks → DTO (@Min/@Max).
    @Transactional
    public SettingsResponse updateLoyalty(LoyaltySettingsRequest request) {
        BusinessSettings s = loadSingleton();

        // Dirty checking — UPDATE στο commit, χωρίς save() (D95).
        s.setLoyaltyEnabled(request.enabled());
        s.setLoyaltyVisitsRequired(request.visitsRequired());
        s.setLoyaltyDiscountPercent(request.discountPercent());

        // ── ΝΕΟ (D175): όποιος φτάνει ΠΛΕΟΝ τον στόχο κερδίζει ΑΜΕΣΩΣ ──
        // Π.χ. N 7→3 με πρόοδο 6 → 2 δώρα. Αύξηση N / αλλαγή % → δεν δημιουργεί τίποτα.
        // ΙΔΙΟ transaction: αν αποτύχει η δημιουργία δώρων, rollback ΚΑΙ στις ρυθμίσεις
        // (δεν μένει ποτέ «νέος κανόνας χωρίς τα δώρα του»).
        // Ο LoyaltyService διαβάζει τον κανόνα μέσω SettingsProvider → findById στο ΙΔΙΟ
        // EntityManager → παίρνει ΑΥΤΟ το managed s, με τις νέες τιμές (first-level cache),
        // ακόμα κι αν το UPDATE δεν έχει γίνει ακόμα flush.
        loyaltyService.settleAll();

        return toResponse(s);
    }

    // ---------- helpers ----------
    private BusinessSettings loadSingleton() {
        return settingsRepository.findById(BusinessSettings.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException("Business settings not found"));
    }

    private SettingsResponse toResponse(BusinessSettings s) {
        return new SettingsResponse(
                s.getName(),
                s.getAddress(),
                s.getPhone(),
                s.getEmail(),
                s.getTimezone(),
                s.getType(),
                s.getSlotGranularityMinutes(),
                s.getBookingLeadTimeMinutes(),
                s.isSetupCompleted(),
                s.isLoyaltyEnabled(),
                s.getLoyaltyVisitsRequired(),
                s.getLoyaltyDiscountPercent()
        );

    }
}
