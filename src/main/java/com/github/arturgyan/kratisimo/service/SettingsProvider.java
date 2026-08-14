package com.github.arturgyan.kratisimo.service;

import com.github.arturgyan.kratisimo.entity.BusinessSettings;
import com.github.arturgyan.kratisimo.repository.BusinessSettingsRepository;
import org.springframework.stereotype.Service;

import java.time.ZoneId;

/**
 * Κεντρικό σημείο φόρτωσης του BusinessSettings singleton (D39).
 *
 * Πριν: κάθε service είχε το δικό του loadSettings()/loadZone() (τεχνικό χρέος —
 * 7 αντίγραφα του ίδιου findById + orElseThrow). Τώρα: ένα bean.
 *
 * ΧΩΡΙΣ cache (σκόπιμα): ο admin αλλάζει granularity/leadTime live από τα Settings
 * (SettingsService.updateSettings). Cache θα σέρβιρε stale ρυθμίσεις μέχρι restart.
 * Το findById σε singleton-με-PK είναι indexed lookup, πρακτικά δωρεάν.
 */
@Service
public class SettingsProvider {

    private final BusinessSettingsRepository repository;

    public SettingsProvider(BusinessSettingsRepository repository) {
        this.repository = repository;
    }

    /** Ολόκληρο το entity — granularity/leadTime/name/timezone/κλπ. */
    public BusinessSettings get() {
        return repository.findById(BusinessSettings.SINGLETON_ID)
                .orElseThrow(() -> new IllegalStateException(
                        "BusinessSettings singleton not found — has setup run?"));
    }

    /** Convenience — ο #1 λόγος που φορτώνουμε settings παντού (D35). */
    public ZoneId getZone() {
        return ZoneId.of(get().getTimezone());
    }
}