-- V6: photo_url από VARCHAR(255) σε TEXT για base64 εικόνες (D163).
-- Base64 μιας resized εικόνας ~30-60KB → πολύ πάνω από 255 chars.
ALTER TABLE employee_profiles
ALTER COLUMN photo_url TYPE TEXT;