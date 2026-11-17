import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Car,
  CheckCircle2,
  LogOut,
  MapPin,
  MessageSquare,
  Navigation,
  Search,
  Siren,
  Star,
  Ticket,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  CAR_TYPES,
  CarType,
  MessageRow,
  OrderRow,
  RouteRow,
  UserRow,
  formatRupiah,
  getErrorMessage,
  mapsLink,
  priceForRoute,
} from '@/lib/types';
import { Btn, ErrorBox, Field, MiniMap, Modal, StarRating, Toast } from '@/components/ui';
import LeafletMap from '@/components/LeafletMap';
import { useTravelSettings } from '@/lib/settings';

const SUB_PRICE = 450000;

export default function CustomerApp({ onLogout }: { onLogout: () => void }) {
  const [user, setUser] = useState<UserRow | null>(null);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);

  // form login
  const [name, setName] = useState('');
  const [wa, setWa] = useState('');
  const [city, setCity] = useState('Indramayu');

  // form booking
  const [routeId, setRouteId] = useState('');
  const [carType, setCarType] = useState<CarType>('Ekonomi');
  const [pickup, setPickup] = useState('');
  const [payment, setPayment] = useState('Tunai');
  const [carpool, setCarpool] = useState(false);
  const [useSub, setUseSub] = useState(false);

  const [chatOrder, setChatOrder] = useState<OrderRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [chatText, setChatText] = useState('');
  const [rateOrder, setRateOrder] = useState<OrderRow | null>(null);
  const [stars, setStars] = useState(5);
  const [sosOpen, setSosOpen] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const appSettings = useTravelSettings();

  const loadAll = useCallback(async (u: UserRow) => {
    try {
      const [r1, r2] = await Promise.all([
        supabase.from('routes').select('*').eq('is_active', true).order('origin'),
        supabase
          .from('orders')
          .select('*, drivers(name, plate)')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (r1.error || r2.error) throw new Error('x');
      setRoutes(r1.data as RouteRow[]);
      const rows = ((r2.data as unknown as (OrderRow & { drivers?: { name: string; plate: string } | null })[]) || []).map((row) => ({
        ...row,
        driver_name: row.drivers?.name ?? null,
        driver_plate: row.drivers?.plate ?? null,
      }));
      setOrders(rows);
      setError('');
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('ti_customer');
    if (!saved) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error: e } = await supabase.from('users').select('*').eq('id', saved).maybeSingle();
        if (e || !data) throw new Error('x');
        setUser(data as UserRow);
        await loadAll(data as UserRow);
      } catch {
        localStorage.removeItem('ti_customer');
        setError('Koneksi bermasalah, coba lagi');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadAll]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('customer-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        if (user) loadAll(user);
        if (chatOrder) loadMessages(chatOrder.id);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, loadAll, chatOrder]);

  const login = async () => {
    if (name.trim().length < 3) return setError('Nama minimal 3 huruf');
    if (!/^0\d{9,13}$/.test(wa.replace(/[\s-]/g, ''))) return setError('Nomor WhatsApp tidak valid (contoh: 081234567890)');
    if (city.trim().length < 3) return setError('Kota jemput wajib diisi');
    setError('');
    try {
      const { data, error: e } = await supabase
        .from('users')
        .insert({ name: name.trim(), whatsapp: wa.replace(/[\s-]/g, ''), city: city.trim() })
        .select()
        .single();
      if (e || !data) throw new Error('x');
      const u = data as UserRow;
      setUser(u);
      localStorage.setItem('ti_customer', u.id);
      await loadAll(u);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const logout = () => {
    localStorage.removeItem('ti_customer');
    onLogout();
  };

  const selectedRoute = routes.find((r) => r.id === routeId) || null;
  const basePrice = priceForRoute(selectedRoute, carType);
  const normalPrice = selectedRoute ? (carType === 'Premium' ? selectedRoute.price_premium : carType === 'Nyaman' ? selectedRoute.price_comfort : selectedRoute.price_economy) : 0;
  const isRush = basePrice > normalPrice;
  const finalPrice = useSub && (user?.subscription_trips ?? 0) > 0 ? 0 : carpool ? Math.round((basePrice * 0.6) / 500) * 500 : basePrice;

  const activeOrder = orders.find((o) => !['Sampai', 'Dibatalkan'].includes(o.status)) || null;
  const pastOrders = orders.filter((o) => ['Sampai', 'Dibatalkan'].includes(o.status));

  const book = async () => {
    if (!selectedRoute) return setError('Pilih rute terlebih dahulu');
    if (pickup.trim().length < 3) return setError('Alamat titik jemput wajib diisi');
    if (!user) return;
    setError('');
    try {
      const patch: Partial<UserRow> = {};
      if (useSub && user.subscription_trips > 0) patch.subscription_trips = user.subscription_trips - 1;
      const { data, error: e } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          route_id: selectedRoute.id,
          customer_name: user.name,
          customer_phone: user.whatsapp,
          pickup: pickup.trim(),
          destination: selectedRoute.destination,
          car_type: carType,
          price: finalPrice,
          payment_method: payment,
          is_carpool: carpool,
          status: 'Mencari Driver',
        })
        .select()
        .single();
      if (e || !data) throw new Error('x');
      if (Object.keys(patch).length > 0) {
        await supabase.from('users').update(patch).eq('id', user.id);
        setUser({ ...user, ...patch } as UserRow);
      }
      setToast('Pesanan dikirim! Mencari driver terdekat...');
      setRouteId('');
      setPickup('');
      await loadAll(user);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const buySubscription = async () => {
    if (!user) return;
    try {
      const { data, error: e } = await supabase
        .from('users')
        .update({ subscription_trips: user.subscription_trips + 10 })
        .eq('id', user.id)
        .select()
        .single();
      if (e || !data) throw new Error('x');
      setUser(data as UserRow);
      setToast('Langganan 10 trip aktif! Hemat tiap perjalanan.');
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const cancelOrder = async (o: OrderRow) => {
    try {
      await supabase.from('orders').update({ status: 'Dibatalkan' }).eq('id', o.id);
      setToast('Pesanan dibatalkan');
      if (user) loadAll(user);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const loadMessages = useCallback(async (orderId: string) => {
    try {
      const { data, error: e } = await supabase
        .from('messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at');
      if (e) throw new Error('x');
      setMessages((data as MessageRow[]) || []);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  }, []);

  useEffect(() => {
    if (chatOrder) loadMessages(chatOrder.id);
  }, [chatOrder, loadMessages]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight });
  }, [messages]);

  const sendChat = async () => {
    if (!chatOrder || chatText.trim().length === 0) return;
    try {
      await supabase.from('messages').insert({ order_id: chatOrder.id, sender: 'Customer', body: chatText.trim() });
      setChatText('');
      loadMessages(chatOrder.id);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const submitRating = async () => {
    if (!rateOrder) return;
    try {
      await supabase.from('orders').update({ rating: stars }).eq('id', rateOrder.id);
      if (rateOrder.driver_id) {
        const { data: drv } = await supabase.from('drivers').select('rating').eq('id', rateOrder.driver_id).maybeSingle();
        if (drv) {
          const newRating = (Number(drv.rating) * 4 + stars) / 5;
          await supabase.from('drivers').update({ rating: Number(newRating.toFixed(2)) }).eq('id', rateOrder.driver_id);
        }
      }
      setRateOrder(null);
      setToast('Terima kasih atas penilaiannya!');
      if (user) loadAll(user);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Memuat...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-800 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7">
          <Car className="text-emerald-600 mx-auto mb-2" size={40} />
          <h2 className="text-xl font-bold text-center text-slate-800 mb-1">Masuk Customer</h2>
          <p className="text-xs text-slate-500 text-center mb-5">Cukup nama & nomor WhatsApp, tanpa ribet</p>
          <div className="space-y-3">
            <Field label="Nama Lengkap" value={name} onChange={setName} placeholder="Contoh: Budi Santoso" />
            <Field label="Nomor WhatsApp" value={wa} onChange={setWa} placeholder="081234567890" />
            <Field label="Kota Jemput" value={city} onChange={setCity} placeholder="Indramayu" />
            <ErrorBox message={error} />
            <Btn onClick={login} className="w-full">Masuk & Mulai Pesan</Btn>
            <button onClick={onLogout} className="w-full text-xs text-slate-400 hover:text-slate-600 py-2">
              Kembali ke halaman utama
            </button>
          </div>
        </div>
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      {appSettings.banner && (
        <div className="max-w-md mx-auto px-4 pt-4">
          <img src={appSettings.banner} alt="Banner" className="w-full h-32 object-cover rounded-2xl shadow-md" />
        </div>
      )}
      <header className="bg-emerald-700 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div>
          <h1 className="font-bold leading-tight">{appSettings.travelName}</h1>
          <p className="text-[11px] text-emerald-200">{appSettings.tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSosOpen(true)} className="bg-red-600 hover:bg-red-500 animate-pulse-slow px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1">
            <Siren size={14} /> SOS
          </button>
          <button onClick={logout} className="bg-white/15 hover:bg-white/25 p-2 rounded-xl" title="Keluar">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        <ErrorBox message={error} onRetry={() => user && loadAll(user)} />

        {activeOrder ? (
          <ActiveOrderCard
            order={activeOrder}
            onChat={() => setChatOrder(activeOrder)}
            onCancel={() => cancelOrder(activeOrder)}
            onRate={() => setRateOrder(activeOrder)}
          />
        ) : (
          <section className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Search size={18} className="text-emerald-600" /> Cari Rute
            </h2>

            <LeafletMap destination={selectedRoute?.destination ?? null} height={220} />

            <div>
              <span className="block text-xs font-semibold text-slate-600 mb-1.5">Rute Tujuan</span>
              {routes.length === 0 ? (
                <p className="text-sm text-slate-400">Belum ada rute tersedia</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {routes.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setRouteId(r.id)}
                      className={`text-left px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition ${
                        routeId === r.id ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600 hover:border-emerald-300'
                      }`}
                    >
                      <MapPin size={12} className="inline mr-1 text-emerald-600" />
                      {r.origin} - {r.destination}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis Mobil</span>
              <div className="grid grid-cols-3 gap-2">
                {CAR_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setCarType(t)}
                    className={`py-2.5 rounded-xl border-2 text-xs font-bold transition ${
                      carType === t ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                    }`}
                  >
                    {t}
                    <span className="block text-[10px] font-normal text-slate-400">{formatRupiah(priceForRoute(selectedRoute, t))}</span>
                  </button>
                ))}
              </div>
            </div>

            <Field label="Titik Jemput (alamat lengkap)" value={pickup} onChange={setPickup} placeholder="Contoh: Jl. Monsopulan No. 10" />

            <div>
              <span className="block text-xs font-semibold text-slate-600 mb-1.5">Metode Bayar</span>
              <div className="grid grid-cols-3 gap-2">
                {['Tunai', 'Transfer', 'QRIS'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPayment(p)}
                    className={`py-2.5 rounded-xl border-2 text-xs font-bold transition ${
                      payment === p ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500 hover:border-emerald-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={carpool} onChange={(e) => setCarpool(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
              <Users size={15} className="text-emerald-600" /> Carpool / Patungan (hemat 40%)
            </label>

            {user.subscription_trips > 0 && (
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={useSub} onChange={(e) => setUseSub(e.target.checked)} className="w-4 h-4 accent-emerald-600" />
                <Ticket size={15} className="text-emerald-600" /> Pakai langganan ({user.subscription_trips} trip tersisa, gratis)
              </label>
            )}

            <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3">
              <span className="text-sm text-slate-600">Total Harga</span>
              <span className="text-xl font-bold text-emerald-700">{finalPrice === 0 ? 'GRATIS (Langganan)' : formatRupiah(finalPrice)}</span>
            </div>
            {isRush && finalPrice !== 0 && (
              <p className="text-[11px] text-amber-600 -mt-2">Harga jam sibuk diterapkan. Harga normal: {formatRupiah(normalPrice)}</p>
            )}
            {carpool && finalPrice !== 0 && (
              <p className="text-[11px] text-sky-600 -mt-2">Diskon carpool 40% sudah dihitung.</p>
            )}

            <Btn onClick={book} className="w-full" disabled={!routeId}>
              Pesan Sekarang
            </Btn>

            <button
              onClick={buySubscription}
              className="w-full border-2 border-dashed border-emerald-300 rounded-xl py-3 text-xs text-emerald-700 font-semibold hover:bg-emerald-50 transition"
            >
              <Ticket size={14} className="inline mr-1" /> Beli Paket Langganan 10 Trip - {formatRupiah(SUB_PRICE)} (hemat 25%)
            </button>
          </section>
        )}

        {pastOrders.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Star size={18} className="text-amber-500" /> Riwayat Perjalanan
            </h2>
            <div className="space-y-2">
              {pastOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="font-semibold text-slate-700">{o.pickup} - {o.destination}</p>
                    <p className="text-slate-400">{new Date(o.created_at).toLocaleDateString('id-ID')} - {o.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-700">{formatRupiah(o.price)}</p>
                    {o.rating ? (
                      <p className="text-amber-500">{'*'.repeat(o.rating)}</p>
                    ) : o.status === 'Sampai' ? (
                      <button onClick={() => setRateOrder(o)} className="text-emerald-600 underline font-semibold">
                        Beri rating
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {chatOrder && (
        <Modal title={`Chat dengan Driver - ${chatOrder.driver_name || 'Menunggu driver'}`} onClose={() => setChatOrder(null)}>
          <div ref={chatRef} className="h-64 overflow-y-auto space-y-2 mb-3 bg-slate-50 rounded-xl p-3">
            {messages.length === 0 && <p className="text-xs text-slate-400 text-center pt-10">Belum ada pesan</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === 'Customer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.sender === 'Customer' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 shadow-sm'}`}>
                  {m.body}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="Tulis pesan..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <Btn onClick={sendChat}>Kirim</Btn>
          </div>
        </Modal>
      )}

      {rateOrder && (
        <Modal title="Beri Rating Driver" onClose={() => setRateOrder(null)}>
          <div className="flex flex-col items-center gap-4 py-4">
            <StarRating value={stars} onChange={setStars} />
            <p className="text-sm text-slate-500">{stars} bintang - Terima kasih!</p>
            <Btn onClick={submitRating} className="w-full">Kirim Rating</Btn>
          </div>
        </Modal>
      )}

      {sosOpen && (
        <Modal title="Tombol SOS - Daruranan" onClose={() => setSosOpen(false)}>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">Tekan salah satu nomor darurat di bawah. Lokasi Anda: {user.city}.</p>
            <a href="tel:110" className="block bg-red-600 text-white text-center font-bold py-3 rounded-xl hover:bg-red-700">Polisi - 110</a>
            <a href="tel:119" className="block bg-rose-500 text-white text-center font-bold py-3 rounded-xl hover:bg-rose-600">Ambulans - 119</a>
            <a href="tel:112" className="block bg-slate-800 text-white text-center font-bold py-3 rounded-xl hover:bg-slate-900">Darurat Umum - 112</a>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}

function ActiveOrderCard({
  order,
  onChat,
  onCancel,
  onRate,
}: {
  order: OrderRow;
  onChat: () => void;
  onCancel: () => void;
  onRate: () => void;
}) {
  const steps = ['Mencari Driver', 'Driver OTW', 'Driver Tiba', 'Dalam Perjalanan', 'Sampai'];
  const stepIdx = steps.indexOf(order.status);
  const [progress, setProgress] = useState(stepIdx <= 0 ? 0 : 0.5);

  useEffect(() => {
    let start = performance.now();
    const from = stepIdx <= 1 ? 0 : stepIdx === 2 ? 0.5 : 0.5;
    const to = stepIdx <= 1 ? 0.5 : stepIdx === 2 ? 0.5 : 1;
    setProgress(from);
    let raf: number;
    const tick = (t: number) => {
      const el = (t - start) / 1000;
      const p = Math.min(to, from + el * 0.02);
      setProgress(p);
      if (p < to) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stepIdx, order.id]);

  return (
    <section className="bg-white rounded-2xl shadow-md p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-800">Pesanan Aktif</h2>
        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">{order.status}</span>
      </div>

      <MiniMap progress={progress} label={order.status === 'Mencari Driver' ? 'Mencari driver terdekat...' : 'Posisi driver live'} />

      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= stepIdx ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            <p className={`text-[8px] mt-1 font-semibold ${i <= stepIdx ? 'text-emerald-700' : 'text-slate-400'}`}>{s}</p>
          </div>
        ))}
      </div>

      <div className="text-sm space-y-1 text-slate-600">
        <p><MapPin size={13} className="inline mr-1 text-emerald-600" />{order.pickup} <span className="text-slate-300">→</span> {order.destination}</p>
        <p>Armada: {order.car_type} - {formatRupiah(order.price)} ({order.payment_method}){order.is_carpool ? ' - Carpool' : ''}</p>
        {order.driver_name && <p>Driver: <b>{order.driver_name}</b> ({order.driver_plate || '-'})</p>}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {order.driver_plate && (
          <a href={mapsLink(order.pickup)} target="_blank" rel="noreferrer" className="col-span-2">
            <span className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2.5 rounded-xl transition">
              <Navigation size={15} /> Lihat Titik Jemput di Maps
            </span>
          </a>
        )}
        <Btn variant="ghost" onClick={onChat} className="!text-slate-700 !bg-slate-100 flex items-center justify-center gap-2">
          <MessageSquare size={15} /> Chat Driver
        </Btn>
        {order.status === 'Sampai' ? (
          <Btn variant="warning" onClick={onRate} className="flex items-center justify-center gap-2">
            <Star size={15} /> Beri Rating
          </Btn>
        ) : (
          <Btn variant="danger" onClick={onCancel}>Batalkan</Btn>
        )}
      </div>
    </section>
  );
}
