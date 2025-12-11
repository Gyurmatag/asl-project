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

  // Expose video and canvas elements to parent
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
        // Request camera access
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            facingMode: "user", // Front-facing camera
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          // Wait for video to be ready
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
          err instanceof Error ? err.message : "Failed to access camera";
        setError(errorMessage);
        setIsLoading(false);
        onCameraError?.(errorMessage);
      }
    }

    setupCamera();

    // Cleanup
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [width, height, onCameraReady, onCameraError]);

  return (
    <div className="relative rounded-lg overflow-hidden bg-zinc-900">
      {/* Video element - mirrored for natural selfie view */}
      <video
        ref={videoRef}
        width={width}
        height={height}
        autoPlay
        playsInline
        muted
        className="block"
        style={{ transform: "scaleX(-1)" }} // Mirror the video
      />
      
      {/* Canvas overlay for drawing hand landmarks */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 pointer-events-none"
        style={{ transform: "scaleX(-1)" }} // Mirror to match video
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-zinc-400 text-sm">Starting camera...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-900/50 flex items-center justify-center">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <p className="text-red-400 font-medium">Camera Error</p>
            <p className="text-zinc-500 text-sm max-w-xs">{error}</p>
            <p className="text-zinc-600 text-xs mt-2">
              Please ensure camera permissions are granted
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

export default Camera;
