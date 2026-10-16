import { useState } from 'react';
import { AlertTriangle, ChevronDown } from 'lucide-react';
import { Route, VehicleLocation } from '@/types/transit';
import { cn } from '@/lib/utils';
import { getCurrentBreakPeriod, formatBreakDates } from '@/lib/academicCalendar';

interface ServiceNoticeProps {
  routes: Route[];
  vehicles: VehicleLocation[];
}

interface Notice {
  summary: string;
  details: React.ReactNode[];
}

// Service hours: Mon-Fri, roughly 7:15 AM - 5:30 PM
const SERVICE_START = 7 * 60 + 15;
const SERVICE_END = 17 * 60 + 30;

function getNotice(routes: Route[], vehicles: VehicleLocation[]): Notice | null {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // School break takes priority
  const breakPeriod = getCurrentBreakPeriod();
  if (breakPeriod) {
    return {
      summary: `No service · ${breakPeriod.name}`,
      details: [`Buses are out of service for ${breakPeriod.name} (${formatBreakDates(breakPeriod)}). WKU Transit operates Mon-Fri during Fall & Spring semesters only.`],
    };
  }

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      summary: 'No weekend service',
      details: ['Buses are out of service. WKU Transit operates Monday - Friday only.'],
    };
  }

  const inactiveRoutes = routes.filter(r => !vehicles.some(v => v.routeTag === r.tag));
  const isOutsideHours = currentTime < SERVICE_START || currentTime > SERVICE_END;

  if (isOutsideHours && inactiveRoutes.length === routes.length) {
    return {
      summary: 'Out of service for the day',
      details: ['Service hours are Mon-Fri, 7:15 AM - 5:30 PM.'],
    };
  }

  if (inactiveRoutes.length === 0) return null;

  const kentuckyRoute = inactiveRoutes.find(r => r.tag === 'blue' || r.title.toLowerCase().includes('kentucky'));
  const otherInactiveRoutes = inactiveRoutes.filter(r => r !== kentuckyRoute);
  const details: React.ReactNode[] = [];

  if (kentuckyRoute) {
    details.push(
      <>
        {kentuckyRoute.title} tracking is unavailable due to faulty GPS devices on buses. Contact the Transportation office at{' '}
        <a href="mailto:transportation@wku.edu" className="underline hover:text-amber-100">transportation@wku.edu</a> to voice your concern.
      </>
    );
  }
  if (otherInactiveRoutes.length > 0) {
    details.push(
      (otherInactiveRoutes.length === 1
        ? `${otherInactiveRoutes[0].title} data is currently not being updated by the transit system.`
        : `${otherInactiveRoutes.map(r => r.title.replace('Route ', '')).join(', ')} routes data is currently not being updated.`)
      + ' Live tracking may be unavailable.'
    );
  }

  return {
    summary: inactiveRoutes.length === 1
      ? `${inactiveRoutes[0].title.replace('Route ', '')} not tracking`
      : `${inactiveRoutes.length} routes not tracking`,
    details,
  };
}

const ServiceNotice = ({ routes, vehicles }: ServiceNoticeProps) => {
  const [expanded, setExpanded] = useState(false);
  const notice = getNotice(routes, vehicles);

  if (!notice) return null;

  return (
    <div className="pointer-events-auto max-w-md rounded-xl bg-card/90 backdrop-blur-md border border-amber-500/30 shadow-lg">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-amber-200/90"
        aria-expanded={expanded}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        <span className="font-medium truncate">{notice.summary}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 ml-auto flex-shrink-0 transition-transform', expanded && 'rotate-180')} />
      </button>
      {expanded && (
        <div className="px-3 pb-2.5 space-y-1.5">
          {notice.details.map((detail, i) => (
            <p key={i} className="text-xs text-amber-200/80">{detail}</p>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceNotice;
