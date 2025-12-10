import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Route, VehicleLocation, Stop } from '@/types/transit';

interface BusMapProps {
  routes: Route[];
  vehicles: VehicleLocation[];
  selectedRoute: string | null;
  selectedStop: Stop | null;
  onStopClick: (stop: Stop, route: Route) => void;
}

const BusMap = ({ routes, vehicles, selectedRoute, selectedStop, onStopClick }: BusMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const polylinesRef = useRef<L.LayerGroup | null>(null);
  const vehicleMarkersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      center: [36.9850, -86.4550],
      zoom: 15,
      zoomControl: false,
    });

    // Dark theme tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(mapRef.current);

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    markersRef.current = L.layerGroup().addTo(mapRef.current);
    polylinesRef.current = L.layerGroup().addTo(mapRef.current);
    vehicleMarkersRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Filter routes based on selection
  const displayedRoutes = useMemo(() => {
    if (selectedRoute) {
      return routes.filter(r => r.tag === selectedRoute);
    }
    return routes;
  }, [routes, selectedRoute]);

  // Update polylines (routes)
  useEffect(() => {
    if (!polylinesRef.current) return;
    polylinesRef.current.clearLayers();

    displayedRoutes.forEach(route => {
      const color = `#${route.color === '000000' ? '6B7280' : route.color}`;
      
      route.paths.forEach(path => {
        const latLngs = path.map(point => [point.lat, point.lon] as [number, number]);
        L.polyline(latLngs, {
          color,
          weight: 4,
          opacity: 0.8,
        }).addTo(polylinesRef.current!);
      });
    });
  }, [displayedRoutes]);

  // Update stop markers
  useEffect(() => {
    if (!markersRef.current) return;
    markersRef.current.clearLayers();

    // Collect unique stops
    const stopsMap = new Map<string, { stop: Stop; route: Route }>();
    displayedRoutes.forEach(route => {
      route.stops.forEach(stop => {
        if (!stopsMap.has(stop.tag)) {
          stopsMap.set(stop.tag, { stop, route });
        }
      });
    });

    stopsMap.forEach(({ stop, route }) => {
      const isSelected = selectedStop?.tag === stop.tag;
      const color = route.color === '000000' ? '6B7280' : route.color;
      
      const icon = L.divIcon({
        className: 'custom-stop-marker',
        html: `
          <div style="
            width: ${isSelected ? '20px' : '14px'};
            height: ${isSelected ? '20px' : '14px'};
            background-color: #${color};
            border: 3px solid ${isSelected ? '#ffffff' : 'hsl(222, 47%, 11%)'};
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            transition: all 0.2s ease;
          "></div>
        `,
        iconSize: [isSelected ? 20 : 14, isSelected ? 20 : 14],
        iconAnchor: [isSelected ? 10 : 7, isSelected ? 10 : 7],
      });

      const marker = L.marker([stop.lat, stop.lon], { icon })
        .bindPopup(`
          <div style="padding: 4px;">
            <strong style="font-size: 14px;">${stop.title}</strong>
            <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
              ${route.title}
            </div>
            <div style="font-size: 11px; opacity: 0.5; margin-top: 2px;">
              Stop ID: ${stop.stopId}
            </div>
          </div>
        `)
        .on('click', () => onStopClick(stop, route));

      marker.addTo(markersRef.current!);
    });
  }, [displayedRoutes, selectedStop, onStopClick]);

  // Update vehicle markers
  useEffect(() => {
    if (!vehicleMarkersRef.current) return;
    vehicleMarkersRef.current.clearLayers();

    const displayedRouteTags = new Set(displayedRoutes.map(r => r.tag));
    const filteredVehicles = vehicles.filter(v => displayedRouteTags.has(v.routeTag));

    filteredVehicles.forEach(vehicle => {
      const route = routes.find(r => r.tag === vehicle.routeTag);
      const color = route ? (route.color === '000000' ? '6B7280' : route.color) : '6B7280';
      
      const icon = L.divIcon({
        className: 'custom-bus-marker',
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(${vehicle.heading}deg);
          ">
            <div style="
              width: 28px;
              height: 28px;
              background-color: #${color};
              border: 3px solid #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
              </svg>
            </div>
            <div style="
              position: absolute;
              top: -4px;
              left: 50%;
              transform: translateX(-50%);
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-bottom: 8px solid #${color};
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      L.marker([vehicle.lat, vehicle.lon], { icon })
        .bindPopup(`
          <div style="padding: 4px;">
            <strong>Bus ${vehicle.id}</strong>
            <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
              ${route?.title || vehicle.routeTag}
            </div>
            <div style="font-size: 11px; opacity: 0.5; margin-top: 2px;">
              Speed: ${Math.round(vehicle.speedKmHr)} km/h
            </div>
          </div>
        `)
        .addTo(vehicleMarkersRef.current!);
    });
  }, [vehicles, displayedRoutes, routes]);

  // Center on selected stop
  useEffect(() => {
    if (selectedStop && mapRef.current) {
      mapRef.current.setView([selectedStop.lat, selectedStop.lon], 17, {
        animate: true,
        duration: 0.5,
      });
    }
  }, [selectedStop]);

  return (
    <div ref={mapContainerRef} className="w-full h-full" />
  );
};

export default BusMap;
