-- Email Integration Schema for Outlook/Microsoft Graph API
-- This enables automatic email fetching and filtering per project

-- Table for storing Outlook connection credentials
CREATE TABLE IF NOT EXISTS outlook_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  email_address TEXT NOT NULL,
  tenant_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for project email filters (keywords and sender rules)
CREATE TABLE IF NOT EXISTS project_email_filters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('keyword', 'sender', 'subject')),
  filter_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for storing fetched emails linked to projects
CREATE TABLE IF NOT EXISTS project_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email_id TEXT UNIQUE NOT NULL, -- Microsoft Graph message ID
  subject TEXT,
  from_email TEXT,
  from_name TEXT,
  to_emails TEXT[],
  cc_emails TEXT[],
  body_preview TEXT,
  body_content TEXT,
  received_date TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  has_attachments BOOLEAN DEFAULT false,
  importance TEXT,
  matched_filters JSONB, -- Store which filters matched this email
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for email attachments
CREATE TABLE IF NOT EXISTS project_email_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_email_id UUID NOT NULL REFERENCES project_emails(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes INTEGER,
  download_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_outlook_connections_user_id ON outlook_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_outlook_connections_email ON outlook_connections(email_address);

CREATE INDEX IF NOT EXISTS idx_project_email_filters_project_id ON project_email_filters(project_id);
CREATE INDEX IF NOT EXISTS idx_project_email_filters_active ON project_email_filters(is_active);

CREATE INDEX IF NOT EXISTS idx_project_emails_project_id ON project_emails(project_id);
CREATE INDEX IF NOT EXISTS idx_project_emails_email_id ON project_emails(email_id);
CREATE INDEX IF NOT EXISTS idx_project_emails_received_date ON project_emails(received_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_emails_from_email ON project_emails(from_email);

CREATE INDEX IF NOT EXISTS idx_email_attachments_project_email_id ON project_email_attachments(project_email_id);

-- Enable RLS
ALTER TABLE outlook_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_email_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_email_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for authenticated users
CREATE POLICY "Allow all for authenticated users" ON outlook_connections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON project_email_filters
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON project_emails
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON project_email_attachments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger for updated_at columns
CREATE TRIGGER update_outlook_connections_updated_at
  BEFORE UPDATE ON outlook_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_email_filters_updated_at
  BEFORE UPDATE ON project_email_filters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_emails_updated_at
  BEFORE UPDATE ON project_emails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
