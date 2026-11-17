import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export function Btn({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'success' | 'warning';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const styles: Record<string, string> = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20',
    ghost: 'bg-white/10 hover:bg-white/20 text-white border border-white/15',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition"
      />
    </label>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
      <AlertTriangle size={16} className="shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="underline font-semibold shrink-0">
          Coba lagi
        </button>
      )}
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [message, onClose]);
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm px-5 py-3 rounded-xl shadow-xl animate-fade-in">
      {message}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Peta animasi sederhana: jalur SVG dengan titik driver bergerak
export function MiniMap({
  progress,
  label,
  driverOnline = [],
  allDrivers = false,
}: {
  progress?: number;
  label?: string;
  driverOnline?: { id: string; name: string; p: number }[];
  allDrivers?: boolean;
}) {
  const dots = useMemo(() => {
    if (allDrivers) return driverOnline;
    if (progress === undefined) return [];
    return [{ id: 'me', name: label ?? 'Driver', p: progress }];
  }, [allDrivers, driverOnline, progress, label]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-50 via-sky-50 to-slate-100 border border-slate-200">
      <svg viewBox="0 0 400 200" className="w-full h-44">
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f766e" strokeOpacity="0.08" strokeWidth="1" />
        </pattern>
        <rect width="400" height="200" fill="url(#grid)" />
        <path d="M0,150 C80,140 120,60 200,80 C280,100 320,40 400,60" fill="none" stroke="#cbd5e1" strokeWidth="10" strokeLinecap="round" />
        <path d="M0,150 C80,140 120,60 200,80 C280,100 320,40 400,60" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 8" />
        <circle cx="20" cy="147" r="6" fill="#059669" />
        <text x="20" y="170" textAnchor="middle" fontSize="10" fill="#065f46" fontWeight="700">Jemput</text>
        <circle cx="380" cy="61" r="6" fill="#dc2626" />
        <text x="380" y="84" textAnchor="middle" fontSize="10" fill="#991b1b" fontWeight="700">Tujuan</text>
        {dots.map((d) => {
          const p = Math.max(0, Math.min(1, d.p));
          const cx = 20 + 360 * p;
          const cy = 150 - 89 * p + 30 * Math.sin(p * Math.PI);
          return (
            <g key={d.id}>
              <circle cx={cx} cy={cy} r="12" fill="#059669" fillOpacity="0.2">
                <animate attributeName="r" values="10;16;10" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={cx} cy={cy} r="7" fill="#059669" stroke="white" strokeWidth="2.5" />
            </g>
          );
        })}
      </svg>
      {label && !allDrivers && (
        <div className="absolute bottom-2 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 shadow">
          {label}
        </div>
      )}
      {allDrivers && (
        <div className="absolute top-2 right-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 shadow">
          {driverOnline.length} driver online
        </div>
      )}
    </div>
  );
}

export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star filled={(hover || value) >= i} />
        </button>
      ))}
    </div>
  );
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill={filled ? '#f59e0b' : 'none'} stroke={filled ? '#f59e0b' : '#cbd5e1'} strokeWidth="2">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
