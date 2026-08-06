-- ============================================================
-- V2__constraints.sql
-- Constraints που το Hibernate ΔΕΝ παράγει (D23): EXCLUDE + CHECK.
-- Ο λόγος ύπαρξης του Flyway — αυτά ζουν ΜΟΝΟ εδώ, versioned.
-- ============================================================

-- ---- btree_gist extension ----
-- Το EXCLUDE constraint χρειάζεται GiST index. Ο τελεστής "=" (για employee_id)
-- κανονικά δεν υποστηρίζεται σε GiST — το btree_gist προσθέτει αυτή την υποστήριξη.
-- IF NOT EXISTS: idempotent, δεν σκάει αν ήδη υπάρχει.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---- no_overlap: DB-level αποτροπή επικάλυψης ραντεβού (D19, D84) ----
-- Το ΤΕΛΙΚΟ δίχτυ ενάντια σε race condition. Ο Java check (στάδιο 5) βλέπει
-- μόνο committed δεδομένα· δύο ταυτόχρονες transactions τον περνάνε ΚΑΙ ΟΙ ΔΥΟ.
-- Το constraint επιβάλλεται τη στιγμή του commit (καθολική εικόνα) → SQLSTATE 23P01.
--
-- Πώς δουλεύει:
--   employee_id WITH =        → ίδιος υπάλληλος
--   tstzrange(...) WITH &&    → χρονικά διαστήματα που τέμνονται
--   Απορρίπτει εγγραφή αν ΚΑΙ ΤΑ ΔΥΟ ισχύουν ταυτόχρονα για δύο γραμμές.
-- tstzrange = ημι-ανοιχτό [starts, ends) → 10:00-10:30 και 10:30-11:00 ΔΕΝ τέμνονται (D63).
-- WHERE: μόνο statuses που "πιάνουν" χρόνο (D50/blocksTime) — ακυρωμένα ελευθερώνουν slot.
ALTER TABLE appointments ADD CONSTRAINT no_overlap
    EXCLUDE USING gist (
        employee_id WITH =,
        tstzrange(starts_at, ends_at) WITH &&
    ) WHERE (status IN ('PENDING', 'CONFIRMED', 'COMPLETED'));

-- ---- CHECK constraints (τελευταίο επίπεδο validation, D45) ----
-- Η βάση = ο τελευταίος φύλακας. DTO + service ελέγχουν πρώτα, αλλά η βάση
-- εγγυάται ότι ΚΑΝΕΝΑ path (ακόμα και χειροκίνητο SQL) δεν παραβιάζει τον κανόνα.

-- rating 1-5 (D37)
ALTER TABLE reviews ADD CONSTRAINT rating_range
    CHECK (rating BETWEEN 1 AND 5);

-- ωράριο: αρχή πριν το τέλος
ALTER TABLE working_hours ADD CONSTRAINT wh_time_order
    CHECK (start_time < end_time);

-- άδεια: αρχή πριν το τέλος
ALTER TABLE time_off ADD CONSTRAINT to_time_order
    CHECK (starts_at < ends_at);