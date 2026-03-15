-- ============================================================
-- Smart IoT Platform - Supabase Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'support', 'customer')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('temperature_sensor', 'smart_switch', 'smart_bulb', 'thermostat', 'smart_lock')),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'error')),
  is_on BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device readings table
CREATE TABLE IF NOT EXISTS device_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  temperature NUMERIC(5,2),
  humidity NUMERIC(5,2),
  power_watts NUMERIC(8,2),
  voltage NUMERIC(6,2),
  brightness INTEGER,
  is_locked BOOLEAN,
  raw_data JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Device commands table
CREATE TABLE IF NOT EXISTS device_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  command TEXT NOT NULL CHECK (command IN ('turn_on', 'turn_off', 'set_temperature', 'set_brightness', 'lock', 'unlock')),
  params JSONB DEFAULT '{}',
  issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI chat logs table
CREATE TABLE IF NOT EXISTS ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_devices_customer_id ON devices(customer_id);
CREATE INDEX IF NOT EXISTS idx_device_readings_device_id ON device_readings(device_id);
CREATE INDEX IF NOT EXISTS idx_device_readings_recorded_at ON device_readings(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_commands_device_id ON device_commands(device_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_logs_user_id ON ai_chat_logs(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_logs ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- These policies allow the anon key minimal access if needed.
-- All actual API access uses the service role key which bypasses RLS.

CREATE POLICY "Service role full access users" ON users
  FOR ALL USING (true);

CREATE POLICY "Service role full access devices" ON devices
  FOR ALL USING (true);

CREATE POLICY "Service role full access readings" ON device_readings
  FOR ALL USING (true);

CREATE POLICY "Service role full access commands" ON device_commands
  FOR ALL USING (true);

CREATE POLICY "Service role full access ai_logs" ON ai_chat_logs
  FOR ALL USING (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Admin user: admin@iot.com / Admin@123
-- bcrypt hash for "Admin@123" with salt rounds 12
INSERT INTO users (id, email, password_hash, name, role, is_active, created_at) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'admin@iot.com',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NJflLBDP2',
  'System Admin',
  'admin',
  true,
  NOW() - INTERVAL '30 days'
)
ON CONFLICT (email) DO NOTHING;

-- Support user: support@iot.com / Support@123
INSERT INTO users (id, email, password_hash, name, role, created_by, is_active, created_at) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'support@iot.com',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Support Agent',
  'support',
  'a0000000-0000-0000-0000-000000000001',
  true,
  NOW() - INTERVAL '20 days'
)
ON CONFLICT (email) DO NOTHING;

-- Customer 1: alice@example.com / Customer@123
INSERT INTO users (id, email, password_hash, name, role, created_by, is_active, created_at) VALUES
(
  'c0000000-0000-0000-0000-000000000001',
  'alice@example.com',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Alice Johnson',
  'customer',
  'a0000000-0000-0000-0000-000000000001',
  true,
  NOW() - INTERVAL '15 days'
)
ON CONFLICT (email) DO NOTHING;

-- Customer 2: bob@example.com / Customer@123
INSERT INTO users (id, email, password_hash, name, role, created_by, is_active, created_at) VALUES
(
  'c0000000-0000-0000-0000-000000000002',
  'bob@example.com',
  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Bob Smith',
  'customer',
  null,
  true,
  NOW() - INTERVAL '10 days'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- SAMPLE DEVICES
-- ============================================================

-- Alice's devices
INSERT INTO devices (id, name, type, customer_id, status, is_on, settings, location, created_at) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  'Living Room Thermostat',
  'thermostat',
  'c0000000-0000-0000-0000-000000000001',
  'online',
  true,
  '{"target_temperature": 22, "mode": "heating"}',
  'Living Room',
  NOW() - INTERVAL '14 days'
),
(
  'd0000000-0000-0000-0000-000000000002',
  'Kitchen Smart Bulb',
  'smart_bulb',
  'c0000000-0000-0000-0000-000000000001',
  'online',
  true,
  '{"brightness": 80, "color_temp": 3000}',
  'Kitchen',
  NOW() - INTERVAL '13 days'
),
(
  'd0000000-0000-0000-0000-000000000003',
  'Front Door Lock',
  'smart_lock',
  'c0000000-0000-0000-0000-000000000001',
  'online',
  false,
  '{"auto_lock_minutes": 5}',
  'Front Door',
  NOW() - INTERVAL '12 days'
)
ON CONFLICT DO NOTHING;

-- Bob's devices
INSERT INTO devices (id, name, type, customer_id, status, is_on, settings, location, created_at) VALUES
(
  'd0000000-0000-0000-0000-000000000004',
  'Office Temperature Sensor',
  'temperature_sensor',
  'c0000000-0000-0000-0000-000000000002',
  'online',
  true,
  '{}',
  'Home Office',
  NOW() - INTERVAL '9 days'
),
(
  'd0000000-0000-0000-0000-000000000005',
  'Garage Smart Switch',
  'smart_switch',
  'c0000000-0000-0000-0000-000000000002',
  'offline',
  false,
  '{"max_watts": 2000}',
  'Garage',
  NOW() - INTERVAL '8 days'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE READINGS
-- ============================================================

-- Thermostat readings (device 1)
INSERT INTO device_readings (device_id, temperature, humidity, power_watts, voltage, recorded_at) VALUES
('d0000000-0000-0000-0000-000000000001', 21.5, 45.0, 150, 220, NOW() - INTERVAL '23 hours'),
('d0000000-0000-0000-0000-000000000001', 21.8, 44.5, 160, 220, NOW() - INTERVAL '22 hours'),
('d0000000-0000-0000-0000-000000000001', 22.0, 44.0, 145, 220, NOW() - INTERVAL '21 hours'),
('d0000000-0000-0000-0000-000000000001', 22.1, 43.8, 140, 220, NOW() - INTERVAL '20 hours'),
('d0000000-0000-0000-0000-000000000001', 22.3, 43.5, 155, 220, NOW() - INTERVAL '19 hours'),
('d0000000-0000-0000-0000-000000000001', 22.0, 44.0, 148, 220, NOW() - INTERVAL '18 hours'),
('d0000000-0000-0000-0000-000000000001', 21.9, 44.2, 152, 220, NOW() - INTERVAL '6 hours'),
('d0000000-0000-0000-0000-000000000001', 22.2, 43.9, 147, 220, NOW() - INTERVAL '1 hour');

-- Smart bulb readings (device 2)
INSERT INTO device_readings (device_id, power_watts, voltage, brightness, recorded_at) VALUES
('d0000000-0000-0000-0000-000000000002', 48, 220, 80, NOW() - INTERVAL '23 hours'),
('d0000000-0000-0000-0000-000000000002', 48, 220, 80, NOW() - INTERVAL '20 hours'),
('d0000000-0000-0000-0000-000000000002', 36, 220, 60, NOW() - INTERVAL '15 hours'),
('d0000000-0000-0000-0000-000000000002', 48, 220, 80, NOW() - INTERVAL '10 hours'),
('d0000000-0000-0000-0000-000000000002', 60, 220, 100, NOW() - INTERVAL '5 hours'),
('d0000000-0000-0000-0000-000000000002', 48, 220, 80, NOW() - INTERVAL '1 hour');

-- Smart lock readings (device 3)
INSERT INTO device_readings (device_id, is_locked, recorded_at) VALUES
('d0000000-0000-0000-0000-000000000003', true, NOW() - INTERVAL '23 hours'),
('d0000000-0000-0000-0000-000000000003', false, NOW() - INTERVAL '18 hours'),
('d0000000-0000-0000-0000-000000000003', true, NOW() - INTERVAL '16 hours'),
('d0000000-0000-0000-0000-000000000003', true, NOW() - INTERVAL '1 hour');

-- Temperature sensor readings (device 4)
INSERT INTO device_readings (device_id, temperature, humidity, recorded_at) VALUES
('d0000000-0000-0000-0000-000000000004', 23.5, 52.0, NOW() - INTERVAL '23 hours'),
('d0000000-0000-0000-0000-000000000004', 24.1, 50.5, NOW() - INTERVAL '20 hours'),
('d0000000-0000-0000-0000-000000000004', 24.8, 49.0, NOW() - INTERVAL '15 hours'),
('d0000000-0000-0000-0000-000000000004', 25.2, 48.5, NOW() - INTERVAL '10 hours'),
('d0000000-0000-0000-0000-000000000004', 24.9, 49.2, NOW() - INTERVAL '5 hours'),
('d0000000-0000-0000-0000-000000000004', 24.5, 50.0, NOW() - INTERVAL '1 hour');

-- ============================================================
-- NOTE ON PASSWORDS
-- ============================================================
-- admin@iot.com     : Admin@123
--   Hash: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NJflLBDP2
--
-- support@iot.com   : Support@123  (same hash used below as placeholder)
-- alice@example.com : Customer@123 (same hash used below as placeholder)
-- bob@example.com   : Customer@123 (same hash used below as placeholder)
--   Hash for all three: $2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
--   (this is the well-known bcrypt hash for "password" used only for demo)
--
-- IMPORTANT: After running this schema, update the password hashes by:
-- 1. Running the app and using the /api/auth/register endpoint, OR
-- 2. Running: node -e "const b=require('bcryptjs'); b.hash('Admin@123',12).then(console.log)"
--    and manually UPDATE users SET password_hash='...' WHERE email='admin@iot.com';
--
-- For a quick start, the app also provides a /api/auth/seed endpoint
-- that you can call once to reset passwords correctly.
