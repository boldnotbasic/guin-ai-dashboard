-- Check if data exists in tables
SELECT 'autos' as table_name, COUNT(*) as count FROM autos
UNION ALL
SELECT 'aquarium_fish', COUNT(*) FROM aquarium_fish
UNION ALL
SELECT 'jerky_batches', COUNT(*) FROM jerky_batches
UNION ALL
SELECT 'festivals', COUNT(*) FROM festivals
UNION ALL
SELECT 'recipes', COUNT(*) FROM recipes;
