import { Route, VehicleLocation } from '@/types/transit';
import { cn } from '@/lib/utils';
import { Bus } from 'lucide-react';

interface RouteSelectorProps {
  routes: Route[];
  vehicles: VehicleLocation[];
  selectedRoute: string | null;
  onSelectRoute: (routeTag: string | null) => void;
}

const RouteSelector = ({ routes, vehicles, selectedRoute, onSelectRoute }: RouteSelectorProps) => {
  // Count vehicles per route
  const vehicleCountByRoute = routes.reduce((acc, route) => {
    acc[route.tag] = vehicles.filter(v => v.routeTag === route.tag).length;
    return acc;
  }, {} as Record<string, number>);

  const totalActive = vehicles.length;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelectRoute(null)}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2",
          selectedRoute === null
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
      >
        <span>All Routes</span>
        <span className={cn(
          "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full",
          selectedRoute === null ? "bg-primary-foreground/20" : "bg-muted"
        )}>
          <Bus className="w-3 h-3" />
          {totalActive}
        </span>
      </button>
      
      {routes.map(route => {
        const color = route.color === '000000' ? '6B7280' : route.color;
        const isSelected = selectedRoute === route.tag;
        const busCount = vehicleCountByRoute[route.tag] || 0;
        
        return (
          <button
            key={route.tag}
            onClick={() => onSelectRoute(route.tag)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-2",
              isSelected
                ? "text-white shadow-lg"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
            style={isSelected ? { backgroundColor: `#${color}`, boxShadow: `0 10px 20px -10px #${color}80` } : {}}
          >
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: `#${color}` }}
            />
            <span>{route.title.replace('Route ', '')}</span>
            <span className={cn(
              "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full",
              isSelected ? "bg-white/20" : "bg-muted",
              busCount === 0 && "opacity-50"
            )}>
              <Bus className="w-3 h-3" />
              {busCount}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default RouteSelector;
