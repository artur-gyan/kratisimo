-- ============================================================
-- V4__guest_appointments.sql
-- Admin walk-in booking: ραντεβού για πελάτη ΧΩΡΙΣ λογαριασμό.
-- Μέχρι τώρα κάθε appointment ΕΠΡΕΠΕ να έχει customer_id (registered user).
-- Τώρα: ή customer_id (registered) ή guest στοιχεία (walk-in) — ποτέ και τα δύο.
-- ============================================================

-- 1) customer_id: NOT NULL → nullable.
--    Ένα walk-in ραντεβού δεν αντιστοιχεί σε κανέναν user.
ALTER TABLE appointments ALTER COLUMN customer_id DROP NOT NULL;

-- 2) Guest στοιχεία (μόνο για walk-in). Nullable: registered ραντεβού τα αφήνει κενά.
ALTER TABLE appointments ADD COLUMN guest_name  VARCHAR(255);
ALTER TABLE appointments ADD COLUMN guest_phone VARCHAR(50);

-- 3) CHECK: XOR — ΑΚΡΙΒΩΣ ένα από τα δύο.
--    Είτε έχεις customer_id (registered), είτε guest_name (walk-in), ΠΟΤΕ και τα δύο,
--    ΠΟΤΕ κανένα. Η βάση = ο τελευταίος φύλακας (D45): κανένα path δεν σπάει τον κανόνα.
ALTER TABLE appointments ADD CONSTRAINT customer_xor_guest
    CHECK (
        (customer_id IS NOT NULL AND guest_name IS NULL)
            OR (customer_id IS NULL     AND guest_name IS NOT NULL)
        );