package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.dto.SettingsRequest;
import com.github.arturgyan.kratisimo.dto.SettingsResponse;
import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.repository.BusinessSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    private final BusinessSettingsRepository settingsRepository;

    public SettingsService(BusinessSettingsRepository settingsRepository) {
        this.settingsRepository = settingsRepository;
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
                s.isSetupCompleted()
        );
    }
}