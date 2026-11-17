import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  DollarSign,
  LogOut,
  MapPin,
  Navigation,
  Phone,
  Power,
  Star,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  DriverRow,
  OrderRow,
  formatRupiah,
  getErrorMessage,
  mapsLink,
} from '@/lib/types';
import { Btn, ErrorBox, Field, MiniMap, Toast } from '@/components/ui';

const BONUS_PER_DAY = 25000;

export default function DriverApp({ onLogout }: { onLogout: () => void }) {
  const [driver, setDriver] = useState<DriverRow | null>(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRegister, setIsRegister] = useState(false);

  // login
  const [code, setCode] = useState('');
  const [pass, setPass] = useState('');
  // register
  const [rName, setRName] = useState('');
  const [rPhone, setRPhone] = useState('');
  const [rSim, setRSim] = useState('');
  const [rPlate, setRPlate] = useState('');

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [pending, setPending] = useState<{ order: OrderRow; expires: number } | null>(null);

  const loadOrders = useCallback(async (d: DriverRow) => {
    try {
      const { data, error: e } = await supabase
        .from('orders')
        .select('*')
        .or(`driver_id.eq.${d.id},and(status.eq.Mencari Driver,driver_id.is.null)`)
        .order('created_at', { ascending: false })
        .limit(30);
      if (e) throw new Error('x');
      setOrders((data as OrderRow[]) || []);
      setError('');
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('ti_driver');
    if (!saved) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const { data, error: e } = await supabase.from('drivers').select('*').eq('id', saved).maybeSingle();
        if (e || !data) throw new Error('x');
        setDriver(data as DriverRow);
        await loadOrders(data as DriverRow);
      } catch {
        localStorage.removeItem('ti_driver');
        setError('Koneksi bermasalah, coba lagi');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadOrders]);

  useEffect(() => {
    if (!driver) return;
    const ch = supabase
      .channel('driver-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders(driver))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => reloadDriver(driver.id))
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [driver, loadOrders]);

  // Auto-dispatch: order Mencari Driver tanpa driver masuk sebagai tawaran 30 detik
  useEffect(() => {
    if (!driver?.is_online || pending) return;
    const candidate = orders.find((o) => o.status === 'Mencari Driver' && !o.driver_id);
    if (candidate) setPending({ order: candidate, expires: Date.now() + 30000 });
  }, [orders, driver, pending]);

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => {
      setPending((p) => {
        if (!p) return null;
        if (Date.now() > p.expires) return null;
        return p;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [pending]);

  const reloadDriver = useCallback(async (id: string) => {
    try {
      const { data, error: e } = await supabase.from('drivers').select('*').eq('id', id).maybeSingle();
      if (e || !data) throw new Error('x');
      setDriver(data as DriverRow);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  }, []);

  const doLogin = async () => {
    if (code.trim().length < 3) return setError('Kode driver wajib diisi');
    if (pass.length < 4) return setError('Password minimal 4 karakter');
    setError('');
    try {
      const { data, error: e } = await supabase
        .from('drivers')
        .select('*')
        .eq('driver_code', code.trim())
        .eq('password', pass)
        .maybeSingle();
      if (e) throw new Error('x');
      if (!data) return setError('Kode driver atau password salah');
      const d = data as DriverRow;
      setDriver(d);
      localStorage.setItem('ti_driver', d.id);
      await loadOrders(d);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const doRegister = async () => {
    if (rName.trim().length < 3) return setError('Nama minimal 3 huruf');
    if (!/^0\d{9,13}$/.test(rPhone.replace(/[\s-]/g, ''))) return setError('Nomor HP tidak valid');
    if (rSim.trim().length < 5) return setError('No. SIM wajib diisi');
    if (rPlate.trim().length < 3) return setError('Plat mobil wajib diisi');
    setError('');
    try {
      const newCode = 'DRV' + Math.floor(1000 + Math.random() * 9000);
      const { data, error: e } = await supabase
        .from('drivers')
        .insert({
          name: rName.trim(),
          phone: rPhone.replace(/[\s-]/g, ''),
          driver_code: newCode,
          sim: rSim.trim(),
          plate: rPlate.trim().toUpperCase(),
          password: '1234',
        })
        .select()
        .single();
      if (e || !data) throw new Error('x');
      const d = data as DriverRow;
      setDriver(d);
      localStorage.setItem('ti_driver', d.id);
      setToast(`Pendaftaran berhasil! Kode driver Anda: ${newCode}, password: 1234`);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const toggleOnline = async () => {
    if (!driver) return;
    try {
      const { data, error: e } = await supabase
        .from('drivers')
        .update({ is_online: !driver.is_online })
        .eq('id', driver.id)
        .select()
        .single();
      if (e || !data) throw new Error('x');
      setDriver(data as DriverRow);
      setToast(data.is_online ? 'Anda ONLINE - order akan masuk otomatis' : 'Anda OFFLINE');
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const accept = async () => {
    if (!pending || !driver) return;
    const o = pending.order;
    setPending(null);
    try {
      const { data, error: e } = await supabase
        .from('orders')
        .update({ driver_id: driver.id, status: 'Driver OTW' })
        .eq('id', o.id)
        .eq('status', 'Mencari Driver')
        .select()
        .single();
      if (e) throw new Error('x');
      if (!data) {
        setToast('Order sudah diambil driver lain');
        return;
      }
      setToast('Order diterima! Menuju titik jemput.');
      await bumpTrips(driver);
      await loadOrders(driver);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const reject = () => {
    setPending(null);
    setToast('Order ditolak');
  };

  const bumpTrips = async (d: DriverRow) => {
    const newCount = d.trips_today + 1;
    const today = new Date().toISOString().slice(0, 10);
    const sameDay = d.bonus_date === today;
    const count = sameDay ? newCount : 1;
    try {
      await supabase
        .from('drivers')
        .update({ trips_today: count, bonus_date: today })
        .eq('id', d.id);
      if (count === 5) {
        await supabase
          .from('drivers')
          .update({ wallet: d.wallet + BONUS_PER_DAY })
          .eq('id', d.id);
        setToast('Selamat! Bonus Rp 25.000 karena 5 order hari ini!');
      }
      reloadDriver(d.id);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const advance = async (o: OrderRow) => {
    const flow = ['Mencari Driver', 'Driver OTW', 'Driver Tiba', 'Dalam Perjalanan', 'Sampai'];
    const idx = flow.indexOf(o.status);
    if (idx < 0 || idx >= flow.length - 1) return;
    const next = flow[idx + 1];
    try {
      const { error: e } = await supabase.from('orders').update({ status: next }).eq('id', o.id);
      if (e) throw new Error('x');
      if (next === 'Sampai') {
        await supabase.from('payments').insert({ order_id: o.id, amount: o.price, method: o.payment_method, status: 'Lunas' });
        setToast('Trip selesai! Pendapatan tercatat.');
      }
      if (driver) loadOrders(driver);
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500">Memuat...</div>;

  if (!driver) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-700 to-sky-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7">
          <h2 className="text-xl font-bold text-center text-slate-800 mb-1">
            {isRegister ? 'Daftar Driver Baru' : 'Masuk Driver'}
          </h2>
          <p className="text-xs text-slate-500 text-center mb-5">
            {isRegister ? 'Isi data diri & kendaraan Anda' : 'Masuk dengan kode driver & password'}
          </p>
          <div className="space-y-3">
            {isRegister ? (
              <>
                <Field label="Nama Lengkap" value={rName} onChange={setRName} placeholder="Nama Anda" />
                <Field label="No. HP" value={rPhone} onChange={setRPhone} placeholder="081234567890" />
                <Field label="No. SIM" value={rSim} onChange={setRSim} placeholder="No. SIM aktif" />
                <Field label="Plat Mobil" value={rPlate} onChange={setRPlate} placeholder="B 1234 AB" />
              </>
            ) : (
              <>
                <Field label="Kode Driver" value={code} onChange={setCode} placeholder="DRV1234" />
                <Field label="Password" value={pass} onChange={setPass} type="password" placeholder="Password Anda" />
              </>
            )}
            <ErrorBox message={error} />
            <Btn onClick={isRegister ? doRegister : doLogin} className="w-full">
              {isRegister ? 'Daftar Sekarang' : 'Masuk'}
            </Btn>
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="w-full text-xs text-sky-600 hover:text-sky-800 font-semibold py-2"
            >
              {isRegister ? 'Sudah punya akun? Masuk di sini' : 'Belum punya akun? Daftar Driver Baru'}
            </button>
            <button onClick={onLogout} className="w-full text-xs text-slate-400 hover:text-slate-600 pb-2">
              Kembali ke halaman utama
            </button>
          </div>
        </div>
        {toast && <Toast message={toast} onClose={() => setToast('')} />}
      </div>
    );
  }

  const myOrders = orders.filter((o) => o.driver_id === driver.id);
  const activeOrder = myOrders.find((o) => !['Sampai', 'Dibatalkan'].includes(o.status)) || null;
  const history = myOrders.filter((o) => ['Sampai', 'Dibatalkan'].includes(o.status));
  const pendingSeconds = pending ? Math.max(0, Math.ceil((pending.expires - Date.now()) / 1000)) : 0;

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <header className="bg-sky-800 text-white px-4 py-4 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div>
          <h1 className="font-bold leading-tight">Portal Driver</h1>
          <p className="text-[11px] text-sky-200">{driver.name} - {driver.driver_code}</p>
        </div>
        <button onClick={onLogout} className="bg-white/15 hover:bg-white/25 p-2 rounded-xl" title="Keluar">
          <LogOut size={16} />
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        <ErrorBox message={error} onRetry={() => driver && loadOrders(driver)} />

        <section className={`rounded-2xl shadow-md p-5 text-white ${driver.is_online ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' : 'bg-gradient-to-br from-slate-600 to-slate-700'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs opacity-80">Status</p>
              <p className="font-bold text-lg">{driver.is_online ? 'ONLINE' : 'OFFLINE'}</p>
            </div>
            <button
              onClick={toggleOnline}
              className={`w-16 h-9 rounded-full p-1 transition-colors ${driver.is_online ? 'bg-emerald-400' : 'bg-slate-400'}`}
            >
              <span className={`block w-7 h-7 bg-white rounded-full shadow transition-transform ${driver.is_online ? 'translate-x-7' : ''}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-[11px] opacity-80 flex items-center gap-1"><DollarSign size={11} /> Dompet</p>
              <p className="font-bold">{formatRupiah(driver.wallet)}</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-[11px] opacity-80 flex items-center gap-1"><Star size={11} /> Order hari ini</p>
              <p className="font-bold">{driver.trips_today}x (bonus di 5x)</p>
            </div>
          </div>
        </section>

        {pending && pending.order.driver_id === null && (
          <section className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 animate-pulse-slow">
            <p className="text-xs font-bold text-amber-700 mb-1">ORDER BARU MASUK - Auto Dispatch</p>
            <p className="font-bold text-slate-800">{pending.order.pickup} - {pending.order.destination}</p>
            <p className="text-xs text-slate-500">{pending.order.car_type} - {formatRupiah(pending.order.price)} - {pending.order.payment_method}</p>
            <p className="text-xs font-bold text-amber-600 mt-2">Diterima otomatis dalam {pendingSeconds} detik</p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Btn variant="success" onClick={accept}>Terima</Btn>
              <Btn variant="danger" onClick={reject}>Tolak</Btn>
            </div>
          </section>
        )}

        {activeOrder && (
          <section className="bg-white rounded-2xl shadow-md p-5 space-y-3">
            <h2 className="font-bold text-slate-800">Trip Berjalan</h2>
            <MiniMap progress={0.5} label={activeOrder.status} />
            <div className="text-sm text-slate-600 space-y-1">
              <p><MapPin size={13} className="inline mr-1 text-sky-600" />{activeOrder.pickup}</p>
              <p>Tujuan: {activeOrder.destination}</p>
              <p>Customer: <b>{activeOrder.customer_name}</b> - <a className="text-sky-600 underline" href={`tel:${activeOrder.customer_phone}`}>{activeOrder.customer_phone}</a></p>
              <p>{formatRupiah(activeOrder.price)} ({activeOrder.payment_method})</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href={mapsLink(activeOrder.pickup)} target="_blank" rel="noreferrer">
                <span className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2.5 rounded-xl transition">
                  <Navigation size={15} /> Buka Maps
                </span>
              </a>
              <Btn onClick={() => advance(activeOrder)}>
                <CheckCircle2 size={15} className="inline mr-1" />
                {activeOrder.status === 'Mencari Driver' ? 'Mulai' : activeOrder.status === 'Driver OTW' ? 'Saya Tiba' : activeOrder.status === 'Driver Tiba' ? 'Jalan' : 'Selesai'}
              </Btn>
            </div>
          </section>
        )}

        <section className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <ClipboardList size={18} className="text-sky-700" /> Riwayat Trip
          </h2>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400">Belum ada trip selesai</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 10).map((o) => (
                <div key={o.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="font-semibold text-slate-700">{o.pickup} - {o.destination}</p>
                    <p className="text-slate-400">{new Date(o.created_at).toLocaleDateString('id-ID')} - {o.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sky-700">{formatRupiah(o.price)}</p>
                    {o.rating ? <p className="text-amber-500">{'*'.repeat(o.rating)}</p> : <p className="text-slate-300">Belum dinilai</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
