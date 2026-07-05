-- NetPlex ISP Management System — Database Schema

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  profile_id VARCHAR(100) UNIQUE NOT NULL,
  business_niche VARCHAR(100) DEFAULT 'isp',
  whatsapp_number VARCHAR(50),
  whatsapp_status VARCHAR(20) DEFAULT 'disconnected',
  bot_active BOOLEAN DEFAULT false,
  licence_expiry DATE,
  google_sheet_url TEXT,
  data_source VARCHAR(20) DEFAULT 'sheet',
  manual_prompt TEXT,
  gemini_api_key TEXT,
  gemini_model VARCHAR(100) DEFAULT 'gemini-flash-lite',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_settings (
  id SERIAL PRIMARY KEY,
  profile_id VARCHAR(100) REFERENCES profiles(profile_id) ON DELETE CASCADE,
  admin_phones TEXT[] DEFAULT '{}',
  reply_delay_min INT DEFAULT 2,
  reply_delay_max INT DEFAULT 5,
  bulk_delay_min INT DEFAULT 30,
  bulk_delay_max INT DEFAULT 60,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  profile_id VARCHAR(100) REFERENCES profiles(profile_id) ON DELETE CASCADE,
  customer_phone VARCHAR(50) NOT NULL,
  last_message TEXT,
  last_message_time TIMESTAMP,
  flow_state VARCHAR(100),
  complaint_id VARCHAR(50),
  complaint_status VARCHAR(20),
  human_takeover BOOLEAN DEFAULT false,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('in', 'out')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  profile_id VARCHAR(100) REFERENCES profiles(profile_id) ON DELETE CASCADE,
  record_type VARCHAR(50) DEFAULT 'complaint',
  customer_phone VARCHAR(50),
  username VARCHAR(100),
  area VARCHAR(100),
  issue TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pending_actions (
  id SERIAL PRIMARY KEY,
  profile_id VARCHAR(100) REFERENCES profiles(profile_id) ON DELETE CASCADE,
  customer_phone VARCHAR(50),
  reason TEXT,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auto_forward_rules (
  id SERIAL PRIMARY KEY,
  profile_id VARCHAR(100) REFERENCES profiles(profile_id) ON DELETE CASCADE,
  tag_name VARCHAR(100),
  tag_keyword VARCHAR(100),
  destination_group VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blacklist (
  id SERIAL PRIMARY KEY,
  profile_id VARCHAR(100) REFERENCES profiles(profile_id) ON DELETE CASCADE,
  phone_number VARCHAR(50),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id SERIAL PRIMARY KEY,
  profile_id VARCHAR(100) REFERENCES profiles(profile_id) ON DELETE CASCADE,
  entry_type VARCHAR(20) DEFAULT 'auto' CHECK (entry_type IN ('auto', 'taught')),
  question TEXT,
  answer TEXT,
  source_conversation_id INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_audit (
  id SERIAL PRIMARY KEY,
  profile_id VARCHAR(100) REFERENCES profiles(profile_id) ON DELETE CASCADE,
  admin_phone VARCHAR(50),
  action_type VARCHAR(50),
  username VARCHAR(100),
  old_expiry DATE,
  new_expiry DATE,
  amount INT,
  package_old VARCHAR(100),
  package_new VARCHAR(100),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'success',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default admin user (password: admin123 — change immediately)
INSERT INTO admin_users (username, password_hash, role)
VALUES ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (username) DO NOTHING;
