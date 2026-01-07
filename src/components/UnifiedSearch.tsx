import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, MapPin, Navigation, Bus } from 'lucide-react';
import { CAMPUS_BUILDINGS, CampusBuilding, CATEGORY_ICONS } from '@/lib/campusBuildings';
import { Route, Stop } from '@/types/transit';
import { cn } from '@/lib/utils';

interface UnifiedSearchProps {
  routes: Route[];
  onBuildingSelect: (building: CampusBuilding) => void;
  onStopSelect: (stop: Stop, route: Route) => void;
  onGetDirections?: (building: CampusBuilding) => void;
  selectedBuilding: CampusBuilding | null;
  hasUserLocation?: boolean;
}

const UnifiedSearch = ({ 
  routes, 
  onBuildingSelect, 
  onStopSelect, 
  onGetDirections, 
  selectedBuilding, 
  hasUserLocation 
}: UnifiedSearchProps) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get unique stops across all routes
  const allStops = useMemo(() => {
    const stopsMap = new Map<string, { stop: Stop; routes: Route[] }>();
    
    routes.forEach(route => {
      route.stops.forEach(stop => {
        const locationKey = `${stop.lat.toFixed(4)},${stop.lon.toFixed(4)}`;
        const existing = stopsMap.get(locationKey);
        if (existing) {
          if (!existing.routes.find(r => r.tag === route.tag)) {
            existing.routes.push(route);
          }
        } else {
          stopsMap.set(locationKey, { stop, routes: [route] });
        }
      });
    });
    
    return Array.from(stopsMap.values());
  }, [routes]);

  const filteredBuildings = useMemo(() => {
    if (!search.trim()) return [];
    const searchLower = search.toLowerCase();
    return CAMPUS_BUILDINGS.filter(
      b =>
        b.name.toLowerCase().includes(searchLower) ||
        b.abbreviation.toLowerCase().includes(searchLower) ||
        b.department.toLowerCase().includes(searchLower) ||
        b.categories.some(c => c.toLowerCase().includes(searchLower))
    ).slice(0, 5);
  }, [search]);

  const filteredStops = useMemo(() => {
    if (!search.trim()) return [];
    const searchLower = search.toLowerCase();
    return allStops.filter(
      ({ stop }) =>
        stop.title.toLowerCase().includes(searchLower) ||
        (stop.shortTitle && stop.shortTitle.toLowerCase().includes(searchLower)) ||
        stop.stopId.includes(search)
    ).slice(0, 5);
  }, [search, allStops]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBuildingSelect = (building: CampusBuilding) => {
    onBuildingSelect(building);
    setSearch('');
    setIsOpen(false);
  };

  const handleStopSelect = (stop: Stop, route: Route) => {
    onStopSelect(stop, route);
    setSearch('');
    setIsOpen(false);
  };

  const handleDirections = (e: React.MouseEvent, building: CampusBuilding) => {
    e.stopPropagation();
    if (onGetDirections) {
      onGetDirections(building);
      setSearch('');
      setIsOpen(false);
    }
  };

  const hasResults = filteredBuildings.length > 0 || filteredStops.length > 0;
  const noResults = search.trim() && !hasResults;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search stops & buildings..."
          className="w-full pl-9 pr-8 py-2.5 bg-secondary/80 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
        />
        {search && (
          <button
            onClick={() => {
              setSearch('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto">
          {/* Stops Section */}
          {filteredStops.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Bus className="w-3.5 h-3.5" />
                  Stops
                </div>
              </div>
              {filteredStops.map(({ stop, routes: stopRoutes }) => {
                const primaryRoute = stopRoutes[0];
                const color = primaryRoute.color === '000000' ? '6B7280' : primaryRoute.color;
                
                return (
                  <div
                    key={`stop-${stop.lat.toFixed(4)},${stop.lon.toFixed(4)}`}
                    onClick={() => handleStopSelect(stop, primaryRoute)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/50 transition-colors"
                  >
                    {/* Route dots */}
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <div className="flex -space-x-1">
                        {stopRoutes.slice(0, 3).map(r => (
                          <span
                            key={r.tag}
                            className="w-3 h-3 rounded-full ring-1 ring-card"
                            style={{ backgroundColor: `#${r.color === '000000' ? '6B7280' : r.color}` }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">
                          {stop.shortTitle || stop.title}
                        </span>
                        <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          #{stop.stopId}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {stopRoutes.map(r => (
                          <span 
                            key={r.tag} 
                            className="text-xs"
                            style={{ color: `#${r.color === '000000' ? '6B7280' : r.color}` }}
                          >
                            {r.title.replace('Route ', '').split(' ')[0]}
                          </span>
                        ))}
                      </div>
                    </div>

                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Buildings Section */}
          {filteredBuildings.length > 0 && (
            <div>
              <div className={cn(
                "px-3 py-2 bg-secondary/50 border-b border-border",
                filteredStops.length > 0 && "border-t"
              )}>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5" />
                  Buildings
                </div>
              </div>
              {filteredBuildings.map((building) => {
                const primaryCategory = building.categories[0];
                const iconData = CATEGORY_ICONS[primaryCategory];
                
                return (
                  <div
                    key={building.id}
                    onClick={() => handleBuildingSelect(building)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-secondary/50 transition-colors",
                      selectedBuilding?.id === building.id && "bg-primary/10"
                    )}
                  >
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <svg width="16" height="16" viewBox="0 0 16 16" className="text-foreground">
                        <path d={iconData.path} fill="currentColor" />
                      </svg>
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground truncate">{building.name}</span>
                        <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                          {building.abbreviation}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{building.department}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBuildingSelect(building);
                        }}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Show on map"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                      {hasUserLocation && onGetDirections && (
                        <button
                          onClick={(e) => handleDirections(e, building)}
                          className="p-1.5 rounded-lg hover:bg-primary/20 text-primary transition-colors"
                          title="Get directions"
                        >
                          <Navigation className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* No results */}
      {isOpen && noResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 p-4 text-center">
          <p className="text-sm text-muted-foreground">No stops or buildings found</p>
        </div>
      )}
    </div>
  );
};

export default UnifiedSearch;
