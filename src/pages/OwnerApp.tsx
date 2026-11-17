import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  IndianRupee,
  LogOut,
  MapPin,
  Plus,
  ShoppingCart,
  Trash2,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  DriverRow,
  OrderRow,
  RouteRow,
  formatRupiah,
  getErrorMessage,
  rushPrice,
} from '@/lib/types';
import { Btn, ErrorBox, Field, MiniMap, Modal, Toast } from '@/components/ui';

export default function OwnerApp({ onLogout }: { onLogout: () => void }) {
  const [authed, setAuthed] = useState(false);
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [drivers, setDrivers] = useState<DriverRow[]>([]);
  const [routes, setRoutes] = useState<RouteRow[]>([]);
  const [tab, setTab] = useState<'dash' | 'orders' | 'drivers' | 'routes'>('dash');
  const [addRouteOpen, setAddRouteOpen] = useState(false);
  const [editing, setEditing] = useState<RouteRow | null>(null);

  // form rute
  const [o, setO] = useState('');
  const [d, setD] = useState('');
  const [pe, setPe] = useState('');
  const [pc, setPc] = useState('');
  const [pp, setPp] = useState('');

  const loadAll = useCallback(async () => {
    try {
      const [r1, r2, r3] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('drivers').select('*').order('created_at', { ascending: false }),
        supabase.from('routes').select('*').order('origin'),
      ]);
      if (r1.error || r2.error || r3.error) throw new Error('x');
      setOrders((r1.data as OrderRow[]) || []);
      setDrivers((r2.data as DriverRow[]) || []);
      setRoutes((r3.data as RouteRow[]) || []);
      setError('');
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadAll();
    const ch = supabase
      .channel('owner-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'routes' }, loadAll)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [authed, loadAll]);

  const login = () => {
    if (username.trim() !== 'admin' && username.trim() !== 'owner') {
      return setError('Username salah (gunakan: admin)');
    }
    if (pin !== 'admin123') return setError('PIN salah (default: admin123)');
    setError('');
    setAuthed(true);
    localStorage.setItem('ti_owner', '1');
  };

  useEffect(() => {
    if (localStorage.getItem('ti_owner') === '1') setAuthed(true);
  }, []);

  const logout = () => {
    localStorage.removeItem('ti_owner');
    setAuthed(false);
    onLogout();
  };

  const deleteDriver = async (drv: DriverRow) => {
    if (!confirm(`Hapus driver ${drv.name}? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await supabase.from('drivers').delete().eq('id', drv.id);
      setToast('Driver dihapus');
      loadAll();
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const addRoute = async () => {
    const peN = parseInt(pe, 10);
    const pcN = parseInt(pc, 10) || peN;
    const ppN = parseInt(pp, 10) || pcN;
    if (o.trim().length < 3 || d.trim().length < 3) return setError('Kota asal & tujuan wajib diisi');
    if (isNaN(peN) || peN < 5000) return setError('Harga minimal Rp 5.000');
    setError('');
    try {
      const { error: e } = await supabase.from('routes').insert({
        origin: o.trim(),
        destination: d.trim(),
        price_economy: peN,
        price_comfort: pcN,
        price_premium: ppN,
      });
      if (e) throw new Error('x');
      setAddRouteOpen(false);
      setO(''); setD(''); setPe(''); setPc(''); setPp('');
      setToast('Rute baru ditambahkan');
      loadAll();
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  const savePrice = async () => {
    if (!editing) return;
    const peN = parseInt(pe, 10);
    const pcN = parseInt(pc, 10);
    const ppN = parseInt(pp, 10);
    if (isNaN(peN) || peN < 5000 || isNaN(pcN) || pcN < 5000 || isNaN(ppN) || ppN < 5000) {
      return setError('Semua harga minimal Rp 5.000');
    }
    try {
      await supabase
        .from('routes')
        .update({ price_economy: peN, price_comfort: pcN, price_premium: ppN })
        .eq('id', editing.id);
      setEditing(null);
      setToast('Harga diperbarui');
      loadAll();
    } catch {
      setError('Koneksi bermasalah, coba lagi');
    }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7">
          <h2 className="text-xl font-bold text-center text-slate-800 mb-1">Masuk Owner</h2>
          <p className="text-xs text-slate-500 text-center mb-5">Khusus pemilik armada</p>
          <div className="space-y-3">
            <Field label="Username" value={username} onChange={setUsername} placeholder="admin" />
            <Field label="PIN" value={pin} onChange={setPin} type="password" placeholder="PIN owner" />
            <ErrorBox message={error} />
            <Btn onClick={login} className="w-full">Masuk Dashboard</Btn>
            <button onClick={onLogout} className="w-full text-xs text-slate-400 hover:text-slate-600 py-2">
              Kembali ke halaman utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  // statistik
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((ord) => ord.created_at.slice(0, 10) === today);
  const todayRevenue = todayOrders.filter((x) => x.status === 'Sampai').reduce((s, x) => s + x.price, 0);
  const onlineDrivers = drivers.filter((x) => x.is_online);

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date();
    dt.setDate(dt.getDate() - (6 - i));
    const key = dt.toISOString().slice(0, 10);
    const total = orders
      .filter((ord) => ord.created_at.slice(0, 10) === key && ord.status === 'Sampai')
      .reduce((s, x) => s + x.price, 0);
    return { day: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][dt.getDay()], total };
  });
  const maxWeek = Math.max(1, ...weekData.map((w) => w.total));

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <header className="bg-slate-900 text-white px-4 py-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold leading-tight">Dashboard Owner</h1>
            <p className="text-[11px] text-slate-400">Travel Indramayu - 24 JAM</p>
          </div>
          <button onClick={logout} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl" title="Keluar">
            <LogOut size={16} />
          </button>
        </div>
        <div className="max-w-4xl mx-auto flex gap-2 mt-3 overflow-x-auto">
          {([['dash', 'Ringkasan'], ['orders', 'Order'], ['drivers', 'Driver'], ['routes', 'Rute & Harga']] as const).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                tab === k ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <ErrorBox message={error} onRetry={loadAll} />

        {tab === 'dash' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs text-slate-500 flex items-center gap-1"><ShoppingCart size={12} /> Order Hari Ini</p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{todayOrders.length}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <p className="text-xs text-slate-500 flex items-center gap-1"><IndianRupee size={12} /> Pendapatan Hari Ini</p>
                <p className="text-3xl font-bold text-emerald-600 mt-1">{formatRupiah(todayRevenue)}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-600" /> Grafik Pendapatan Mingguan
              </h2>
              <div className="flex items-end gap-2 h-36">
                {weekData.map((w, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] text-slate-400">{w.total > 0 ? (w.total / 1000).toFixed(0) + 'rb' : ''}</span>
                    <div
                      className="w-full bg-emerald-500 rounded-t-lg transition-all duration-500 hover:bg-emerald-600"
                      style={{ height: `${Math.max(4, (w.total / maxWeek) * 100)}%` }}
                    />
                    <span className="text-[10px] font-semibold text-slate-500">{w.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <MapPin size={18} className="text-emerald-600" /> Peta Live Semua Driver Online
              </h2>
              <MiniMap allDrivers driverOnline={onlineDrivers.map((drv, i) => ({ id: drv.id, name: drv.name, p: (i % 5) / 5 + 0.1 }))} />
              <p className="text-xs text-slate-500">Laporan hari ini: {todayOrders.filter((x) => x.status === 'Sampai').length} trip selesai, {todayOrders.filter((x) => x.status === 'Dibatalkan').length} batal.</p>
            </div>
          </>
        )}

        {tab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-3">Semua Order ({orders.length})</h2>
            <div className="space-y-2">
              {orders.map((ord) => (
                <div key={ord.id} className="text-xs bg-slate-50 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-700">{ord.customer_name} - {ord.pickup} - {ord.destination}</p>
                    <p className="text-slate-400">{new Date(ord.created_at).toLocaleString('id-ID')} - {ord.car_type} - {ord.payment_method}{ord.is_carpool ? ' - Carpool' : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-emerald-700">{formatRupiah(ord.price)}</p>
                    <p className="text-slate-400">{ord.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'drivers' && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Users size={18} className="text-emerald-600" /> Semua Driver ({drivers.length})
            </h2>
            <div className="space-y-2">
              {drivers.map((drv) => (
                <div key={drv.id} className="text-xs bg-slate-50 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-700">
                      {drv.name} ({drv.driver_code})
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${drv.is_online ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        {drv.is_online ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </p>
                    <p className="text-slate-400">{drv.phone} - {drv.plate} - Rating {Number(drv.rating).toFixed(1)} - Dompet {formatRupiah(drv.wallet)}</p>
                  </div>
                  <button onClick={() => deleteDriver(drv)} className="text-red-500 hover:text-red-700 p-2" title="Hapus driver">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'routes' && (
          <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Rute & Harga</h2>
              <Btn onClick={() => setAddRouteOpen(true)}>
                <Plus size={15} className="inline mr-1" /> Tambah Rute
              </Btn>
            </div>
            <div className="space-y-2">
              {routes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setEditing(r);
                    setPe(String(r.price_economy));
                    setPc(String(r.price_comfort));
                    setPp(String(r.price_premium));
                  }}
                  className="w-full text-left text-xs bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2.5 flex items-center justify-between transition"
                >
                  <span className="font-semibold text-slate-700">{r.origin} - {r.destination}</span>
                  <span className="text-emerald-700 font-bold">
                    {formatRupiah(r.price_economy)} / {formatRupiah(r.price_comfort)} / {formatRupiah(r.price_premium)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {addRouteOpen && (
        <Modal title="Tambah Rute Baru" onClose={() => setAddRouteOpen(false)}>
          <div className="space-y-3">
            <Field label="Kota Asal" value={o} onChange={setO} placeholder="Indramayu" />
            <Field label="Kota Tujuan" value={d} onChange={setD} placeholder="Semarang" />
            <Field label="Harga Ekonomi (Rp)" value={pe} onChange={setPe} type="number" placeholder="120000" />
            <Field label="Harga Nyaman (Rp)" value={pc} onChange={setPc} type="number" placeholder="150000" />
            <Field label="Harga Premium (Rp)" value={pp} onChange={setPp} type="number" placeholder="200000" />
            <ErrorBox message={error} onRetry={() => setError('')} />
            <Btn onClick={addRoute} className="w-full">Simpan Rute</Btn>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={`Ubah Harga: ${editing.origin} - ${editing.destination}`} onClose={() => setEditing(null)}>
          <div className="space-y-3">
            <Field label="Harga Ekonomi (Rp)" value={pe} onChange={setPe} type="number" />
            <Field label="Harga Nyaman (Rp)" value={pc} onChange={setPc} type="number" />
            <Field label="Harga Premium (Rp)" value={pp} onChange={setPp} type="number" />
            <ErrorBox message={error} onRetry={() => setError('')} />
            <Btn onClick={savePrice} className="w-full">Simpan Perubahan</Btn>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
}
