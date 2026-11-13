import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, MapPin } from 'lucide-react';
import { Opportunity, StartingLocation, TravelEstimate } from '../types';

interface OneMapExplorerProps {
  startingLocation: StartingLocation;
  opportunities: Opportunity[];
  travelTimes: Record<string, TravelEstimate>;
  selectedOppId: string | null;
  onSelectOpportunity: (oppId: string) => void;
}

export const OneMapExplorer: React.FC<OneMapExplorerProps> = ({
  startingLocation,
  opportunities,
  travelTimes,
  selectedOppId,
  onSelectOpportunity,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [tileNotice, setTileNotice] = useState(false);

  // Initialize Leaflet Map with official OneMap Default tiles
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [1.3521, 103.8198],
      zoom: 11,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: true,
    });

    const oneMapTiles = L.tileLayer(
      'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png',
      {
        detectRetina: true,
        maxZoom: 18,
        minZoom: 11,
        attribution:
          'Map data &copy; <a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority (OneMap)</a>',
      }
    );

    oneMapTiles.on('tileerror', () => {
      setTileNotice(true);
    });

    oneMapTiles.addTo(map);
    const layerGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = layerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update markers whenever startingLocation, opportunities, travelTimes, or selectedOppId changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // Starting location pin
    const startIcon = L.divIcon({
      className: 'mp-start-marker',
      html: `<div style="width:28px;height:28px;border-radius:9999px;background:#0F172A;border:3px solid #FBBF24;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.28);"><div style="width:8px;height:8px;border-radius:9999px;background:#FBBF24;"></div></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    L.marker([startingLocation.lat, startingLocation.lng], { icon: startIcon })
      .bindPopup(
        `<div style="font-family:DM Sans,sans-serif;min-width:170px;">
          <div style="font-size:11px;font-weight:700;color:#B45309;">Starting Location</div>
          <div style="font-size:13px;font-weight:700;color:#0F172A;margin-top:2px;">${startingLocation.label}</div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">Postal ${startingLocation.postalCode}</div>
        </div>`
      )
      .addTo(layer);

    // Opportunity pins
    opportunities.forEach((opp) => {
      const isSelected = opp.id === selectedOppId;
      const isUrgent = opp.urgency === 'Urgent Fill';
      const fillColor = isUrgent ? '#D97706' : '#0F766E';
      const ringColor = isSelected ? '#0F172A' : '#FFFFFF';
      const size = isSelected ? 30 : 24;

      const oppIcon = L.divIcon({
        className: 'mp-opp-marker',
        html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${fillColor};border:3px solid ${ringColor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${
          opp.spotsTotal - opp.spotsFilled
        }</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const travel = travelTimes[opp.id];
      const travelLine = travel
        ? travel.minutes !== null && travel.minutes !== undefined
          ? `<div style="font-size:11px;color:#0F766E;font-weight:600;margin-top:4px;">~${travel.minutes} min (${travel.distanceKm} km via OneMap)</div>`
          : `<div style="font-size:11px;color:#475569;font-weight:600;margin-top:4px;">Travel time unavailable · ${travel.distanceKm} km away</div>`
        : '';

      const marker = L.marker([opp.lat, opp.lng], { icon: oppIcon }).bindPopup(
        `<div style="font-family:DM Sans,sans-serif;min-width:190px;">
          <div style="font-size:11px;color:#64748B;">${opp.charityName} · ${opp.charityVerificationStatus}</div>
          <div style="font-size:13px;font-weight:700;color:#0F172A;margin-top:2px;">${opp.title}</div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">${opp.location} (S${opp.postalCode})</div>
          ${travelLine}
        </div>`
      );

      marker.on('click', () => {
        onSelectOpportunity(opp.id);
      });

      marker.addTo(layer);
    });
  }, [startingLocation, opportunities, travelTimes, selectedOppId, onSelectOpportunity]);

  const handleRecenter = () => {
    mapInstanceRef.current?.setView([startingLocation.lat, startingLocation.lng], 13, {
      animate: true,
    });
  };

  const handleFitIsland = () => {
    mapInstanceRef.current?.setView([1.3521, 103.8198], 11, { animate: true });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-teal-700" />
          <div>
            <h2 className="font-display text-sm font-bold text-slate-900">
              Singapore Volunteer Shift Map (OneMap)
            </h2>
            <p className="text-xs text-slate-500">
              Pins show open spots remaining · Click any marker to highlight the shift
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRecenter}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-[#FAFAF9] border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <LocateFixed className="w-3.5 h-3.5 text-amber-700" />
            <span>My Start</span>
          </button>
          <button
            type="button"
            onClick={handleFitIsland}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-[#FAFAF9] border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            All Singapore
          </button>
        </div>
      </div>

      <div className="relative h-72 sm:h-80 w-full bg-slate-100">
        <div ref={mapContainerRef} className="h-full w-full z-10" />
        {tileNotice && (
          <div className="absolute bottom-2 left-2 z-20 bg-white/95 border border-slate-200 rounded-md px-2.5 py-1 text-[11px] text-slate-600 shadow-sm">
            OneMap tile layer restricted in preview network; coordinate pins remain active.
          </div>
        )}
      </div>

      <div className="px-5 py-2.5 bg-[#FAFAF9] border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border-2 border-amber-400 inline-block" />
            <span>Start ({startingLocation.postalCode})</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-700 inline-block" />
            <span>Open Shift</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
            <span>Rescue a Shift (Urgent Fill)</span>
          </span>
        </div>
        <span className="font-mono-tabular text-slate-500">
          {opportunities.length} mapped locations
        </span>
      </div>
    </div>
  );
};
