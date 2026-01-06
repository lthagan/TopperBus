import { Route, Stop, Direction, PathPoint, VehicleLocation, StopPredictions, Prediction, PredictionDirection } from '@/types/transit';

const API_BASE = 'https://retro.umoiq.com/service/publicXMLFeed';
const AGENCY = 'wku';

// Maximum XML response size (1MB) to prevent DoS attacks
const MAX_RESPONSE_SIZE = 1024 * 1024;

/**
 * Sanitizes a string value extracted from XML to prevent XSS and injection attacks.
 * Removes control characters and trims whitespace.
 */
function sanitizeXMLValue(value: string | null): string {
  if (!value) return '';
  // Remove control characters (except newlines/tabs), trim, and limit length
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 500); // Reasonable max length for stop/route names
}

/**
 * Safely parses a numeric value from XML, returning a default if invalid.
 */
function safeParseFloat(value: string | null, defaultValue: number = 0): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
}

/**
 * Safely parses an integer value from XML, returning a default if invalid.
 */
function safeParseInt(value: string | null, defaultValue: number = 0): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || !isFinite(parsed) ? defaultValue : parsed;
}

async function fetchXML(url: string): Promise<Document> {
  const response = await fetch(url);
  
  // Validate response status
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  
  // Validate content type is XML
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('xml') && !contentType.includes('text/plain')) {
    throw new Error(`Unexpected content type: ${contentType}`);
  }
  
  // Check content length to prevent DoS
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
    throw new Error('Response too large');
  }
  
  const text = await response.text();
  
  // Validate response size after fetching (in case content-length header was missing)
  if (text.length > MAX_RESPONSE_SIZE) {
    throw new Error('Response too large');
  }
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  
  // Check for XML parsing errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Failed to parse XML response');
  }
  
  return doc;
}

export async function fetchRouteConfig(): Promise<Route[]> {
  const doc = await fetchXML(`${API_BASE}?command=routeConfig&a=${AGENCY}`);
  const routeElements = doc.querySelectorAll('route');
  
  const routes: Route[] = [];
  
  routeElements.forEach(routeEl => {
    const stops: Stop[] = [];
    const directions: Direction[] = [];
    const paths: PathPoint[][] = [];
    
    // Parse stops with sanitization
    routeEl.querySelectorAll(':scope > stop').forEach(stopEl => {
      stops.push({
        tag: sanitizeXMLValue(stopEl.getAttribute('tag')),
        title: sanitizeXMLValue(stopEl.getAttribute('title')),
        shortTitle: stopEl.getAttribute('shortTitle') ? sanitizeXMLValue(stopEl.getAttribute('shortTitle')) : undefined,
        lat: safeParseFloat(stopEl.getAttribute('lat')),
        lon: safeParseFloat(stopEl.getAttribute('lon')),
        stopId: sanitizeXMLValue(stopEl.getAttribute('stopId')),
      });
    });
    
    // Parse directions with sanitization
    routeEl.querySelectorAll('direction').forEach(dirEl => {
      const dirStops: string[] = [];
      dirEl.querySelectorAll('stop').forEach(stopEl => {
        dirStops.push(sanitizeXMLValue(stopEl.getAttribute('tag')));
      });
      
      directions.push({
        tag: sanitizeXMLValue(dirEl.getAttribute('tag')),
        title: sanitizeXMLValue(dirEl.getAttribute('title')),
        name: sanitizeXMLValue(dirEl.getAttribute('name')),
        useForUI: dirEl.getAttribute('useForUI') === 'true',
        stops: dirStops,
      });
    });
    
    // Parse paths with safe numeric parsing
    routeEl.querySelectorAll('path').forEach(pathEl => {
      const points: PathPoint[] = [];
      pathEl.querySelectorAll('point').forEach(pointEl => {
        points.push({
          lat: safeParseFloat(pointEl.getAttribute('lat')),
          lon: safeParseFloat(pointEl.getAttribute('lon')),
        });
      });
      if (points.length > 0) {
        paths.push(points);
      }
    });
    
    routes.push({
      tag: sanitizeXMLValue(routeEl.getAttribute('tag')),
      title: sanitizeXMLValue(routeEl.getAttribute('title')),
      color: sanitizeXMLValue(routeEl.getAttribute('color')) || '000000',
      oppositeColor: sanitizeXMLValue(routeEl.getAttribute('oppositeColor')) || 'ffffff',
      latMin: safeParseFloat(routeEl.getAttribute('latMin')),
      latMax: safeParseFloat(routeEl.getAttribute('latMax')),
      lonMin: safeParseFloat(routeEl.getAttribute('lonMin')),
      lonMax: safeParseFloat(routeEl.getAttribute('lonMax')),
      stops,
      directions,
      paths,
    });
  });
  
  return routes;
}

export async function fetchVehicleLocations(routeTag?: string): Promise<VehicleLocation[]> {
  const url = routeTag 
    ? `${API_BASE}?command=vehicleLocations&a=${AGENCY}&r=${routeTag}&t=0`
    : `${API_BASE}?command=vehicleLocations&a=${AGENCY}&t=0`;
  
  const doc = await fetchXML(url);
  const vehicleElements = doc.querySelectorAll('vehicle');
  
  const vehicles: VehicleLocation[] = [];
  
  vehicleElements.forEach(vehicleEl => {
    vehicles.push({
      id: sanitizeXMLValue(vehicleEl.getAttribute('id')),
      routeTag: sanitizeXMLValue(vehicleEl.getAttribute('routeTag')),
      dirTag: sanitizeXMLValue(vehicleEl.getAttribute('dirTag')),
      lat: safeParseFloat(vehicleEl.getAttribute('lat')),
      lon: safeParseFloat(vehicleEl.getAttribute('lon')),
      heading: safeParseFloat(vehicleEl.getAttribute('heading')),
      speedKmHr: safeParseFloat(vehicleEl.getAttribute('speedKmHr')),
      secsSinceReport: safeParseInt(vehicleEl.getAttribute('secsSinceReport')),
    });
  });
  
  return vehicles;
}

export async function fetchPredictions(stopTag: string, routeTag?: string): Promise<StopPredictions[]> {
  const url = routeTag
    ? `${API_BASE}?command=predictions&a=${AGENCY}&r=${routeTag}&s=${stopTag}`
    : `${API_BASE}?command=predictionsForMultiStops&a=${AGENCY}&stops=${stopTag}`;
  
  const doc = await fetchXML(url);
  const predictionsElements = doc.querySelectorAll('predictions');
  
  const predictions: StopPredictions[] = [];
  
  predictionsElements.forEach(predEl => {
    const directions: PredictionDirection[] = [];
    
    predEl.querySelectorAll('direction').forEach(dirEl => {
      const preds: Prediction[] = [];
      
      dirEl.querySelectorAll('prediction').forEach(pEl => {
        preds.push({
          epochTime: safeParseInt(pEl.getAttribute('epochTime')),
          seconds: safeParseInt(pEl.getAttribute('seconds')),
          minutes: safeParseInt(pEl.getAttribute('minutes')),
          isDeparture: pEl.getAttribute('isDeparture') === 'true',
          affectedByLayover: pEl.getAttribute('affectedByLayover') === 'true',
          dirTag: sanitizeXMLValue(pEl.getAttribute('dirTag')),
          vehicle: sanitizeXMLValue(pEl.getAttribute('vehicle')),
          block: sanitizeXMLValue(pEl.getAttribute('block')),
        });
      });
      
      if (preds.length > 0) {
        directions.push({
          title: sanitizeXMLValue(dirEl.getAttribute('title')),
          predictions: preds,
        });
      }
    });
    
    if (directions.length > 0) {
      predictions.push({
        stopTag: sanitizeXMLValue(predEl.getAttribute('stopTag')),
        stopTitle: sanitizeXMLValue(predEl.getAttribute('stopTitle')),
        routeTag: sanitizeXMLValue(predEl.getAttribute('routeTag')),
        routeTitle: sanitizeXMLValue(predEl.getAttribute('routeTitle')),
        directions,
      });
    }
  });
  
  return predictions;
}

export async function fetchAllPredictionsForStop(routes: Route[], stopTag: string): Promise<StopPredictions[]> {
  // Find all routes that have this stop
  const routesWithStop = routes.filter(route => 
    route.stops.some(stop => stop.tag === stopTag)
  );
  
  const allPredictions: StopPredictions[] = [];
  
  for (const route of routesWithStop) {
    const preds = await fetchPredictions(stopTag, route.tag);
    allPredictions.push(...preds);
  }
  
  return allPredictions;
}
