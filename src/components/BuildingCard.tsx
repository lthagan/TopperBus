import { useState, useEffect, useRef, useMemo } from 'react';
import { CampusBuilding, CATEGORY_ICONS } from '@/lib/campusBuildings';
import { Route, Stop } from '@/types/transit';
import { X, MapPin, GraduationCap, History, Bus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuildingCardProps {
  building: CampusBuilding;
  onClose: () => void;
  routes?: Route[];
  onStopSelect?: (stop: Stop, route: Route) => void;
}

// Calculate distance between two points in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const BuildingCard = ({ building, onClose, routes = [], onStopSelect }: BuildingCardProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [panelHeight, setPanelHeight] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTranslateY, setDragTranslateY] = useState(0);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const collapsedHeight = 12;
  const minHeight = 55;
  const maxHeight = 80;

  // Calculate closest stops with all routes that serve them
  const closestStops = useMemo(() => {
    if (!routes.length) return [];
    
    // First, collect all stops with their location key
    const stopsByLocation = new Map<string, { stop: Stop; routes: Route[]; distance: number }>();
    
    routes.forEach(route => {
      route.stops.forEach(stop => {
        const locationKey = `${stop.lat.toFixed(4)},${stop.lon.toFixed(4)}`;
        
        if (stopsByLocation.has(locationKey)) {
          // Add this route to existing stop entry
          const existing = stopsByLocation.get(locationKey)!;
          if (!existing.routes.find(r => r.tag === route.tag)) {
            existing.routes.push(route);
          }
        } else {
          const distance = calculateDistance(
            building.lat,
            building.lon,
            stop.lat,
            stop.lon
          );
          stopsByLocation.set(locationKey, { stop, routes: [route], distance });
        }
      });
    });
    
    return Array.from(stopsByLocation.values())
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [building, routes]);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpening(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartHeight.current = panelHeight;
    setDragTranslateY(0);
  };

  const isCollapsedRef = useRef(false);
  isCollapsedRef.current = panelHeight <= collapsedHeight + 2;
  const isCollapsed = isCollapsedRef.current;

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - dragStartY.current;
      const windowHeight = window.innerHeight;
      const deltaPercent = (deltaY / windowHeight) * 100;
      
      // Drag DOWN (positive deltaY) = expand panel, drag UP (negative deltaY) = shrink panel
      const newHeight = dragStartHeight.current + deltaPercent;
      
      // Check collapsed state based on current calculation
      const currentHeight = Math.max(collapsedHeight, Math.min(maxHeight, newHeight));
      const wouldBeCollapsed = currentHeight <= collapsedHeight + 2;
      
      // If already collapsed and trying to shrink more (drag up), prepare for dismiss
      if (wouldBeCollapsed && deltaY < 0 && dragStartHeight.current <= collapsedHeight + 2) {
        setDragTranslateY(deltaY);
        return;
      }
      
      setDragTranslateY(0);
      setPanelHeight(currentHeight);
    };

    const handleDragEnd = () => {
      if (!isDragging) return;
      setIsDragging(false);
      
      if (isCollapsed && dragTranslateY < -50) {
        handleClose();
        return;
      }
      
      setDragTranslateY(0);
      // No snapping - card stays where user dragged it
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, panelHeight, dragTranslateY, isCollapsed]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <>
      <div 
        ref={panelRef}
        className={cn(
          "fixed top-0 left-0 right-0 bg-card border-b border-border rounded-b-2xl shadow-2xl z-[1000] flex flex-col pt-[env(safe-area-inset-top)]",
          isClosing ? "-translate-y-full" : isOpening ? "-translate-y-full" : ""
        )}
        style={{ 
          height: `${panelHeight}vh`,
          transform: isClosing ? undefined : isOpening ? undefined : `translateY(${dragTranslateY}px)`,
          transition: isDragging ? 'none' : 'height 0.2s ease-out, transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          paddingTop: 'max(env(safe-area-inset-top), 12px)'
        }}
      >

        {/* Collapsed state - just show title */}
        {isCollapsed ? (
          <div 
            className="flex-1 px-4 pb-2 flex items-center justify-between cursor-pointer"
            onClick={() => setPanelHeight(minHeight)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" className="text-primary fill-current">
                  <path d={CATEGORY_ICONS[building.categories[0]].path} />
                </svg>
              </div>
              <div>
                <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold mr-2">
                  {building.abbreviation}
                </span>
                <span className="font-medium text-foreground text-sm">{building.name}</span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleClose(); }}
              className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 pb-4 border-b border-border flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 16 16" className="text-primary fill-current">
                      <path d={CATEGORY_ICONS[building.categories[0]].path} />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {building.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold">
                        {building.abbreviation}
                      </span>
                      {building.categories.map((cat) => (
                        <span key={cat} className="px-2 py-0.5 rounded bg-secondary text-muted-foreground text-xs">
                          {CATEGORY_ICONS[cat].label}
                        </span>
                      ))}
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {building.lat.toFixed(5)}, {building.lon.toFixed(5)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
            {/* Closest Stops Section - Compact */}
              {closestStops.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Bus className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-medium text-foreground">Nearest Stops</h4>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {closestStops.map(({ stop, routes: stopRoutes, distance }) => (
                      <button
                        key={`${stop.lat.toFixed(4)},${stop.lon.toFixed(4)}`}
                        onClick={() => onStopSelect?.(stop, stopRoutes[0])}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors text-left"
                      >
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {stopRoutes.map(route => {
                            const color = route.color === '000000' ? '6B7280' : route.color;
                            return (
                              <span 
                                key={route.tag}
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: `#${color}` }}
                              />
                            );
                          })}
                        </div>
                        <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                          {stop.shortTitle || stop.title}
                        </span>
                        <span className="text-xs text-primary font-medium">
                          {formatDistance(distance)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Building Image Placeholder */}
              <div className="w-full h-32 rounded-xl bg-secondary mb-4 flex items-center justify-center overflow-hidden">
                <div className="text-center text-muted-foreground">
                  <svg width="40" height="40" viewBox="0 0 16 16" className="mx-auto mb-2 opacity-50 fill-current">
                    <path d={CATEGORY_ICONS[building.categories[0]].path} />
                  </svg>
                  <p className="text-xs">Building Image</p>
                </div>
              </div>
              
              {/* Department */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="font-medium text-sm">{building.department}</p>
                </div>
              </div>

              {/* History/Description */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary">
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <History className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">About</p>
                  <p className="text-sm text-foreground/90 leading-relaxed">{building.description}</p>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Drag handle at bottom */}
        <div 
          className="flex-shrink-0 pt-2 pb-3 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none border-t border-border"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
        </div>
      </div>
    </>
  );
};

export default BuildingCard;
