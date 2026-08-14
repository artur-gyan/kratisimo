-- ============================================================
-- V5__unaccent.sql
-- Accent-insensitive customer search (D141): «κω» βρίσκει «Κώστας».
-- Το unaccent extension αφαιρεί τόνους/διακριτικά για σύγκριση.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS unaccent;