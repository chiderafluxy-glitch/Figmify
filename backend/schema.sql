-- Figmify Database Schema for Supabase

-- Create api_keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_key ON api_keys(key);
CREATE INDEX idx_api_keys_email ON api_keys(email);

-- Create usage table
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  count INTEGER DEFAULT 0,
  overage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(api_key_id, month)
);

CREATE INDEX idx_usage_api_key_id ON usage(api_key_id);
CREATE INDEX idx_usage_month ON usage(month);

-- Create conversion_logs table (optional, for debugging)
CREATE TABLE conversion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  html_size_bytes INTEGER,
  success BOOLEAN,
  duration_ms INTEGER,
  error_message TEXT
);

CREATE INDEX idx_conversion_logs_api_key_id ON conversion_logs(api_key_id);
CREATE INDEX idx_conversion_logs_timestamp ON conversion_logs(timestamp);

-- Enable Row Level Security (optional, for extra security)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users to see their own data)
CREATE POLICY "Users can view their own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can view their own usage"
  ON usage FOR SELECT
  USING (api_key_id IN (
    SELECT id FROM api_keys WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view their own conversion logs"
  ON conversion_logs FOR SELECT
  USING (api_key_id IN (
    SELECT id FROM api_keys WHERE id = auth.uid()
  ));
