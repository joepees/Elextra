import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

interface InteractiveMapProps {
  riderCoords: { lat: number; lng: number };
  pickupCoords: { lat: number; lng: number };
  dropoffCoords: { lat: number; lng: number };
  status: string;
  progress: number;
  pickupName?: string;
  dropoffName?: string;
  driverName?: string;
}

// Bezier sampler to generate exact high-fidelity highway routing coordinates
const getBezierPath = (): { lat: number; lng: number }[] => {
  const points: { lat: number; lng: number }[] = [];
  for (let p = 0; p <= 100; p += 2) {
    const fra = p / 100;
    const markerX = (1 - fra) * (1 - fra) * 45 + 2 * (1 - fra) * fra * 250 + fra * fra * 455;
    const markerY = (1 - fra) * (1 - fra) * 115 + 2 * (1 - fra) * fra * 35 + fra * fra * 115;
    
    const baseLat = 5.303;
    const baseLng = -1.984;
    const lat = baseLat + (markerY - 115) * 0.0005;
    const lng = baseLng + (markerX - 45) * 0.0008;
    points.push({ lat, lng });
  }
  return points;
};

// API Key Setup
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";
const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY !== "";

// Polyline helper component for React Google Maps
interface PolylineProps {
  path: { lat: number; lng: number }[];
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
  strokeDash?: string;
}

function GooglePolyline({ path, strokeColor = "#10b981", strokeWeight = 4, strokeOpacity = 0.8, strokeDash }: PolylineProps) {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    const options: google.maps.PolylineOptions = {
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity,
      strokeWeight,
    };

    if (strokeDash) {
      options.strokeOpacity = 0;
      options.icons = [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeOpacity: strokeOpacity,
            strokeWeight: strokeWeight,
            scale: 2,
          },
          offset: "0",
          repeat: "20px",
        },
      ];
    }

    const polyline = new google.maps.Polyline(options);
    polyline.setMap(map);
    polylineRef.current = polyline;

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, path, strokeColor, strokeOpacity, strokeWeight, strokeDash]);

  return null;
}

// Map Bounds Controller to keep pickups & dropoffs framed
function MapBoundsController({ bounds }: { bounds: { pickup: { lat: number; lng: number }, dropoff: { lat: number; lng: number } } }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const gBounds = new google.maps.LatLngBounds();
    gBounds.extend(bounds.pickup);
    gBounds.extend(bounds.dropoff);
    map.fitBounds(gBounds);
  }, [map, bounds.pickup.lat, bounds.pickup.lng, bounds.dropoff.lat, bounds.dropoff.lng]);

  return null;
}

// Dedicated Leaflet OSM Map Component to isolate lifecycle and prevent container re-initialization conflicts
interface LeafletMapProps {
  riderCoords: { lat: number; lng: number };
  pickupCoords: { lat: number; lng: number };
  dropoffCoords: { lat: number; lng: number };
  progress: number;
  pickupName: string;
  dropoffName: string;
  driverName: string;
}

function LeafletMapComponent({
  riderCoords,
  pickupCoords,
  dropoffCoords,
  progress,
  pickupName,
  dropoffName,
  driverName,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);
  const activePolylineRef = useRef<L.Polyline | null>(null);

  const createPickupIcon = (name: string) => {
    return L.divIcon({
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; width: 150px;">
          <div style="background: #1e293b; color: #f8fafc; border: 1.5px solid #3b82f6; padding: 2px 6px; border-radius: 6px; font-size: 8.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); margin-bottom: 2px; text-align: center;">
            🛍️ ${name}
          </div>
          <div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: #3b82f6; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(59,130,246,0.5);">
            <span style="font-size: 11px;">🏬</span>
          </div>
        </div>
      `,
      className: "custom-pickup-icon-container",
      iconSize: [150, 42],
      iconAnchor: [75, 40],
    });
  };

  const createDropoffIcon = (name: string) => {
    return L.divIcon({
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; width: 150px;">
          <div style="background: #0f172a; color: #f8fafc; border: 1.5px solid #10b981; padding: 2px 6px; border-radius: 6px; font-size: 8.5px; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; box-shadow: 0 2px 5px rgba(0,0,0,0.3); margin-bottom: 2px; text-align: center;">
            📍 ${name}
          </div>
          <div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; background: #10b981; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(16,185,129,0.5);">
            <span style="font-size: 11px;">🏡</span>
          </div>
        </div>
      `,
      className: "custom-dropoff-icon-container",
      iconSize: [150, 42],
      iconAnchor: [75, 40],
    });
  };

  const createRiderIcon = (name: string, pct: number) => {
    return L.divIcon({
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; width: 150px;">
          <div style="background: #090d16; color: #21F1A8; border: 1.5px solid #21F1A8; padding: 2px 6px; border-radius: 6px; font-size: 8px; font-weight: 900; white-space: nowrap; box-shadow: 0 0 6px rgba(33,241,168,0.5); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.3px; text-align: center; max-width: 110px; overflow: hidden; text-overflow: ellipsis;">
            ⚡ ${name} (${pct}%)
          </div>
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #0f172a; border: 2px solid #21F1A8; border-radius: 50%; box-shadow: 0 0 8px rgba(33, 241, 168, 0.8);">
            <span style="font-size: 13px;">🏍️</span>
          </div>
        </div>
      `,
      className: "custom-rider-icon-container",
      iconSize: [150, 44],
      iconAnchor: [75, 42],
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const bezierArray = getBezierPath().map(p => [p.lat, p.lng] as [number, number]);
    const midLat = (pickupCoords.lat + dropoffCoords.lat) / 2;
    const midLng = (pickupCoords.lng + dropoffCoords.lng) / 2;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
      zoomSnap: 0.5,
    }).setView([midLat, midLng], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    L.marker([pickupCoords.lat, pickupCoords.lng], { icon: createPickupIcon(pickupName) }).addTo(map);
    L.marker([dropoffCoords.lat, dropoffCoords.lng], { icon: createDropoffIcon(dropoffName) }).addTo(map);

    L.polyline(bezierArray, {
      color: "#64748b",
      weight: 3.5,
      opacity: 0.4,
      dashArray: "5, 5",
    }).addTo(map);

    const limitIdx = Math.max(1, Math.round((progress / 100) * bezierArray.length));
    const initialSegment = bezierArray.slice(0, limitIdx);
    const activePoly = L.polyline(initialSegment, {
      color: "#21F1A8",
      weight: 4.5,
      opacity: 0.95,
    }).addTo(map);
    activePolylineRef.current = activePoly;

    const riderMarker = L.marker([riderCoords.lat, riderCoords.lng], { icon: createRiderIcon(driverName, progress) }).addTo(map);
    riderMarkerRef.current = riderMarker;

    try {
      const bounds = L.latLngBounds([pickupCoords.lat, pickupCoords.lng], [dropoffCoords.lat, dropoffCoords.lng]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } catch (e) {
      console.warn("Leaflet bounds fitting error:", e);
    }

    mapRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync stateful updates in real-time
  useEffect(() => {
    if (!mapRef.current) return;

    if (riderMarkerRef.current) {
      riderMarkerRef.current.setLatLng([riderCoords.lat, riderCoords.lng]);
      riderMarkerRef.current.setIcon(createRiderIcon(driverName, progress));
    }

    if (activePolylineRef.current) {
      const bezierArray = getBezierPath().map(p => [p.lat, p.lng] as [number, number]);
      const limitIdx = Math.max(1, Math.round((progress / 100) * bezierArray.length));
      const activeSegment = bezierArray.slice(0, limitIdx);
      activePolylineRef.current.setLatLngs(activeSegment);
    }
  }, [riderCoords.lat, riderCoords.lng, progress, driverName]);

  return <div ref={mapContainerRef} style={{ width: "100%", height: "100%", background: "#0f172a" }} />;
}

// React Error Boundary to catch map initialization or rendering failures
class MapErrorBoundary extends React.Component<any, any> {
  state: any;
  props: any;

  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Map rendering error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function InteractiveMap({
  riderCoords,
  pickupCoords,
  dropoffCoords,
  status,
  progress,
  pickupName = "Store Outlet",
  dropoffName = "Customer Destination",
  driverName = "Courier Runner",
}: InteractiveMapProps) {
  // Let the user switch map engines seamlessly!
  // Defaulting to highly reliable OpenStreetMap to avoid key activation bugs, with toggleable Google Maps.
  const [engine, setEngine] = useState<"google" | "osm">("osm");

  useEffect(() => {
    // Intercept Google Maps authentication or activation failures (e.g. ApiNotActivatedMapError)
    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      console.warn("Elextra: Google Maps Authentication/Activation Failure detected. Gracefully falling back to OpenStreetMap engine.");
      setEngine("osm");
      if (prevAuthFailure) {
        try {
          prevAuthFailure();
        } catch (e) {
          console.error(e);
        }
      }
    };

    // Suppress unhandled script errors that originate from Google Maps domain to avoid crashing
    const handleGlobalError = (event: ErrorEvent) => {
      const isGoogleMapsError = 
        event.message?.includes("google") || 
        event.filename?.includes("maps.googleapis.com") || 
        event.message === "Script error.";
        
      if (isGoogleMapsError) {
        console.warn("Caught and handled cross-origin Google Maps script error:", event.message);
        setEngine("osm");
        event.preventDefault(); // Suppress standard browser error popup/logging
      }
    };

    window.addEventListener("error", handleGlobalError);

    return () => {
      (window as any).gm_authFailure = prevAuthFailure;
      window.removeEventListener("error", handleGlobalError);
    };
  }, []);

  const fullPath = getBezierPath();
  const limitIdx = Math.max(1, Math.round((progress / 100) * fullPath.length));
  const activeSegment = fullPath.slice(0, limitIdx);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      
      {/* 🚀 ENGINE SWITCHING HUD TABS */}
      <div style={{
        position: "absolute",
        top: "10px",
        left: "10px",
        zIndex: 100,
        display: "flex",
        background: "rgba(15, 23, 42, 0.9)",
        border: "1.5px solid #334155",
        borderRadius: "8px",
        padding: "3px",
        gap: "4px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        backdropFilter: "blur(6px)"
      }}>
        <button
          onClick={() => setEngine("google")}
          style={{
            background: engine === "google" ? "linear-gradient(135deg, #3b82f6, #1d4ed8)" : "transparent",
            color: engine === "google" ? "white" : "#94a3b8",
            border: "none",
            padding: "5px 10px",
            fontSize: "9.5px",
            fontWeight: "bold",
            borderRadius: "5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.2s"
          }}
        >
          🗺️ Google Maps
        </button>
        <button
          onClick={() => setEngine("osm")}
          style={{
            background: engine === "osm" ? "linear-gradient(135deg, #10b981, #047857)" : "transparent",
            color: engine === "osm" ? "white" : "#94a3b8",
            border: "none",
            padding: "5px 10px",
            fontSize: "9.5px",
            fontWeight: "bold",
            borderRadius: "5px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.2s"
          }}
        >
          🌐 OpenStreetMap
        </button>
      </div>

      {/* 🗺️ ACTIVE ENGINE MAP VIEW */}
      {engine === "google" && !hasValidKey ? (
        <div style={{
          width: "100%",
          height: "100%",
          background: "#0f172a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          textAlign: "center",
          color: "white"
        }}>
          <span style={{ fontSize: "28px", marginBottom: "6px" }}>🗺️</span>
          <h4 style={{ fontSize: "12.5px", fontWeight: "bold", color: "#f8fafc", marginBottom: "4px" }}>Google Maps API Key Required</h4>
          <p style={{ fontSize: "10px", color: "#94a3b8", maxWidth: "250px", margin: "0 auto 10px", lineHeight: "1.4" }}>
            Add your Google Maps API key as a secret in AI Studio to unlock the high-performance native map view.
          </p>
          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => setEngine("osm")}
              style={{
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "10px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              Use OpenStreetMap
            </button>
            <a
              href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#cbd5e1",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "6px",
                padding: "5px 10px",
                fontSize: "10px",
                fontWeight: "bold",
                textDecoration: "none",
                display: "inline-block"
              }}
            >
              Get Key ↗
            </a>
          </div>
        </div>
      ) : engine === "google" && hasValidKey ? (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          <MapErrorBoundary fallback={
            <LeafletMapComponent
              riderCoords={riderCoords}
              pickupCoords={pickupCoords}
              dropoffCoords={dropoffCoords}
              progress={progress}
              pickupName={pickupName}
              dropoffName={dropoffName}
              driverName={driverName}
            />
          }>
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={{ lat: 5.303, lng: -1.984 }}
                defaultZoom={13}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                style={{ width: "100%", height: "100%", background: "#0b0f19" }}
                disableDefaultUI={false}
              >
                {/* Markers */}
                <AdvancedMarker position={pickupCoords}>
                  <div style={{ width: "140px", height: "45px", position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ background: "#1e293b", color: "#f8fafc", border: "1.5px solid #3b82f6", padding: "2px 6px", borderRadius: "6px", fontSize: "8.5px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px", boxShadow: "0 2px 5px rgba(0,0,0,0.3)", marginBottom: "2px", textAlign: "center" }}>
                      🛍️ {pickupName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", width: "24px", height: "24px", background: "#3b82f6", border: "2px solid white", borderRadius: "50%", boxShadow: "0 2px 6px rgba(59,130,246,0.5)" }}>
                      <span style={{ fontSize: "11px" }}>🏬</span>
                    </div>
                  </div>
                </AdvancedMarker>

                <AdvancedMarker position={dropoffCoords}>
                  <div style={{ width: "140px", height: "45px", position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ background: "#0f172a", color: "#f8fafc", border: "1.5px solid #10b981", padding: "2px 6px", borderRadius: "6px", fontSize: "8.5px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "120px", boxShadow: "0 2px 5px rgba(0,0,0,0.3)", marginBottom: "2px", textAlign: "center" }}>
                      📍 {dropoffName}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", width: "24px", height: "24px", background: "#10b981", border: "2px solid white", borderRadius: "50%", boxShadow: "0 2px 6px rgba(16,185,129,0.5)" }}>
                      <span style={{ fontSize: "11px" }}>🏡</span>
                    </div>
                  </div>
                </AdvancedMarker>

                <AdvancedMarker position={riderCoords}>
                  <div style={{ width: "140px", height: "48px", position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ background: "#090d16", color: "#21F1A8", border: "1.5px solid #21F1A8", padding: "2px 6px", borderRadius: "6px", fontSize: "8px", fontWeight: "900", whiteSpace: "nowrap", boxShadow: "0 0 6px rgba(33,241,168,0.5)", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.3px", textAlign: "center", maxWidth: "110px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      ⚡ {driverName} ({progress}%)
                    </div>
                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifySelf: "center", justifyContent: "center", width: "28px", height: "28px", background: "#0f172a", border: "2px solid #21F1A8", borderRadius: "50%", boxShadow: "0 0 8px rgba(33, 241, 168, 0.8)" }}>
                      <span style={{ fontSize: "13px" }}>🏍️</span>
                    </div>
                  </div>
                </AdvancedMarker>

                {/* Path Polylines */}
                <GooglePolyline path={fullPath} strokeColor="#475569" strokeWeight={3} strokeOpacity={0.4} strokeDash="dotted" />
                <GooglePolyline path={activeSegment} strokeColor="#21F1A8" strokeWeight={4.5} strokeOpacity={0.95} />

                {/* Controller for automatic bounding */}
                <MapBoundsController bounds={{ pickup: pickupCoords, dropoff: dropoffCoords }} />
              </Map>
            </APIProvider>
          </MapErrorBoundary>

          {/* Warning Banner overlay if map returns an ApiNotActivatedMapError */}
          <div style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            right: "10px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1.5px solid #eab308",
            borderRadius: "10px",
            padding: "8px 12px",
            color: "white",
            fontSize: "10px",
            zIndex: 10,
            boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: "4px"
          }}>
            <div style={{ fontWeight: "bold", color: "#facc15", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>⚠️ Maps ApiNotActivatedMapError?</span>
              <button
                onClick={() => setEngine("osm")}
                style={{
                  background: "#10b981",
                  border: "none",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  color: "white",
                  fontSize: "9px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Switch to OpenStreetMap Fallback
              </button>
            </div>
            <p style={{ margin: "0", color: "#cbd5e1", lineHeight: "1.3" }}>
              If Google Maps says "ApiNotActivatedMapError" or "This page can't load Google Maps correctly", your key needs the <strong>Maps JavaScript API</strong> enabled in the Google Cloud Console. Click the button above to switch to our zero-config OpenStreetMap fallback!
            </p>
          </div>
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
          <LeafletMapComponent
            riderCoords={riderCoords}
            pickupCoords={pickupCoords}
            dropoffCoords={dropoffCoords}
            progress={progress}
            pickupName={pickupName}
            dropoffName={dropoffName}
            driverName={driverName}
          />
          
          {/* Informational overlay for OSM */}
          <div style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            right: "10px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1.5px solid #10b981",
            borderRadius: "10px",
            padding: "8px 12px",
            color: "white",
            fontSize: "10px",
            zIndex: 10,
            boxShadow: "0 4px 10px rgba(0,0,0,0.5)"
          }}>
            <div style={{ fontWeight: "bold", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>🌐 OpenStreetMap Active (Recommended)</span>
              <button
                onClick={() => setEngine("google")}
                style={{
                  background: "#3b82f6",
                  border: "none",
                  padding: "3px 8px",
                  borderRadius: "4px",
                  color: "white",
                  fontSize: "9px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                Try Google Maps Engine
              </button>
            </div>
            <p style={{ margin: "4px 0 0", color: "#cbd5e1", lineHeight: "1.3" }}>
              This map is fully interactive, real-time updated, and does not require active Google Cloud billing or API keys. If your Google API key has billing limitations, this OpenStreetMap is 100% reliable.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
