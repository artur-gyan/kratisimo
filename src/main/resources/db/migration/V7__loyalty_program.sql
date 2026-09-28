-- V7: Πρόγραμμα επιβράβευσης (loyalty)

-- ─── 1. Ρυθμίσεις προγράμματος στο singleton (D40: επιχειρησιακή ρύθμιση → βάση) ───
ALTER TABLE business_settings
    ADD COLUMN loyalty_enabled          BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN loyalty_visits_required  INTEGER NOT NULL DEFAULT 7,
    ADD COLUMN loyalty_discount_percent INTEGER NOT NULL DEFAULT 20;

ALTER TABLE business_settings
    ADD CONSTRAINT loyalty_visits_min    CHECK (loyalty_visits_required >= 2),
    ADD CONSTRAINT loyalty_percent_range CHECK (loyalty_discount_percent BETWEEN 1 AND 100);

-- ─── 2. Έκπτωση ανά ραντεβού (snapshot, D6) ───
ALTER TABLE appointments
    ADD COLUMN discount_percent INTEGER       NOT NULL DEFAULT 0,
    ADD COLUMN discount_amount  NUMERIC(8, 2) NOT NULL DEFAULT 0;

ALTER TABLE appointments
    ADD CONSTRAINT discount_percent_range       CHECK (discount_percent BETWEEN 0 AND 100),
    ADD CONSTRAINT discount_amount_non_negative CHECK (discount_amount >= 0);