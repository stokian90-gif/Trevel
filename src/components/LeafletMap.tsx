import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

export const CITY_COORDS: Record<string, [number, number]> = {
  Indramayu: [-6.3275, 108.3333],
  Haurgeulis: [-6.3603, 108.4628],
  Jakarta: [-6.2088, 106.8456],
  Bandung: [-6.9175, 107.6191],
  Cirebon: [-6.732, 108.5523],
};

export interface MapDriver {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export default function LeafletMap({
  destination,
  drivers = [],
  height = 240,
  fitRoute = true,
}: {
  destination?: string | null;
  drivers?: MapDriver[];
  height?: number;
  fitRoute?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const driverMarkersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  // init peta sekali
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: CITY_COORDS.Indramayu,
      zoom: 10,
      scrollWheelZoom: true,
      zoomControl: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
      driverMarkersRef.current.clear();
    };
  }, []);

  // gambar ulang rute saat tujuan berubah
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.clearLayers();
    driverMarkersRef.current.clear();

    const origin = CITY_COORDS.Indramayu;
    const dest = destination ? CITY_COORDS[destination] : null;

    const drawPoint = (p: [number, number], color: string, label: string) => {
      L.circleMarker(p, {
        radius: 7,
        color: '#fff',
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindTooltip(label, { direction: 'top', offset: [0, -8] })
        .addTo(layers);
    };

    drawPoint(origin, '#059669', 'Indramayu (Pusat)');
    if (dest) {
      drawPoint(dest, '#dc2626', destination || '');
      // garis rute melengkung sederhana
      const mid: [number, number] = [
        (origin[0] + dest[0]) / 2 + Math.abs(dest[1] - origin[1]) * 0.08,
        (origin[1] + dest[1]) / 2,
      ];
      L.polyline([origin, mid, dest], {
        color: '#059669',
        weight: 3.5,
        dashArray: '8 10',
        opacity: 0.85,
      }).addTo(layers);
      if (fitRoute) {
        map.fitBounds(L.latLngBounds([origin, dest]).pad(0.25), { animate: true });
      }
    } else {
      map.fitBounds(
        L.latLngBounds(CITY_COORDS.Jakarta, CITY_COORDS.Cirebon).pad(0.2),
        { animate: true },
      );
    }

    drivers.forEach((d) => {
      const marker = L.circleMarker([d.lat, d.lng], {
        radius: 6,
        color: '#fff',
        weight: 2,
        fillColor: '#0ea5e9',
        fillOpacity: 1,
      })
        .bindTooltip(d.name, { direction: 'top', offset: [0, -8] })
        .addTo(layers);
      driverMarkersRef.current.set(d.id, marker);
    });
  }, [destination, drivers, fitRoute]);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 relative">
      <div ref={containerRef} style={{ height }} className="w-full z-0" />
      <div className="absolute top-2 left-3 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 shadow flex items-center gap-1 pointer-events-none">
        <MapPin size={12} className="text-emerald-600" />
        Peta Rute Live - OpenStreetMap
      </div>
    </div>
  );
}
