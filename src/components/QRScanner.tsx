import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, ScanLine } from 'lucide-react';

interface QRScannerProps {
  onScan: (stopId: string) => void;
  onClose: () => void;
}

const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(true);

  useEffect(() => {
    const startScanner = async () => {
      try {
        scannerRef.current = new Html5Qrcode('qr-reader');
        
        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Extract stop ID from URL or direct stop ID
            let stopId = decodedText;
            
            // Handle various URL formats
            if (decodedText.includes('stop=')) {
              const match = decodedText.match(/stop=([^&]+)/);
              if (match) stopId = match[1];
            } else if (decodedText.includes('/stop/')) {
              const parts = decodedText.split('/stop/');
              if (parts[1]) stopId = parts[1].split(/[?#]/)[0];
            }
            
            onScan(stopId);
          },
          () => {} // Ignore errors during scanning
        );
        
        setIsStarting(false);
      } catch (err) {
        console.error('Scanner error:', err);
        setError('Unable to access camera. Please check permissions.');
        setIsStarting(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[1001] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-primary" />
          <span className="font-medium">Scan Stop QR Code</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 -m-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scanner */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {error ? (
          <div className="text-center">
            <Camera className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-card border border-border">
              <div id="qr-reader" className="w-full h-full" />
              
              {/* Scan overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-8 border-2 border-primary/50 rounded-xl">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-lg" />
                </div>
                
                {/* Animated scan line */}
                <div className="absolute inset-x-8 top-8 bottom-8 overflow-hidden">
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_2s_ease-in-out_infinite]" 
                    style={{ animation: 'scan 2s ease-in-out infinite' }}
                  />
                </div>
              </div>
              
              {isStarting && (
                <div className="absolute inset-0 flex items-center justify-center bg-card">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ScanLine className="w-5 h-5 animate-pulse" />
                    <span>Starting camera...</span>
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-muted-foreground text-sm mt-6 text-center max-w-xs">
              Point your camera at a WKU bus stop QR code to view arrival times
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0; }
          50% { top: 100%; }
        }
        #qr-reader video {
          object-fit: cover !important;
          border-radius: 1rem;
        }
        #qr-reader__scan_region {
          display: none;
        }
        #qr-reader__dashboard {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
