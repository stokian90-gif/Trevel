import { useEffect, useState } from 'react';

export interface TravelSettings {
  travelName: string;
  tagline: string;
  banner: string | null;
}

const KEY = 'ti_settings';

export const DEFAULT_SETTINGS: TravelSettings = {
  travelName: 'Travel Indramayu',
  tagline: '24 JAM AMAN & NYAMAN',
  banner: null,
};

export const MAX_BANNER_BYTES = 1_500_000; // batas aman localStorage (~1.5 MB sebelum base64)

export function loadSettings(): TravelSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<TravelSettings>;
    return {
      travelName: typeof parsed.travelName === 'string' && parsed.travelName.trim() ? parsed.travelName : DEFAULT_SETTINGS.travelName,
      tagline: typeof parsed.tagline === 'string' ? parsed.tagline : DEFAULT_SETTINGS.tagline,
      banner: typeof parsed.banner === 'string' ? parsed.banner : null,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: TravelSettings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    window.dispatchEvent(new Event('ti_settings_changed'));
    return true;
  } catch {
    return false;
  }
}

// Hook agar semua halaman langsung berubah saat owner menyimpan pengaturan
export function useTravelSettings(): TravelSettings {
  const [settings, setSettings] = useState<TravelSettings>(loadSettings);

  useEffect(() => {
    const update = () => setSettings(loadSettings());
    window.addEventListener('ti_settings_changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('ti_settings_changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return settings;
}
