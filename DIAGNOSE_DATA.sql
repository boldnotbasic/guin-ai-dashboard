-- DIAGNOSTIC: Check if data exists and what user_ids are associated

-- Check if data exists in all tables
SELECT 'autos' as table_name, COUNT(*) as count, 
       COUNT(DISTINCT user_id) as unique_users
FROM autos;

SELECT 'aquarium_fish' as table_name, COUNT(*) as count,
       COUNT(DISTINCT user_id) as unique_users
FROM aquarium_fish;

SELECT 'jerky_batches' as table_name, COUNT(*) as count,
       COUNT(DISTINCT user_id) as unique_users
FROM jerky_batches;

SELECT 'festivals' as table_name, COUNT(*) as count,
       COUNT(DISTINCT user_id) as unique_users
FROM festivals;

SELECT 'recipes' as table_name, COUNT(*) as count,
       COUNT(DISTINCT user_id) as unique_users
FROM recipes;

-- Check what user_ids exist in the data
SELECT 'autos user_ids' as info, array_agg(DISTINCT user_id) as user_ids FROM autos
UNION ALL
SELECT 'aquarium_fish user_ids', array_agg(DISTINCT user_id) FROM aquarium_fish
UNION ALL
SELECT 'jerky_batches user_ids', array_agg(DISTINCT user_id) FROM jerky_batches
UNION ALL
SELECT 'festivals user_ids', array_agg(DISTINCT user_id) FROM festivals
UNION ALL
SELECT 'recipes user_ids', array_agg(DISTINCT user_id) FROM recipes;

-- Check current authenticated users
SELECT 'auth users' as info, id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;
