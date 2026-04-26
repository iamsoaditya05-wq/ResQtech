import React, { useEffect, useRef } from 'react';

const SEV_COLORS = { 1: '#DC2626', 2: '#EA580C', 3: '#D97706', 4: '#1D4ED8', 5: '#166534' };
const TYPE_EMOJI = { cardiac: '❤️', accident: '🚗', delivery: '👶', general: '🏥' };
const TYPE_LABEL = { cardiac: 'Cardiac', accident: 'Accident', delivery: 'Delivery', general: 'General' };

export default function MapView({
  emergencies = [],
  responders  = [],
  hospitals   = [],
  height      = 420,
  autoFit     = false,
}) {
  const mapRef      = useRef(null);
  const instanceRef = useRef(null);
  const markersRef  = useRef([]);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (instanceRef.current) return;

    import('leaflet').then((L) => {
      const map = L.map(mapRef.current, {
        center: [18.5204, 73.8567],
        zoom: 9,
        zoomControl: true,
        attributionControl: true,
      });

      // Better tile layer — CartoDB Positron (cleaner, faster)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      instanceRef.current = { map, L };
    });

    return () => {
      if (instanceRef.current?.map) {
        instanceRef.current.map.remove();
        instanceRef.current = null;
      }
    };
  }, []);

  // ── Update markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!instanceRef.current) return;
    const { map, L } = instanceRef.current;

    markersRef.current.forEach((m) => { try { m.remove(); } catch (_) {} });
    markersRef.current = [];

    const allPoints = [];

    // ── Emergency markers ────────────────────────────────────────────────────
    emergencies.forEach((em) => {
      if (!em.lat || !em.lng) return;
      allPoints.push([em.lat, em.lng]);

      const color    = SEV_COLORS[em.severity] || '#F97316';
      const emoji    = TYPE_EMOJI[em.type] || '🏥';
      const isActive = ['pending', 'matched', 'en_route'].includes(em.status);
      const label    = TYPE_LABEL[em.type] || em.type;

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
            <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
              ${isActive ? `
                <div style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${color};opacity:0.6;animation:ping 1.5s ease-in-out infinite;"></div>
                <div style="position:absolute;inset:-8px;border-radius:50%;border:1.5px solid ${color};opacity:0.3;animation:ping 2s ease-in-out infinite 0.5s;"></div>
              ` : ''}
              <div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 3px 10px rgba(0,0,0,0.3);z-index:1;">
                ${emoji}
              </div>
            </div>
            <div style="background:${color};color:#fff;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;white-space:nowrap;margin-top:2px;box-shadow:0 1px 4px rgba(0,0,0,0.2);font-family:DM Sans,sans-serif;">
              ${em.patient_name?.split(' ')[0] || label}
            </div>
          </div>
          <style>
            @keyframes ping {
              0%   { transform: scale(1); opacity: 0.6; }
              70%  { transform: scale(1.8); opacity: 0; }
              100% { transform: scale(1.8); opacity: 0; }
            }
          </style>
        `,
        iconSize: [44, 60],
        iconAnchor: [22, 22],
        popupAnchor: [0, -24],
      });

      const severityLabel = { 1: 'Critical', 2: 'Serious', 3: 'Moderate', 4: 'Minor', 5: 'Minimal' };
      const marker = L.marker([em.lat, em.lng], { icon, zIndexOffset: isActive ? 1000 : 0 })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:DM Sans,sans-serif;min-width:200px;padding:4px 0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${emoji}</div>
              <div>
                <div style="font-weight:700;font-size:14px;color:#1C0A00;">${em.patient_name}</div>
                <div style="font-size:11px;color:#78716C;">📍 ${em.village}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px;">
              <div style="background:#FEF3C7;padding:4px 8px;border-radius:6px;font-size:11px;">
                <div style="color:#78716C;font-size:10px;">Type</div>
                <div style="font-weight:600;text-transform:capitalize;">${em.type}</div>
              </div>
              <div style="background:#FEF3C7;padding:4px 8px;border-radius:6px;font-size:11px;">
                <div style="color:#78716C;font-size:10px;">Severity</div>
                <div style="font-weight:600;color:${color};">${severityLabel[em.severity] || em.severity}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
              <span style="background:${color};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700;">${em.status.replace('_', ' ').toUpperCase()}</span>
              ${em.responder_name ? `<span style="font-size:11px;color:#78716C;">🚗 ${em.responder_name}</span>` : ''}
              ${em.eta_minutes ? `<span style="font-size:11px;font-weight:700;color:#EA580C;">⏱ ETA ${em.eta_minutes} min</span>` : ''}
            </div>
            <div style="margin-top:8px;">
              <a href="/patient/${em.id}" style="font-size:11px;color:#F97316;font-weight:600;text-decoration:none;">📍 Track live →</a>
            </div>
          </div>
        `, { maxWidth: 240 });

      markersRef.current.push(marker);
    });

    // ── Responder markers — GREEN (available) / RED (busy) ──────────────────
    responders.forEach((r) => {
      if (!r.lat || !r.lng) return;
      allPoints.push([r.lat, r.lng]);

      const isAvail  = r.is_available;
      const dotColor = isAvail ? '#16a34a' : '#dc2626';   // green / red
      const bgColor  = isAvail ? '#dcfce7' : '#fee2e2';
      const vehicle  = r.vehicle_type === 'car' ? '🚗' : '🏍️';

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="position:relative;width:38px;height:38px;display:flex;align-items:center;justify-content:center;">
              ${isAvail ? `<div style="position:absolute;inset:0;border-radius:50%;background:${dotColor};opacity:0.2;animation:ping 2s ease-in-out infinite;"></div>` : ''}
              <div style="width:32px;height:32px;border-radius:50%;background:${bgColor};border:3px solid ${dotColor};display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
                ${vehicle}
              </div>
              <div style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;border-radius:50%;background:${dotColor};border:2px solid #fff;"></div>
            </div>
            <div style="background:${dotColor};color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:8px;white-space:nowrap;margin-top:2px;font-family:DM Sans,sans-serif;max-width:60px;overflow:hidden;text-overflow:ellipsis;">
              ${r.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [38, 54],
        iconAnchor: [19, 19],
        popupAnchor: [0, -22],
      });

      const lastSeen = r.last_seen
        ? Math.floor((Date.now() - new Date(r.last_seen)) / 60000) + 'm ago'
        : 'unknown';

      const marker = L.marker([r.lat, r.lng], { icon, zIndexOffset: isAvail ? 500 : 100 })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:DM Sans,sans-serif;min-width:180px;padding:4px 0;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
              <div style="width:36px;height:36px;border-radius:50%;background:${bgColor};border:2px solid ${dotColor};display:flex;align-items:center;justify-content:center;font-size:18px;">${vehicle}</div>
              <div>
                <div style="font-weight:700;font-size:14px;color:#1C0A00;">${r.name}</div>
                <div style="font-size:11px;color:${dotColor};font-weight:600;">${isAvail ? '🟢 Available' : '🔴 Busy'}</div>
              </div>
            </div>
            <div style="font-size:11px;color:#78716C;margin-bottom:4px;">🚘 ${r.vehicle_type} · Last seen: ${lastSeen}</div>
            <div style="font-size:10px;color:#A8A29E;font-family:monospace;">${r.lat?.toFixed(5)}, ${r.lng?.toFixed(5)}</div>
          </div>
        `, { maxWidth: 220 });

      markersRef.current.push(marker);
    });

    // ── Hospital markers ─────────────────────────────────────────────────────
    hospitals.forEach((h) => {
      if (!h.lat || !h.lng) return;
      allPoints.push([h.lat, h.lng]);

      const pct   = h.total_beds > 0 ? 1 - h.beds_available / h.total_beds : 0;
      const color = pct > 0.9 ? '#DC2626' : pct > 0.7 ? '#D97706' : '#166534';
      const bg    = pct > 0.9 ? '#FEE2E2' : pct > 0.7 ? '#FEF3C7' : '#DCFCE7';

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="width:34px;height:34px;border-radius:8px;background:${bg};border:2.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
              🏥
            </div>
            <div style="background:${color};color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:8px;white-space:nowrap;margin-top:2px;font-family:DM Sans,sans-serif;max-width:70px;overflow:hidden;text-overflow:ellipsis;">
              ${h.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [34, 50],
        iconAnchor: [17, 17],
        popupAnchor: [0, -20],
      });

      const marker = L.marker([h.lat, h.lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family:DM Sans,sans-serif;min-width:200px;padding:4px 0;">
            <div style="font-weight:700;font-size:14px;color:#1C0A00;margin-bottom:6px;">🏥 ${h.name}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
                <div style="width:${Math.round(pct * 100)}%;height:100%;background:${color};border-radius:4px;"></div>
              </div>
              <span style="font-size:11px;font-weight:700;color:${color};">${Math.round(pct * 100)}% full</span>
            </div>
            <div style="font-size:12px;color:#78716C;margin-bottom:4px;">🛏️ <strong>${h.beds_available}</strong>/${h.total_beds} beds available</div>
            <div style="font-size:12px;color:#78716C;margin-bottom:6px;">📞 ${h.phone}</div>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              ${h.specializations.map(s => `<span style="background:#FEF3C7;color:#78350F;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:600;text-transform:capitalize;">${s}</span>`).join('')}
            </div>
          </div>
        `, { maxWidth: 240 });

      markersRef.current.push(marker);
    });

    // ── Route lines — responder → patient ────────────────────────────────────
    emergencies.forEach((em) => {
      if (!['matched', 'en_route'].includes(em.status) || !em.responder_id) return;
      const responder = responders.find((r) => r.user_id === em.responder_id);
      if (!responder?.lat || !responder?.lng) return;

      const color = SEV_COLORS[em.severity] || '#F97316';

      // Animated dashed route line
      const line = L.polyline(
        [[responder.lat, responder.lng], [em.lat, em.lng]],
        { color, weight: 3, dashArray: '8 6', opacity: 0.8, lineCap: 'round' }
      ).addTo(map);
      markersRef.current.push(line);

      // Distance label at midpoint
      const midLat = (responder.lat + em.lat) / 2;
      const midLng = (responder.lng + em.lng) / 2;
      const distKm = (
        6371 * 2 * Math.asin(Math.sqrt(
          Math.sin(((em.lat - responder.lat) * Math.PI / 180) / 2) ** 2 +
          Math.cos(responder.lat * Math.PI / 180) * Math.cos(em.lat * Math.PI / 180) *
          Math.sin(((em.lng - responder.lng) * Math.PI / 180) / 2) ** 2
        ))
      ).toFixed(1);

      const labelIcon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;white-space:nowrap;font-family:DM Sans,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,0.2);">${distKm} km</div>`,
        iconSize: [60, 20],
        iconAnchor: [30, 10],
      });
      const labelMarker = L.marker([midLat, midLng], { icon: labelIcon, interactive: false }).addTo(map);
      markersRef.current.push(labelMarker);
    });

    // ── Auto-fit bounds ───────────────────────────────────────────────────────
    if (autoFit && allPoints.length > 0) {
      try {
        map.fitBounds(allPoints, { padding: [40, 40], maxZoom: 12 });
      } catch (_) {}
    }

  }, [emergencies, responders, hospitals, autoFit]);

  return (
    <div ref={mapRef} className="map-container" style={{ height, width: '100%' }} />
  );
}
