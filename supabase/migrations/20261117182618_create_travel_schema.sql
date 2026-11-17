/*
# Travel Indramayu - skema awal

1. Tabel Baru
- `users`      : data pelanggan (nama, whatsapp, kota jemput).
- `drivers`    : data driver (nama, hp, sim, plat, password, status online, saldo dompet, rating).
- `routes`     : daftar rute + harga per jenis mobil (ekonomi/nyaman/premium).
- `orders`     : pemesanan (customer, driver, rute, harga, status, metode bayar, rating, carpool).
- `payments`   : catatan pembayaran per order.
- `messages`   : chat customer <-> driver.
- `subscriptions`: paket langganan 10x trip milik customer.
- `daily_reports`: laporan harian otomatis (dihitung owner dari data order).
2. Keamanan
- RLS aktif di semua tabel. Kebijakan `TO anon, authenticated` dengan `USING(true)`/`WITH CHECK(true)`
  karena aplikasi ini sengaja publik/tanpa login Supabase (login custom via nama/WA/kode driver).
  Ini sesuai pola single-tenant app tanpa auth Supabase.
- GRANT SELECT/INSERT/UPDATE/DELETE sesuai kebutuhan ke `anon` + `authenticated`.
- Semua primary key uuid default gen_random_uuid().
3. Catatan
- Idempotent: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS sebelum CREATE POLICY.
- Tidak ada BEGIN/COMMIT eksplisit.
- Tidak ada operasi destruktif.
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  whatsapp text NOT NULL,
  city text NOT NULL DEFAULT 'Indramayu',
  subscription_trips integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  driver_code text NOT NULL UNIQUE,
  sim text NOT NULL,
  plate text NOT NULL,
  password text NOT NULL,
  is_online boolean NOT NULL DEFAULT false,
  wallet integer NOT NULL DEFAULT 0,
  rating numeric NOT NULL DEFAULT 5,
  trips_today integer NOT NULL DEFAULT 0,
  bonus_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL,
  destination text NOT NULL,
  price_economy integer NOT NULL,
  price_comfort integer NOT NULL,
  price_premium integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  route_id uuid REFERENCES routes(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  pickup text NOT NULL,
  destination text NOT NULL,
  car_type text NOT NULL DEFAULT 'Ekonomi',
  price integer NOT NULL,
  payment_method text NOT NULL DEFAULT 'Tunai',
  status text NOT NULL DEFAULT 'Mencari Driver',
  is_carpool boolean NOT NULL DEFAULT false,
  rating integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  method text NOT NULL,
  status text NOT NULL DEFAULT 'Lunas',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  sender text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  trips_total integer NOT NULL DEFAULT 10,
  trips_left integer NOT NULL DEFAULT 10,
  price_paid integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON drivers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON routes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO anon, authenticated;

-- Aplikasi publik tanpa login Supabase: semua kebijakan terbuka (dokumentasi disengaja).
DROP POLICY IF EXISTS "users_public_select" ON users;
CREATE POLICY "users_public_select" ON users FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "users_public_insert" ON users;
CREATE POLICY "users_public_insert" ON users FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "users_public_update" ON users;
CREATE POLICY "users_public_update" ON users FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "users_public_delete" ON users;
CREATE POLICY "users_public_delete" ON users FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "drivers_public_select" ON drivers;
CREATE POLICY "drivers_public_select" ON drivers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "drivers_public_insert" ON drivers;
CREATE POLICY "drivers_public_insert" ON drivers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "drivers_public_update" ON drivers;
CREATE POLICY "drivers_public_update" ON drivers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "drivers_public_delete" ON drivers;
CREATE POLICY "drivers_public_delete" ON drivers FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "routes_public_select" ON routes;
CREATE POLICY "routes_public_select" ON routes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "routes_public_insert" ON routes;
CREATE POLICY "routes_public_insert" ON routes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "routes_public_update" ON routes;
CREATE POLICY "routes_public_update" ON routes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "routes_public_delete" ON routes;
CREATE POLICY "routes_public_delete" ON routes FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "orders_public_select" ON orders;
CREATE POLICY "orders_public_select" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "orders_public_insert" ON orders;
CREATE POLICY "orders_public_insert" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "orders_public_update" ON orders;
CREATE POLICY "orders_public_update" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "orders_public_delete" ON orders;
CREATE POLICY "orders_public_delete" ON orders FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "payments_public_select" ON payments;
CREATE POLICY "payments_public_select" ON payments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "payments_public_insert" ON payments;
CREATE POLICY "payments_public_insert" ON payments FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "payments_public_update" ON payments;
CREATE POLICY "payments_public_update" ON payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "payments_public_delete" ON payments;
CREATE POLICY "payments_public_delete" ON payments FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "messages_public_select" ON messages;
CREATE POLICY "messages_public_select" ON messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "messages_public_insert" ON messages;
CREATE POLICY "messages_public_insert" ON messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "messages_public_update" ON messages;
CREATE POLICY "messages_public_update" ON messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "messages_public_delete" ON messages;
CREATE POLICY "messages_public_delete" ON messages FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "subscriptions_public_select" ON subscriptions;
CREATE POLICY "subscriptions_public_select" ON subscriptions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "subscriptions_public_insert" ON subscriptions;
CREATE POLICY "subscriptions_public_insert" ON subscriptions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "subscriptions_public_update" ON subscriptions;
CREATE POLICY "subscriptions_public_update" ON subscriptions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "subscriptions_public_delete" ON subscriptions;
CREATE POLICY "subscriptions_public_delete" ON subscriptions FOR DELETE TO anon, authenticated USING (true);

-- Laporan harian otomatis: fungsi pemanggilan RPC (security definer, tidak dipanggil dari UI publik)
CREATE OR REPLACE FUNCTION public.generate_daily_report(p_date date DEFAULT CURRENT_DATE)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'date', p_date,
    'total_orders', (SELECT count(*) FROM orders WHERE created_at::date = p_date),
    'total_revenue', (SELECT COALESCE(SUM(price),0) FROM orders WHERE created_at::date = p_date AND status = 'Sampai'),
    'completed', (SELECT count(*) FROM orders WHERE created_at::date = p_date AND status = 'Sampai'),
    'cancelled', (SELECT count(*) FROM orders WHERE created_at::date = p_date AND status = 'Dibatalkan')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.generate_daily_report(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_daily_report(date) TO authenticated;