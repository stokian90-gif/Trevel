export interface UserRow {
  id: string;
  name: string;
  whatsapp: string;
  city: string;
  subscription_trips: number;
  created_at: string;
}

export interface DriverRow {
  id: string;
  name: string;
  phone: string;
  driver_code: string;
  sim: string;
  plate: string;
  password: string;
  is_online: boolean;
  wallet: number;
  rating: number;
  trips_today: number;
  bonus_date: string | null;
  created_at: string;
}

export interface RouteRow {
  id: string;
  origin: string;
  destination: string;
  price_economy: number;
  price_comfort: number;
  price_premium: number;
  is_active: boolean;
}

export interface OrderRow {
  id: string;
  user_id: string | null;
  driver_id: string | null;
  route_id: string | null;
  customer_name: string;
  customer_phone: string;
  pickup: string;
  destination: string;
  car_type: string;
  price: number;
  payment_method: string;
  status: string;
  is_carpool: boolean;
  rating: number | null;
  created_at: string;
  driver_name?: string | null;
  driver_plate?: string | null;
}

export interface MessageRow {
  id: string;
  order_id: string;
  sender: string;
  body: string;
  created_at: string;
}

export const CAR_TYPES = ['Ekonomi', 'Nyaman', 'Premium'] as const;
export type CarType = (typeof CAR_TYPES)[number];

export const ORDER_STATUSES = [
  'Mencari Driver',
  'Driver OTW',
  'Driver Tiba',
  'Dalam Perjalanan',
  'Sampai',
  'Dibatalkan',
] as const;

export function priceForRoute(route: RouteRow | null | undefined, carType: CarType): number {
  if (!route) return 0;
  const base =
    carType === 'Premium'
      ? route.price_premium
      : carType === 'Nyaman'
        ? route.price_comfort
        : route.price_economy;
  return rushPrice(base);
}

// Harga dinamis jam sibuk: 07-09 dan 16-19 naik 15%
export function rushPrice(base: number, hour?: number): number {
  const h = hour ?? new Date().getHours();
  const rush = (h >= 7 && h < 9) || (h >= 16 && h < 19);
  return rush ? Math.round((base * 1.15) / 500) * 500 : base;
}

export function formatRupiah(n: number): string {
  return 'Rp ' + n.toLocaleString('id-ID');
}

// Ambil tautan google maps ke titik jemput
export function mapsLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getErrorMessage(err: unknown): string {
  return 'Koneksi bermasalah, coba lagi';
}
