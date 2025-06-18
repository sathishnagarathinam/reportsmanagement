-- Region Debug Queries for Supabase
-- Run these queries in your Supabase SQL Editor to debug the region issue

-- Query 1: Check total records and basic structure
SELECT COUNT(*) as total_records FROM offices;

-- Query 2: Check all unique regions (should show 4 regions)
SELECT DISTINCT "Region" as region_name, COUNT(*) as record_count
FROM offices 
GROUP BY "Region"
ORDER BY "Region";

-- Query 3: Check for data quality issues
SELECT 
  "Region",
  LENGTH("Region") as region_length,
  CASE 
    WHEN "Region" IS NULL THEN 'NULL'
    WHEN "Region" = '' THEN 'EMPTY'
    WHEN "Region" != TRIM("Region") THEN 'HAS_SPACES'
    ELSE 'OK'
  END as region_status,
  COUNT(*) as count
FROM offices
GROUP BY "Region", LENGTH("Region")
ORDER BY "Region";

-- Query 4: Check first few records with all columns
SELECT "Facility ID", "Region", "Division", "Office name"
FROM offices
ORDER BY "Region", "Division", "Office name"
LIMIT 10;

-- Query 5: Check for hidden characters or encoding issues
SELECT 
  "Region",
  ASCII(LEFT("Region", 1)) as first_char_ascii,
  ASCII(RIGHT("Region", 1)) as last_char_ascii,
  ENCODE("Region"::bytea, 'hex') as hex_encoding
FROM offices
GROUP BY "Region"
ORDER BY "Region";

-- Query 6: Test the exact query used by the application
SELECT "Facility ID", "Region", "Division", "Office name"
FROM offices
ORDER BY "Region" ASC, "Division" ASC, "Office name" ASC;

-- Query 7: Check for case variations
SELECT 
  UPPER("Region") as upper_region,
  LOWER("Region") as lower_region,
  "Region" as original_region,
  COUNT(*) as count
FROM offices
GROUP BY "Region"
ORDER BY "Region";

-- Expected Results:
-- Query 2 should show 4 distinct regions
-- Query 3 should show all regions with 'OK' status
-- Query 4 should show your data structure
-- If any queries show unexpected results, that's where the issue is
