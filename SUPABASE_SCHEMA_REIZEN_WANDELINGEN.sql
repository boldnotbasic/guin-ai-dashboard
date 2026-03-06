-- SQL Schema voor Reizen en Wandelingen tabellen
-- Voer deze queries uit in je Supabase SQL Editor

-- ============================================
-- REIZEN TABELLEN
-- ============================================

-- Destinations tabel
CREATE TABLE IF NOT EXISTS destinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  travelers INTEGER DEFAULT 2,
  budget DECIMAL(10, 2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  image_url TEXT,
  photos TEXT[],
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hotels tabel
CREATE TABLE IF NOT EXISTS hotels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_per_night DECIMAL(10, 2) DEFAULT 0,
  nights INTEGER DEFAULT 1,
  rating DECIMAL(2, 1) DEFAULT 0,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flights tabel
CREATE TABLE IF NOT EXISTS flights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  airline TEXT NOT NULL,
  departure TEXT,
  arrival TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  baggage_included BOOLEAN DEFAULT false,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- WANDELINGEN TABELLEN
-- ============================================

-- Hikes tabel
CREATE TABLE IF NOT EXISTS hikes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  distance_km DECIMAL(10, 2) DEFAULT 0,
  estimated_time_hours DECIMAL(4, 2) DEFAULT 0,
  drive_time_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'done')),
  rating DECIMAL(2, 1) DEFAULT 0,
  notes TEXT,
  image_url TEXT,
  photos TEXT[],
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES voor betere performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_destinations_user_id ON destinations(user_id);
CREATE INDEX IF NOT EXISTS idx_destinations_created_at ON destinations(created_at);
CREATE INDEX IF NOT EXISTS idx_hotels_destination_id ON hotels(destination_id);
CREATE INDEX IF NOT EXISTS idx_flights_destination_id ON flights(destination_id);
CREATE INDEX IF NOT EXISTS idx_hikes_user_id ON hikes(user_id);
CREATE INDEX IF NOT EXISTS idx_hikes_status ON hikes(status);
CREATE INDEX IF NOT EXISTS idx_hikes_created_at ON hikes(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE hikes ENABLE ROW LEVEL SECURITY;

-- Destinations policies
CREATE POLICY "Users can view their own destinations"
  ON destinations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own destinations"
  ON destinations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own destinations"
  ON destinations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own destinations"
  ON destinations FOR DELETE
  USING (auth.uid() = user_id);

-- Hotels policies (via destination ownership)
CREATE POLICY "Users can view hotels for their destinations"
  ON hotels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = hotels.destination_id
      AND destinations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert hotels for their destinations"
  ON hotels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = hotels.destination_id
      AND destinations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update hotels for their destinations"
  ON hotels FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = hotels.destination_id
      AND destinations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete hotels for their destinations"
  ON hotels FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = hotels.destination_id
      AND destinations.user_id = auth.uid()
    )
  );

-- Flights policies (via destination ownership)
CREATE POLICY "Users can view flights for their destinations"
  ON flights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = flights.destination_id
      AND destinations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert flights for their destinations"
  ON flights FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = flights.destination_id
      AND destinations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update flights for their destinations"
  ON flights FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = flights.destination_id
      AND destinations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete flights for their destinations"
  ON flights FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM destinations
      WHERE destinations.id = flights.destination_id
      AND destinations.user_id = auth.uid()
    )
  );

-- Hikes policies
CREATE POLICY "Users can view their own hikes"
  ON hikes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hikes"
  ON hikes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hikes"
  ON hikes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hikes"
  ON hikes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS voor updated_at timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at
  BEFORE UPDATE ON hotels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flights_updated_at
  BEFORE UPDATE ON flights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hikes_updated_at
  BEFORE UPDATE ON hikes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
