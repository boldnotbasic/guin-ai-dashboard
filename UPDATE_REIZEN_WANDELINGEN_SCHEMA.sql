-- SQL om bestaande Reizen en Wandelingen tabellen bij te werken
-- Voer deze queries uit in je Supabase SQL Editor

-- ============================================
-- UPDATE BESTAANDE TABELLEN
-- ============================================

-- Voeg image_url en photos toe aan destinations tabel
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Voeg image_url en photos toe aan hikes tabel
ALTER TABLE hikes 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Voeg is_selected toe aan hotels en flights voor berekeningen
ALTER TABLE hotels
ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT false;

ALTER TABLE flights
ADD COLUMN IF NOT EXISTS is_selected BOOLEAN DEFAULT false;

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Deze kun je niet via SQL aanmaken, doe dit handmatig in Supabase Dashboard:
-- 1. Ga naar Storage in Supabase Dashboard
-- 2. Maak een nieuwe bucket aan: "reizen" (Public)
-- 3. Maak een nieuwe bucket aan: "wandelingen" (Public)

-- ============================================
-- STORAGE POLICIES (optioneel - voor betere beveiliging)
-- ============================================
-- Deze policies zorgen ervoor dat alleen ingelogde gebruikers kunnen uploaden
-- maar iedereen kan de afbeeldingen bekijken (omdat buckets public zijn)
