-- Supabase Table Structure for page_configurations
-- This table will mirror the Firebase 'pages' collection structure

CREATE TABLE page_configurations (
  -- Primary key
  id TEXT PRIMARY KEY,
  
  -- Basic page information
  title TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  is_page BOOLEAN DEFAULT false,
  page_id TEXT,
  
  -- Report configuration (single selections - for backward compatibility)
  selected_region TEXT,
  selected_division TEXT,
  selected_office TEXT,
  selected_frequency TEXT,
  
  -- Report configuration (multiple selections - new format)
  selected_regions JSONB DEFAULT '[]'::jsonb,
  selected_divisions JSONB DEFAULT '[]'::jsonb,
  selected_offices JSONB DEFAULT '[]'::jsonb,
  
  -- Form fields configuration
  fields JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_page_configurations_title ON page_configurations(title);
CREATE INDEX idx_page_configurations_selected_region ON page_configurations(selected_region);
CREATE INDEX idx_page_configurations_selected_frequency ON page_configurations(selected_frequency);
CREATE INDEX idx_page_configurations_last_updated ON page_configurations(last_updated);
CREATE INDEX idx_page_configurations_created_at ON page_configurations(created_at);

-- Create indexes for JSONB fields
CREATE INDEX idx_page_configurations_selected_regions ON page_configurations USING GIN(selected_regions);
CREATE INDEX idx_page_configurations_selected_divisions ON page_configurations USING GIN(selected_divisions);
CREATE INDEX idx_page_configurations_selected_offices ON page_configurations USING GIN(selected_offices);
CREATE INDEX idx_page_configurations_fields ON page_configurations USING GIN(fields);

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_page_configurations_updated_at 
    BEFORE UPDATE ON page_configurations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add Row Level Security (RLS) if needed
-- ALTER TABLE page_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (adjust as needed)
-- CREATE POLICY "Allow authenticated users to manage page configurations" ON page_configurations
--   FOR ALL USING (auth.role() = 'authenticated');

-- Sample data insertion (for testing)
-- INSERT INTO page_configurations (
--   id, 
--   title, 
--   selected_regions, 
--   selected_divisions, 
--   selected_offices, 
--   selected_frequency,
--   fields
-- ) VALUES (
--   'sample-page-1',
--   'Sample Report Page',
--   '["north", "south"]'::jsonb,
--   '["north-division-1", "south-division-1"]'::jsonb,
--   '["FAC001", "FAC002"]'::jsonb,
--   'weekly',
--   '[{"id": "field1", "type": "text", "label": "Sample Field"}]'::jsonb
-- );

-- Query examples:

-- 1. Get all page configurations
-- SELECT * FROM page_configurations ORDER BY last_updated DESC;

-- 2. Get pages with specific region
-- SELECT * FROM page_configurations 
-- WHERE selected_regions ? 'north' OR selected_region = 'north';

-- 3. Get pages with specific frequency
-- SELECT * FROM page_configurations WHERE selected_frequency = 'weekly';

-- 4. Get pages created in last 7 days
-- SELECT * FROM page_configurations 
-- WHERE created_at >= NOW() - INTERVAL '7 days';

-- 5. Search in fields
-- SELECT * FROM page_configurations 
-- WHERE fields @> '[{"type": "text"}]';

-- 6. Count pages by frequency
-- SELECT selected_frequency, COUNT(*) 
-- FROM page_configurations 
-- GROUP BY selected_frequency;

-- 7. Get pages with multiple regions selected
-- SELECT * FROM page_configurations 
-- WHERE jsonb_array_length(selected_regions) > 1;
