import { useState, useEffect, useRef } from 'react';
import { CampusBuilding, CATEGORY_ICONS } from '@/lib/campusBuildings';
import { X, MapPin, GraduationCap, History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuildingCardProps {
  building: CampusBuilding;
  onClose: () => void;
}

const BuildingCard = ({ building, onClose }: BuildingCardProps) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isOpening, setIsOpening] = useState(true);
  const [panelHeight, setPanelHeight] = useState(55);
  const [isDragging, setIsDragging] = useState(false);
  const [dragTranslateY, setDragTranslateY] = useState(0);
  
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  // Heights in vh - collapsed shows just drag handle + title
  const collapsedHeight = 12; // Minimal header with drag handle
  const minHeight = 55;
  const maxHeight = 80;

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

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - dragStartY.current;
      const windowHeight = window.innerHeight;
      const deltaPercent = (deltaY / windowHeight) * 100;
      
      // Calculate new height (dragging down = smaller panel = positive deltaY = subtract from height)
      const newHeight = dragStartHeight.current - deltaPercent;
      
      // If trying to drag beyond max, show translate effect for dismiss gesture
      if (newHeight > maxHeight) {
        const overDrag = newHeight - maxHeight;
        setDragTranslateY(overDrag * 2); // Translate down for dismiss
        setPanelHeight(maxHeight);
        return;
      }
      
      setDragTranslateY(0);
      setPanelHeight(Math.max(collapsedHeight, Math.min(maxHeight, newHeight)));
    };

    const handleDragEnd = () => {
      if (!isDragging) return;
      setIsDragging(false);
      
      // If dragged down significantly past max, dismiss
      if (dragTranslateY > 50) {
        handleClose();
        return;
      }
      
      setDragTranslateY(0);
      
      // Snap to nearest breakpoint: collapsed, min, or max
      const current = panelHeight;
      const collapseThreshold = (collapsedHeight + minHeight) / 2;
      const expandThreshold = (minHeight + maxHeight) / 2;
      
      if (current < collapseThreshold) {
        setPanelHeight(collapsedHeight);
      } else if (current < expandThreshold) {
        setPanelHeight(minHeight);
      } else {
        setPanelHeight(maxHeight);
      }
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
  }, [isDragging, panelHeight, dragTranslateY]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  const isCollapsed = panelHeight <= collapsedHeight + 2;

  return (
    <>
      <div 
        ref={panelRef}
        className={cn(
          "fixed top-0 left-0 right-0 bg-card border-b border-border rounded-b-2xl shadow-2xl z-[1000] flex flex-col",
          isClosing ? "-translate-y-full" : isOpening ? "-translate-y-full" : ""
        )}
        style={{ 
          height: `${panelHeight}vh`,
          transform: isClosing ? undefined : isOpening ? undefined : `translateY(${dragTranslateY}px)`,
          transition: isDragging ? 'none' : 'height 0.2s ease-out, transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
        }}
      >
        {/* Drag handle at top */}
        <div 
          className="flex-shrink-0 pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing touch-none select-none"
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40" />
        </div>

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
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold">
                        {building.abbreviation}
                      </span>
                      {building.categories.map((cat) => (
                        <span key={cat} className="px-2 py-0.5 rounded bg-secondary text-muted-foreground text-xs">
                          {CATEGORY_ICONS[cat].label}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mt-1">
                      {building.name}
                    </h3>
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
              {/* Building Image Placeholder */}
              <div className="w-full h-40 rounded-xl bg-secondary mb-4 flex items-center justify-center overflow-hidden">
                <div className="text-center text-muted-foreground">
                  <svg width="48" height="48" viewBox="0 0 16 16" className="mx-auto mb-2 opacity-50 fill-current">
                    <path d={CATEGORY_ICONS[building.categories[0]].path} />
                  </svg>
                  <p className="text-sm">Building Image</p>
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

              {/* Location */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium text-sm">{building.lat.toFixed(5)}, {building.lon.toFixed(5)}</p>
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
      </div>
    </>
  );
};

export default BuildingCard;
