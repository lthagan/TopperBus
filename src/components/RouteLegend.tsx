import { Route, VehicleLocation } from '@/types/transit';
import { Info } from 'lucide-react';
import { useState } from 'react';

interface RouteLegendProps {
  routes: Route[];
  vehicles: VehicleLocation[];
}

const ROUTE_PATTERNS = [
  { label: 'Solid', style: 'border-solid' },
  { label: 'Dashed', style: 'border-dashed' },
  { label: 'Dotted', style: 'border-dotted' },
];

const RouteLegend = ({ routes, vehicles }: RouteLegendProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Count vehicles per route
  const vehicleCountByRoute = routes.reduce((acc, route) => {
    acc[route.tag] = vehicles.filter(v => v.routeTag === route.tag).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="absolute bottom-20 left-4 z-[500]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-card border border-border rounded-lg shadow-lg hover:bg-secondary transition-colors"
        title="Route Legend"
      >
        <Info className="w-5 h-5 text-foreground" />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-12 left-0 w-64 bg-card border border-border rounded-lg shadow-xl p-3 animate-fade-in">
          <h4 className="text-sm font-semibold mb-2 text-foreground">Route Legend</h4>
          <div className="space-y-2">
            {routes.map((route, index) => {
              const color = route.color === '000000' ? '6B7280' : route.color;
              const busCount = vehicleCountByRoute[route.tag] || 0;
              const patternIndex = index % 3;
              
              return (
                <div key={route.tag} className="flex items-center gap-2">
                  <div 
                    className={`w-8 h-0 border-t-[3px] ${ROUTE_PATTERNS[patternIndex].style}`}
                    style={{ borderColor: `#${color}` }}
                  />
                  <span className="text-xs text-foreground flex-1 truncate">
                    {route.title}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${busCount > 0 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {busCount} bus{busCount !== 1 ? 'es' : ''}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Routes are offset when overlapping to show all lines clearly.
          </p>
        </div>
      )}
    </div>
  );
};

export default RouteLegend;
