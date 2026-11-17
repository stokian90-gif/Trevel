/*
# Seed rute awal Travel Indramayu

1. Isi Data
- Menambahkan 4 rute bawaan jika belum ada (dicek per kombinasi origin+destination):
  Indramayu-Haurgeulis 20000/25000/35000
  Indramayu-Jakarta 120000/150000/200000
  Indramayu-Bandung 100000/125000/160000
  Indramayu-Cirebon 35000/45000/60000
2. Catatan
- Idempotent: hanya INSERT ketika rute belum ada.
*/

INSERT INTO routes (origin, destination, price_economy, price_comfort, price_premium)
SELECT v.origin, v.destination, v.e, v.c, v.p
FROM (VALUES
  ('Indramayu','Haurgeulis', 20000, 25000, 35000),
  ('Indramayu','Jakarta', 120000, 150000, 200000),
  ('Indramayu','Bandung', 100000, 125000, 160000),
  ('Indramayu','Cirebon', 35000, 45000, 60000)
) AS v(origin, destination, e, c, p)
WHERE NOT EXISTS (
  SELECT 1 FROM routes r WHERE r.origin = v.origin AND r.destination = v.destination
);