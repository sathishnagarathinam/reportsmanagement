-- Simple Supabase Table Structure for page_configurations
-- This matches the current code structure without problematic columns

-- Drop table if it exists (to start fresh)
DROP TABLE IF EXISTS page_configurations;

-- Create the table with only the columns we actually use
CREATE TABLE page_configurations (
  -- Primary key
  id TEXT PRIMARY KEY,
  
  -- Basic page information
  title TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
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

-- Disable Row Level Security for now (can enable later with proper policies)
ALTER TABLE page_configurations DISABLE ROW LEVEL SECURITY;

-- Test insert to verify everything works
INSERT INTO page_configurations (
  id, 
  title, 
  selected_regions, 
  selected_divisions, 
  selected_offices, 
  selected_frequency,
  fields
) VALUES (
  'test-page-1',
  'Test Report Page',
  '["north", "south"]'::jsonb,
  '["north-division-1", "south-division-1"]'::jsonb,
  '["FAC001", "FAC002"]'::jsonb,
  'weekly',
  '[{"id": "field1", "type": "text", "label": "Sample Field"}]'::jsonb
);

-- Verify the test insert worked
SELECT * FROM page_configurations WHERE id = 'test-page-1';

-- Clean up test data (optional)
-- DELETE FROM page_configurations WHERE id = 'test-page-1';
