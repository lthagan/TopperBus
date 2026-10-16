import { Route, VehicleLocation } from '@/types/transit';
import { cn } from '@/lib/utils';

interface RouteSelectorProps {
  routes: Route[];
  vehicles: VehicleLocation[];
  selectedRoute: string | null;
  onSelectRoute: (routeTag: string | null) => void;
}

const chipClass = "pointer-events-auto flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border shadow-md backdrop-blur-md transition-colors";
const idleClass = "bg-card/90 border-border text-foreground hover:bg-secondary";

const RouteSelector = ({ routes, vehicles, selectedRoute, onSelectRoute }: RouteSelectorProps) => {
  const vehicleCount = (tag: string) => vehicles.filter(v => v.routeTag === tag).length;

  return (
    // Wraps rather than scrolls so no route is ever hidden off-screen
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => onSelectRoute(null)}
        className={cn(
          chipClass,
          selectedRoute === null ? "bg-primary border-primary text-primary-foreground" : idleClass
        )}
      >
        All
        <span className="opacity-70">{vehicles.length}</span>
      </button>

      {routes.map(route => {
        const color = route.color === '000000' ? '6B7280' : route.color;
        const isSelected = selectedRoute === route.tag;
        const busCount = vehicleCount(route.tag);

        return (
          <button
            key={route.tag}
            // Tapping the active route again clears the filter
            onClick={() => onSelectRoute(isSelected ? null : route.tag)}
            className={cn(chipClass, isSelected ? "text-white" : idleClass)}
            style={isSelected ? { backgroundColor: `#${color}`, borderColor: `#${color}` } : undefined}
          >
            {!isSelected && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: `#${color}` }} />
            )}
            {route.title.replace('Route ', '')}
            <span className={cn("opacity-70", busCount === 0 && "opacity-40")}>{busCount}</span>
          </button>
        );
      })}
    </div>
  );
};

export default RouteSelector;
