import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';

const DEFAULT_CENTER = [-6.200000, 106.816666];

function createMarkerIcon(sos) {
  return L.divIcon({
    className: '',
    html: `<div class="live-marker${sos ? ' sos-marker' : ''}"></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function AnimatedMarker({ position, sos }) {
  const [displayPosition, setDisplayPosition] = useState(position);
  const previousPositionRef = useRef(position);

  useEffect(() => {
    if (!position) return undefined;

    const from = previousPositionRef.current ?? position;
    const to = position;
    const startedAt = performance.now();
    const duration = 700;
    let frameId;

    function animate(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayPosition([
        from[0] + (to[0] - from[0]) * eased,
        from[1] + (to[1] - from[1]) * eased,
      ]);

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        previousPositionRef.current = to;
      }
    }

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [position]);

  const icon = useMemo(() => createMarkerIcon(sos), [sos]);

  if (!displayPosition) return null;
  return <Marker icon={icon} position={displayPosition} />;
}

function MapCamera({ position, trail, follow }) {
  const map = useMap();
  const hasFitRef = useRef(false);

  useEffect(() => {
    if (trail.length >= 2 && !hasFitRef.current) {
      map.fitBounds(trail, { padding: [32, 32], maxZoom: 17 });
      hasFitRef.current = true;
      return;
    }

    if (position && (follow || !hasFitRef.current)) {
      map.setView(position, Math.max(map.getZoom(), 16), { animate: true });
      hasFitRef.current = true;
    }
  }, [follow, map, position, trail]);

  return null;
}

export default function LiveMap({ current, points = [], follow = true, sos = false }) {
  const trail = useMemo(
    () => points.filter((point) => point?.lat && point?.lng).map((point) => [point.lat, point.lng]),
    [points],
  );
  const position = current?.lat && current?.lng ? [current.lat, current.lng] : trail.at(-1);
  const center = position ?? DEFAULT_CENTER;

  return (
    <div className="h-full min-h-[420px] overflow-hidden rounded-none bg-slate-200 md:rounded-lg">
      <MapContainer center={center} zoom={position ? 16 : 12} scrollWheelZoom className="z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapCamera follow={follow} position={position} trail={trail} />
        {trail.length > 1 && (
          <Polyline pathOptions={{ color: sos ? '#dc2626' : '#0f766e', weight: 5 }} positions={trail} />
        )}
        {position && <AnimatedMarker position={position} sos={sos} />}
      </MapContainer>
    </div>
  );
}
