"use client";

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";

export interface CameraRef {
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
}

interface CameraProps {
  width?: number;
  height?: number;
  onCameraReady?: () => void;
  onCameraError?: (error: string) => void;
}

const Camera = forwardRef<CameraRef, CameraProps>(function Camera(
  { width = 640, height = 480, onCameraReady, onCameraError },
  ref
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      get videoElement() {
        return videoRef.current;
      },
      get canvasElement() {
        return canvasRef.current;
      },
    }),
    []
  );

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function setupCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            facingMode: "user",
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          await new Promise<void>((resolve) => {
            if (videoRef.current) {
              videoRef.current.onloadedmetadata = () => {
                resolve();
              };
            }
          });

          await videoRef.current.play();
          setIsLoading(false);
          onCameraReady?.();
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Nem sikerült elérni a kamerát";
        setError(errorMessage);
        setIsLoading(false);
        onCameraError?.(errorMessage);
      }
    }

    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [width, height, onCameraReady, onCameraError]);

  return (
    <div className="camera-frame camera-frame--active" style={{ aspectRatio: `${width}/${height}` }}>
      <div className="camera-grid"></div>
      
      <video
        ref={videoRef}
        width={width}
        height={height}
        autoPlay
        playsInline
        muted
        style={{
          display: isLoading || error ? "none" : "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)",
          borderRadius: "var(--radius-md)",
        }}
      />
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          transform: "scaleX(-1)",
        }}
      />

      {isLoading && (
        <div className="camera-placeholder">
          <div className="camera-icon">
            <svg viewBox="0 0 80 60" preserveAspectRatio="xMidYMid meet">
              <rect x="10" y="15" width="60" height="40" rx="3" />
              <circle cx="40" cy="35" r="12" />
              <circle cx="60" cy="20" r="4" />
            </svg>
          </div>
          <p>Kamera indítása...</p>
        </div>
      )}

      {error && (
        <div className="camera-placeholder">
          <div className="camera-icon" style={{ opacity: 0.5 }}>
            <svg viewBox="0 0 80 60" preserveAspectRatio="xMidYMid meet">
              <rect x="10" y="15" width="60" height="40" rx="3" />
              <circle cx="40" cy="35" r="12" />
              <circle cx="60" cy="20" r="4" />
            </svg>
          </div>
          <p style={{ color: "#EF4444" }}>Kamera hiba</p>
          <p style={{ fontSize: "12px", marginTop: "8px", maxWidth: "200px", textAlign: "center" }}>
            {error}
          </p>
        </div>
      )}

      {!isLoading && !error && (
        <p className="camera-hint">Tartsd a kezed a kép közepén</p>
      )}
    </div>
  );
});

export default Camera;
