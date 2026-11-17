import { useEffect, useState } from 'react';
import { Car, Clock, ShieldCheck, User, Users, Wallet } from 'lucide-react';
import { useTravelSettings } from '@/lib/settings';

type Role = 'customer' | 'driver' | 'owner';

export default function Home({ onPick }: { onPick: (r: Role) => void }) {
  const appSettings = useTravelSettings();
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-700 via-emerald-800 to-slate-900 text-white flex flex-col">
      <header className="px-6 pt-14 pb-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur border border-white/20 mb-5">
          <Car size={40} className="text-emerald-300" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{appSettings.travelName}</h1>
        <p className="mt-2 flex items-center justify-center gap-2 text-emerald-200 font-semibold text-sm">
          <ShieldCheck size={16} /> {appSettings.tagline}
        </p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 pb-10">
        <p className="text-sm text-emerald-100/80 mb-6 text-center">Pilih peran Anda untuk mulai</p>
        <div className="w-full max-w-sm space-y-3">
          <RoleBtn icon={<User size={22} />} title="Sebagai Customer" desc="Pesan travel, tracking live, chat driver" onClick={() => onPick('customer')} />
          <RoleBtn icon={<Users size={22} />} title="Sebagai Driver" desc="Terima order, kelola dompet & bonus" onClick={() => onPick('driver')} />
          <RoleBtn icon={<Wallet size={22} />} title="Sebagai Owner" desc="Dashboard armada, laporan & harga" onClick={() => onPick('owner')} />
        </div>

        <div className="mt-10 flex items-center gap-2 text-xs text-emerald-200/70">
          <Clock size={14} /> Layanan aktif 24 jam - sewaktu saja bisa pesan
        </div>
      </main>
    </div>
  );
}

function RoleBtn({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 bg-white/10 hover:bg-white/20 border border-white/15 backdrop-blur rounded-2xl px-5 py-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 group"
    >
      <span className="w-12 h-12 grid place-items-center rounded-xl bg-emerald-500/25 text-emerald-300 group-hover:bg-emerald-500/40 transition">
        {icon}
      </span>
      <span>
        <span className="block font-bold">{title}</span>
        <span className="block text-xs text-emerald-100/70 mt-0.5">{desc}</span>
      </span>
    </button>
  );
}
