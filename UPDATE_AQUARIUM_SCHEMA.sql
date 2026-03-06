-- =============================================
-- UPDATE BESTAANDE AQUARIUM TABELLEN
-- =============================================
-- Run dit script in Supabase SQL Editor als je de tabellen al hebt aangemaakt
-- Dit voegt de nieuwe kolommen toe aan bestaande tabellen

-- Voeg aquarium_name en cleaning_type toe aan cleaning_logs
ALTER TABLE aquarium_cleaning_logs 
ADD COLUMN IF NOT EXISTS aquarium_name TEXT NOT NULL DEFAULT 'Juwel 450l';

ALTER TABLE aquarium_cleaning_logs 
ADD COLUMN IF NOT EXISTS cleaning_type TEXT NOT NULL DEFAULT 'waterverversing';

-- Voeg birth_date toe aan aquarium_fish
ALTER TABLE aquarium_fish 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Update oude records (optioneel)
-- COMMENT: Als je oude cleaning logs hebt zonder aquarium_name/cleaning_type,
-- worden deze automatisch gezet op de defaults: 'Juwel 450l' en 'waterverversing'
