-- Pokémon Kaarten Collectie Tabel
-- Voor het bijhouden van Pokémon kaarten en boosters met foto's en waardes

CREATE TABLE IF NOT EXISTS pokemon_collection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Basis informatie
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'card', -- 'card', 'booster', 'sealed', 'other'
  
  -- Financiële data
  purchase_price DECIMAL(10, 2),
  purchase_date DATE,
  current_value DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'EUR',
  
  -- Foto
  image_url TEXT,
  
  -- AI Scanning data
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  ai_estimated_value DECIMAL(10, 2),
  ai_confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
  ai_scan_notes TEXT,
  
  -- Metadata
  condition VARCHAR(50), -- 'mint', 'near_mint', 'excellent', 'good', 'played', 'poor'
  set_name VARCHAR(255),
  card_number VARCHAR(50),
  rarity VARCHAR(50),
  language VARCHAR(10) DEFAULT 'en',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE pokemon_collection ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own pokemon collection"
  ON pokemon_collection FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pokemon items"
  ON pokemon_collection FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pokemon items"
  ON pokemon_collection FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pokemon items"
  ON pokemon_collection FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes voor betere performance
CREATE INDEX idx_pokemon_collection_user_id ON pokemon_collection(user_id);
CREATE INDEX idx_pokemon_collection_type ON pokemon_collection(type);
CREATE INDEX idx_pokemon_collection_created_at ON pokemon_collection(created_at DESC);

-- Trigger voor updated_at
CREATE OR REPLACE FUNCTION update_pokemon_collection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pokemon_collection_updated_at
  BEFORE UPDATE ON pokemon_collection
  FOR EACH ROW
  EXECUTE FUNCTION update_pokemon_collection_updated_at();

-- Comments
COMMENT ON TABLE pokemon_collection IS 'Pokémon kaarten en boosters collectie met AI waarde scanning';
COMMENT ON COLUMN pokemon_collection.ai_confidence_score IS 'AI confidence score tussen 0 en 1';
COMMENT ON COLUMN pokemon_collection.condition IS 'Staat van de kaart: mint, near_mint, excellent, good, played, poor';
