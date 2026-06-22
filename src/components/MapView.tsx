import { useEffect, useState } from "react";
import type { Reading, Shipment } from "@/lib/types";

export function MapView({ shipment, readings }: { shipment: Shipment; readings: Reading[] }) {
  const [LeafletMap, setLeafletMap] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // Dynamically import leaflet only on the client
    (async () => {
      const L = (await import("leaflet")).default;
      const { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } = await import("react-leaflet");
      
      // Fix leaflet icons
      const iconUrl = (await import("leaflet/dist/images/marker-icon.png")).default;
      const iconRetinaUrl = (await import("leaflet/dist/images/marker-icon-2x.png")).default;
      const shadowUrl = (await import("leaflet/dist/images/marker-shadow.png")).default;
      
      L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });
      
      const truckIcon = L.divIcon({
        className: "",
        html: `<div style="width:34px;height:34px;border-radius:50%;background:#222F5A;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;color:white;font-size:18px">🚚</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      
      const breachIcon = L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#dc2626;border:2px solid white;box-shadow:0 0 0 4px rgba(220,38,38,.25)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      
      function FitBounds({ route }: { route: Shipment["route"] }) {
        const map = useMap();
        useEffect(() => {
          if (!route.length) return;
          map.fitBounds(route.map((p) => [p.lat, p.lng] as [number, number]), { padding: [30, 30] });
        }, [map, route]);
        return null;
      }
      
      function MapContent({ shipment, readings }: { shipment: Shipment; readings: Reading[] }) {
        const last = readings[readings.length - 1];
        const truckPos: [number, number] = last
          ? [last.lat, last.lng]
          : [shipment.route[0].lat, shipment.route[0].lng];
        const breachPoints = readings.filter((r) => r.status === "breach");
      
        return (
          <MapContainer
            center={truckPos}
            zoom={9}
            style={{ height: "100%", width: "100%", borderRadius: 10 }}
            scrollWheelZoom={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />
            <FitBounds route={shipment.route} />
            <Polyline
              positions={shipment.route.map((p) => [p.lat, p.lng])}
              color="#222F5A"
              weight={4}
            />
            {breachPoints.map((point) => (
              <Marker
                key={point.id}
                position={[point.lat, point.lng]}
                icon={breachIcon}
              >
                <Popup>
                  <div className="text-sm">
                    Temperature breach: {point.temp.toFixed(1)}°C
                  </div>
                </Popup>
              </Marker>
            ))}
            <Marker position={truckPos} icon={truckIcon}>
              <Popup>
                <div className="text-sm font-bold">Current Position</div>
                {last && <div className="text-xs">Temp: {last.temp.toFixed(1)}°C</div>}
              </Popup>
            </Marker>
          </MapContainer>
        );
      }
      
      setLeafletMap(() => MapContent);
    })();
  }, []);

  if (!LeafletMap) {
    return <div className="h-full w-full bg-secondary/50 animate-pulse flex items-center justify-center text-muted-foreground">Loading map...</div>;
  }
  
  return <LeafletMap shipment={shipment} readings={readings} />;
}
