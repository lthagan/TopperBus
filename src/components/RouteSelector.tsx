import { Route } from '@/types/transit';
import { cn } from '@/lib/utils';

interface RouteSelectorProps {
  routes: Route[];
  selectedRoute: string | null;
  onSelectRoute: (routeTag: string | null) => void;
}

const RouteSelector = ({ routes, selectedRoute, onSelectRoute }: RouteSelectorProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button
        onClick={() => onSelectRoute(null)}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
          selectedRoute === null
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        )}
      >
        All Routes
      </button>
      
      {routes.map(route => {
        const color = route.color === '000000' ? '6B7280' : route.color;
        const isSelected = selectedRoute === route.tag;
        
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
            {route.title.replace('Route ', '')}
          </button>
        );
      })}
    </div>
  );
};

export default RouteSelector;
