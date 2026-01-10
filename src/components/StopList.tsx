import { Route, Stop } from '@/types/transit';
import { MapPin, Navigation, Bus } from 'lucide-react';
import { useMemo } from 'react';
import { CAMPUS_BUILDINGS, CampusBuilding, CATEGORY_ICONS } from '@/lib/campusBuildings';

interface StopListProps {
  routes: Route[];
  selectedRoute: string | null;
  onStopSelect: (stop: Stop, route: Route) => void;
  onBuildingSelect?: (building: CampusBuilding) => void;
  onGetDirections?: (building: CampusBuilding) => void;
  search: string;
  hasUserLocation?: boolean;
}

const StopList = ({ 
  routes, 
  selectedRoute, 
  onStopSelect, 
  onBuildingSelect,
  onGetDirections,
  search,
  hasUserLocation
}: StopListProps) => {

  const filteredStops = useMemo(() => {
    const displayedRoutes = selectedRoute 
      ? routes.filter(r => r.tag === selectedRoute)
      : routes;

    const stopsMap = new Map<string, { stop: Stop; routes: Route[] }>();
    
    displayedRoutes.forEach(route => {
      route.stops.forEach(stop => {
        // Use lat/lon as key to merge stops at the same location (rounded to ~11m precision)
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

    return Array.from(stopsMap.values())
      .filter(({ stop }) => 
        !search.trim() ||
        stop.title.toLowerCase().includes(search.toLowerCase()) ||
        (stop.shortTitle && stop.shortTitle.toLowerCase().includes(search.toLowerCase())) ||
        stop.stopId.includes(search)
      )
      .sort((a, b) => a.stop.title.localeCompare(b.stop.title));
  }, [routes, selectedRoute, search]);

  const filteredBuildings = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    const buildings = searchLower
      ? CAMPUS_BUILDINGS.filter(
          b =>
            b.name.toLowerCase().includes(searchLower) ||
            b.abbreviation.toLowerCase().includes(searchLower) ||
            b.department.toLowerCase().includes(searchLower) ||
            b.categories.some(c => c.toLowerCase().includes(searchLower))
        )
      : CAMPUS_BUILDINGS;
    return buildings.slice(0, 20);
  }, [search]);

  const handleDirections = (e: React.MouseEvent, building: CampusBuilding) => {
    e.stopPropagation();
    if (onGetDirections) {
      onGetDirections(building);
    }
  };

  const showBuildings = filteredBuildings.length > 0;
  const hasResults = filteredStops.length > 0 || showBuildings;

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {!hasResults ? (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No stops or buildings found</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {/* Buildings Section */}
          {showBuildings && (
            <>
              <div className="px-4 py-2 bg-secondary/50 sticky top-0 z-10">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <MapPin className="w-3.5 h-3.5" />
                  Points of Interest ({filteredBuildings.length})
                </div>
              </div>
              {filteredBuildings.map((building) => {
                const primaryCategory = building.categories[0];
                const iconData = CATEGORY_ICONS[primaryCategory];
                
                return (
                  <button
                    key={building.id}
                    onClick={() => onBuildingSelect?.(building)}
                    className="w-full p-4 text-left hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 16 16" className="text-foreground">
                            <path d={iconData.path} fill="currentColor" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground truncate">
                            {building.name}
                          </h4>
                          <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded flex-shrink-0">
                            {building.abbreviation}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {building.department}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {building.categories.slice(0, 2).map(cat => (
                            <span
                              key={cat}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-primary/10 text-primary"
                            >
                              {CATEGORY_ICONS[cat].label}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {hasUserLocation && onGetDirections && (
                          <button
                            onClick={(e) => handleDirections(e, building)}
                            className="p-2 rounded-lg hover:bg-primary/20 text-primary transition-colors"
                            title="Get directions"
                          >
                            <Navigation className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {/* Stops Section */}
          {filteredStops.length > 0 && (
            <>
              <div className="px-4 py-2 bg-secondary/50 sticky top-0 z-10">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Bus className="w-3.5 h-3.5" />
                  Bus Stops ({filteredStops.length})
                </div>
              </div>
              {filteredStops.map(({ stop, routes: stopRoutes }) => (
                <button
                  key={`${stop.lat.toFixed(4)},${stop.lon.toFixed(4)}`}
                  onClick={() => onStopSelect(stop, stopRoutes[0])}
                  className="w-full p-4 text-left hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {stop.shortTitle || stop.title}
                      </h4>
                      {stop.stopId && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Stop #{stop.stopId}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {stopRoutes.map(route => {
                          const color = route.color === '000000' ? '6B7280' : route.color;
                          return (
                            <span
                              key={route.tag}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                              style={{ 
                                backgroundColor: `#${color}20`,
                                color: `#${color}`,
                              }}
                            >
                              <span 
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: `#${color}` }}
                              />
                              {route.title.replace('Route ', '').split(' ')[0]}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StopList;