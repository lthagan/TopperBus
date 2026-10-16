import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Route, VehicleLocation, Stop } from '@/types/transit';
import { fetchRouteConfig, fetchVehicleLocations } from '@/lib/api';
import BusMap from '@/components/BusMap';
import BusCard from '@/components/BusCard';
import RouteSelector from '@/components/RouteSelector';
import StopCard from '@/components/StopCard';
import StopList from '@/components/StopList';
import QRScanner from '@/components/QRScanner';
import BuildingCard from '@/components/BuildingCard';
import ServiceNotice from '@/components/ServiceNotice';
import { CampusBuilding } from '@/lib/campusBuildings';
import { Bus, ScanLine, Calendar, MessageSquare, Locate, X, Search, Menu, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [selectedStopRoute, setSelectedStopRoute] = useState<Route | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);
  const [selectedVehicleRoute, setSelectedVehicleRoute] = useState<Route | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<CampusBuilding | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [stopSearch, setStopSearch] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [directionsDestination, setDirectionsDestination] = useState<CampusBuilding | null>(null);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      try {
        const routeData = await fetchRouteConfig();
        setRoutes(routeData);
        
        const vehicleData = await fetchVehicleLocations();
        setVehicles(vehicleData);
        
        // Check for stop param in URL
        const stopParam = searchParams.get('stop');
        if (stopParam && routeData.length > 0) {
          selectStopById(stopParam, routeData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Failed to load bus data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Refresh vehicle locations periodically and update selected vehicle position
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const vehicleData = await fetchVehicleLocations();
        setVehicles(vehicleData);
        
        // Update selected vehicle with new position
        if (selectedVehicle) {
          const updatedVehicle = vehicleData.find(v => v.id === selectedVehicle.id);
          if (updatedVehicle) {
            setSelectedVehicle(updatedVehicle);
          }
        }
      } catch (error) {
        console.error('Error refreshing vehicles:', error);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedVehicle?.id]);

  const selectStopById = (stopId: string, routeData: Route[] = routes) => {
    for (const route of routeData) {
      const stop = route.stops.find(s => s.stopId === stopId || s.tag === stopId);
      if (stop) {
        openStop(stop, route);
        return;
      }
    }
    toast.error('Stop not found');
  };

  const closeList = useCallback(() => {
    setListOpen(false);
    setStopSearch('');
    searchInputRef.current?.blur();
  }, []);

  const openStop = useCallback((stop: Stop, route: Route) => {
    setSelectedStop(stop);
    setSelectedStopRoute(route);
    // Close other cards
    setSelectedBuilding(null);
    setSelectedVehicle(null);
    setSelectedVehicleRoute(null);
    setSearchParams({ stop: stop.stopId });
  }, [setSearchParams]);

  const handleStopClick = useCallback((stop: Stop, route: Route) => {
    closeList();
    openStop(stop, route);
  }, [closeList, openStop]);

  const handleCloseStop = useCallback(() => {
    setSelectedStop(null);
    setSelectedStopRoute(null);
    setSearchParams({});
  }, [setSearchParams]);

  const handleVehicleClick = useCallback((vehicle: VehicleLocation, route: Route) => {
    setSelectedVehicle(vehicle);
    setSelectedVehicleRoute(route);
    // Close stop card if open
    setSelectedStop(null);
    setSelectedStopRoute(null);
  }, []);

  const handleCloseVehicle = useCallback(() => {
    setSelectedVehicle(null);
    setSelectedVehicleRoute(null);
  }, []);

  const handleBuildingClick = useCallback((building: CampusBuilding) => {
    closeList();
    setSelectedBuilding(building);
    // Close other cards
    setSelectedStop(null);
    setSelectedStopRoute(null);
    setSelectedVehicle(null);
    setSelectedVehicleRoute(null);
  }, [closeList]);

  const handleCloseBuilding = useCallback(() => {
    setSelectedBuilding(null);
  }, []);

  const handleQRScan = (stopId: string) => {
    setShowScanner(false);
    selectStopById(stopId);
  };

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setIsLocating(false);
        toast.success('Location found');
      },
      (error) => {
        setIsLocating(false);
        toast.error('Unable to get your location');
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleGetDirections = useCallback((building: CampusBuilding) => {
    if (!userLocation) {
      toast.error('Please enable location first');
      return;
    }
    setDirectionsDestination(building);
    setSelectedBuilding(building);
    closeList();
    toast.success(`Getting directions to ${building.name}`);
  }, [userLocation, closeList]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Bus className="w-12 h-12 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground">Loading TopperBus...</p>
        </div>
      </div>
    );
  }

  const fabClass = "w-11 h-11 flex items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-colors";

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-background">
      {/* Full-screen map (isolate keeps Leaflet's z-indexes below the overlays) */}
      <div className="absolute inset-0 isolate">
        <BusMap
          routes={routes}
          vehicles={vehicles}
          selectedRoute={selectedRoute}
          selectedStop={selectedStop}
          selectedVehicle={selectedVehicle}
          selectedBuilding={selectedBuilding}
          onStopClick={handleStopClick}
          onVehicleClick={handleVehicleClick}
          onBuildingClick={handleBuildingClick}
          userLocation={userLocation}
          directionsDestination={directionsDestination}
          onClearDirections={() => setDirectionsDestination(null)}
        />
      </div>

      {/* Top overlay: search, route filter, service notice; expands into the stop list */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 md:right-auto md:w-[26rem] z-20 flex flex-col gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pointer-events-none",
          listOpen && "bottom-0 bg-background pointer-events-auto md:bg-transparent md:pointer-events-none"
        )}
      >
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="relative flex-1">
            {listOpen ? (
              <button
                onClick={closeList}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Close list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            )}
            <input
              ref={searchInputRef}
              type="text"
              value={stopSearch}
              onChange={(e) => setStopSearch(e.target.value)}
              onFocus={() => setListOpen(true)}
              onKeyDown={(e) => e.key === 'Escape' && closeList()}
              placeholder="Search stops & buildings"
              className="w-full h-11 pl-9 pr-9 bg-card/90 backdrop-blur-md border border-border rounded-full shadow-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {stopSearch && (
              <button
                onClick={() => setStopSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(fabClass, "bg-card/90 border-border text-foreground hover:bg-secondary")} aria-label="Menu">
                <Menu className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[1100]">
              <DropdownMenuItem asChild>
                <Link to="/schedule"><Calendar className="w-4 h-4 mr-2" />Schedule</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/feedback"><MessageSquare className="w-4 h-4 mr-2" />Feedback</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="pointer-events-auto">
          <RouteSelector
            routes={routes}
            vehicles={vehicles}
            selectedRoute={selectedRoute}
            onSelectRoute={setSelectedRoute}
          />
        </div>

        {listOpen ? (
          <div className="pointer-events-auto flex-1 min-h-0 overflow-y-auto rounded-2xl bg-card border border-border md:shadow-xl">
            <StopList
              routes={routes}
              selectedRoute={selectedRoute}
              onStopSelect={handleStopClick}
              onBuildingSelect={handleBuildingClick}
              onGetDirections={handleGetDirections}
              search={stopSearch}
              hasUserLocation={!!userLocation}
            />
          </div>
        ) : (
          <ServiceNotice routes={routes} vehicles={vehicles} />
        )}
      </div>

      {/* Bottom-right map actions (kept clear of the map attribution) */}
      <div className="absolute right-3 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-2">
        <button
          onClick={handleGetLocation}
          disabled={isLocating}
          className={cn(
            fabClass,
            userLocation
              ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
              : "bg-card/90 border-border text-foreground hover:bg-secondary",
            isLocating && "animate-pulse"
          )}
          aria-label={userLocation ? "Location enabled" : "Show my location"}
        >
          <Locate className="w-5 h-5" />
        </button>
        <button
          onClick={() => setShowScanner(true)}
          className={cn(fabClass, "bg-primary border-primary text-primary-foreground hover:bg-primary/90")}
          aria-label="Scan stop QR code"
        >
          <ScanLine className="w-5 h-5" />
        </button>
      </div>

      {directionsDestination && (
        <button
          onClick={() => setDirectionsDestination(null)}
          className="absolute left-1/2 -translate-x-1/2 bottom-[calc(2rem+env(safe-area-inset-bottom))] z-10 flex items-center gap-1.5 px-4 h-10 rounded-full bg-card/90 backdrop-blur-md border border-blue-500/40 text-blue-400 text-sm shadow-lg"
        >
          <X className="w-4 h-4" />
          Clear route
        </button>
      )}

      {/* Selected stop card */}
      {selectedStop && selectedStopRoute && (
        <StopCard
          stop={selectedStop}
          route={selectedStopRoute}
          allRoutes={routes}
          onClose={handleCloseStop}
        />
      )}

      {/* Selected bus card */}
      {selectedVehicle && selectedVehicleRoute && (
        <BusCard
          vehicle={selectedVehicle}
          route={selectedVehicleRoute}
          allRoutes={routes}
          onClose={handleCloseVehicle}
        />
      )}

      {/* Selected building card */}
      {selectedBuilding && (
        <BuildingCard
          building={selectedBuilding}
          onClose={handleCloseBuilding}
          routes={routes}
          onStopSelect={handleStopClick}
        />
      )}

      {/* QR Scanner */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
          routes={routes}
        />
      )}
    </main>
  );
};

export default Index;