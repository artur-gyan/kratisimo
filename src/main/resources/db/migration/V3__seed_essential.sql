-- ============================================================
-- V3__seed_essential.sql
-- ΜΟΝΟ δομικά υποχρεωτικά δεδομένα (production-safe).
-- Η singleton business_settings γραμμή: χωρίς αυτήν, ο engine
-- σκάει (loadSettings δεν βρίσκει τίποτα). ΔΕΝ είναι test data —
-- είναι προϋπόθεση λειτουργίας (D39/D40). Test data → DataSeeder.
-- ============================================================

INSERT INTO business_settings (
    id, name, type, timezone,
    slot_granularity_minutes, booking_lead_time_minutes, setup_completed
) VALUES (
             1,                          -- SINGLETON_ID σταθερά (D39)
             'Kratisimo Salon',          -- placeholder — ο admin το αλλάζει από το UI
             'HAIR_SALON',               -- BusinessType enum (προσαρμόσέ το αν διαφέρει)
             'Europe/Athens',            -- IANA timezone (D35)
             15,                         -- granularity 15' (D15)
             10,                         -- lead time 10' (D68)
             false                       -- setup_completed: false → onboarding wizard δεν έχει τρέξει
         );