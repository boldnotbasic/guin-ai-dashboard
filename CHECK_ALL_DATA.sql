-- Check if data exists in all tables (ignoring RLS)
-- Run this in Supabase SQL Editor to see if data is there

-- Autos
SELECT 'autos' as table_name, COUNT(*) as total_count, 
       COUNT(DISTINCT user_id) as unique_users,
       array_agg(DISTINCT user_id) as user_ids
FROM autos;

-- Aquarium Fish
SELECT 'aquarium_fish' as table_name, COUNT(*) as total_count,
       COUNT(DISTINCT user_id) as unique_users,
       array_agg(DISTINCT user_id) as user_ids
FROM aquarium_fish;

-- Jerky Batches
SELECT 'jerky_batches' as table_name, COUNT(*) as total_count,
       COUNT(DISTINCT user_id) as unique_users,
       array_agg(DISTINCT user_id) as user_ids
FROM jerky_batches;

-- Festivals
SELECT 'festivals' as table_name, COUNT(*) as total_count,
       COUNT(DISTINCT user_id) as unique_users,
       array_agg(DISTINCT user_id) as user_ids
FROM festivals;

-- Recipes
SELECT 'recipes' as table_name, COUNT(*) as total_count,
       COUNT(DISTINCT user_id) as unique_users,
       array_agg(DISTINCT user_id) as user_ids
FROM recipes;

-- Check current authenticated users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;
