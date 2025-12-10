import { useEffect, useState } from 'react';
import { Stop, Route, StopPredictions } from '@/types/transit';
import { fetchPredictions } from '@/lib/api';
import { Clock, MapPin, X, RefreshCw, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StopCardProps {
  stop: Stop;
  route: Route;
  allRoutes: Route[];
  onClose: () => void;
}

const StopCard = ({ stop, route, allRoutes, onClose }: StopCardProps) => {
  const [predictions, setPredictions] = useState<StopPredictions[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchAllPredictions = async () => {
    setLoading(true);
    try {
      // Find all routes that serve this stop
      const routesWithStop = allRoutes.filter(r => 
        r.stops.some(s => s.tag === stop.tag)
      );
      
      const allPreds: StopPredictions[] = [];
      for (const r of routesWithStop) {
        const preds = await fetchPredictions(stop.tag, r.tag);
        allPreds.push(...preds);
      }
      
      setPredictions(allPreds);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPredictions();
    const interval = setInterval(fetchAllPredictions, 30000);
    return () => clearInterval(interval);
  }, [stop.tag]);

  const getTimeColor = (minutes: number) => {
    if (minutes <= 1) return 'text-transit-now';
    if (minutes <= 5) return 'text-transit-soon';
    return 'text-foreground';
  };

  const getTimeBg = (minutes: number) => {
    if (minutes <= 1) return 'bg-transit-now/20';
    if (minutes <= 5) return 'bg-transit-soon/20';
    return 'bg-secondary';
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-96 bg-card border border-border rounded-t-2xl md:rounded-2xl shadow-2xl animate-slide-up z-[1000] max-h-[70vh] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: `#${route.color === '000000' ? '6B7280' : route.color}` }}
              />
              <span className="text-xs text-muted-foreground font-medium">
                Stop {stop.stopId}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground truncate">
              {stop.shortTitle || stop.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{stop.lat.toFixed(5)}, {stop.lon.toFixed(5)}</span>
          </div>
          <button
            onClick={fetchAllPredictions}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
            <span>Updated {lastUpdate.toLocaleTimeString()}</span>
          </button>
        </div>
      </div>

      {/* Predictions */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && predictions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading arrivals...</span>
            </div>
          </div>
        ) : predictions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No upcoming arrivals</p>
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.map((pred, i) => {
              const predRoute = allRoutes.find(r => r.tag === pred.routeTag);
              const color = predRoute?.color === '000000' ? '6B7280' : predRoute?.color || '6B7280';
              
              return (
                <div key={`${pred.routeTag}-${i}`} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: `#${color}` }}
                    />
                    <span className="text-sm font-medium">{pred.routeTitle}</span>
                  </div>
                  
                  {pred.directions.map((dir, j) => (
                    <div key={`${dir.title}-${j}`} className="pl-5 space-y-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ChevronRight className="w-3 h-3" />
                        <span>{dir.title}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {dir.predictions.slice(0, 4).map((p, k) => (
                          <div
                            key={k}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm font-medium",
                              getTimeBg(p.minutes),
                              getTimeColor(p.minutes)
                            )}
                          >
                            {p.minutes === 0 ? 'NOW' : `${p.minutes} min`}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StopCard;
