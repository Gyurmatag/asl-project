"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-backend-webgl";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import {
  classifyLetter,
  ClassificationSmoother,
  LetterClassificationResult,
} from "../lib/mlClassifier";

// Minimum delay between detections in ms (prevents CPU overload)
// 100ms = 10 FPS is plenty for ASL recognition and much lighter on CPU
const MIN_DETECTION_DELAY_MS = 100;

// Hand connections for drawing skeleton
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17],             // Palm
];

// Colors for different hands
const HAND_COLORS = {
  Left: { skeleton: "#00FF00", keypoint: "#FF0000", label: "Left" },  // Green skeleton, red keypoints
  Right: { skeleton: "#00BFFF", keypoint: "#FF6600", label: "Right" }, // Blue skeleton, orange keypoints
};

export interface HandDetectionResult {
  hands: handPoseDetection.Hand[];
  timestamp: number;
}

interface UseHandDetectionProps {
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
  isEnabled: boolean;
  onLetterDetected?: (result: LetterClassificationResult) => void;
  onBothHandsOpenPalm?: (detected: boolean) => void;
}

interface UseHandDetectionReturn {
  isModelLoading: boolean;
  modelError: string | null;
  currentDetection: HandDetectionResult | null;
  handDetected: boolean;
  handsCount: number;
  bothHandsOpenPalm: boolean;
}

export function useHandDetection({
  videoElement,
  canvasElement,
  isEnabled,
  onLetterDetected,
  onBothHandsOpenPalm,
}: UseHandDetectionProps): UseHandDetectionReturn {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [currentDetection, setCurrentDetection] = useState<HandDetectionResult | null>(null);
  const [handDetected, setHandDetected] = useState(false);
  const [handsCount, setHandsCount] = useState(0);
  const [bothHandsOpenPalm, setBothHandsOpenPalm] = useState(false);

  const detectorRef = useRef<handPoseDetection.HandDetector | null>(null);
  const smootherRef = useRef<ClassificationSmoother>(new ClassificationSmoother(3));
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  
  // Store callbacks in refs to avoid restarting detection loop when they change
  const onLetterDetectedRef = useRef(onLetterDetected);
  const onBothHandsOpenPalmRef = useRef(onBothHandsOpenPalm);
  
  // Track previous state values to avoid unnecessary re-renders
  const prevHandsCountRef = useRef(0);
  const prevBothHandsOpenPalmRef = useRef(false);
  
  // Keep refs up to date
  useEffect(() => {
    onLetterDetectedRef.current = onLetterDetected;
  }, [onLetterDetected]);
  
  useEffect(() => {
    onBothHandsOpenPalmRef.current = onBothHandsOpenPalm;
  }, [onBothHandsOpenPalm]);

  // Initialize TensorFlow and load model
  useEffect(() => {
    let isMounted = true;

    async function loadModel() {
      try {
        setIsModelLoading(true);
        setModelError(null);

        // Set WebGL backend for better performance
        await tf.setBackend("webgl");
        await tf.ready();
        console.log("TensorFlow.js backend:", tf.getBackend());

        // Create hand detector using TensorFlow.js runtime (works better with bundlers)
        const model = handPoseDetection.SupportedModels.MediaPipeHands;
        const detectorConfig: handPoseDetection.MediaPipeHandsTfjsModelConfig = {
          runtime: "tfjs",
          modelType: "full", // 'lite' or 'full'
          maxHands: 2, // Detect both hands
        };

        const detector = await handPoseDetection.createDetector(model, detectorConfig);
        
        if (isMounted) {
          detectorRef.current = detector;
          setIsModelLoading(false);
          console.log("Hand detection model loaded successfully");
        }
      } catch (error) {
        console.error("Error loading hand detection model:", error);
        if (isMounted) {
          setModelError(
            error instanceof Error
              ? error.message
              : "Failed to load hand detection model"
          );
          setIsModelLoading(false);
        }
      }
    }

    loadModel();

    return () => {
      isMounted = false;
      if (detectorRef.current) {
        detectorRef.current.dispose();
        detectorRef.current = null;
      }
    };
  }, []);

  // Draw hand landmarks on canvas
  const drawHand = useCallback(
    (hand: handPoseDetection.Hand, ctx: CanvasRenderingContext2D) => {
      const keypoints = hand.keypoints;
      // Get colors based on handedness (Left/Right)
      const handedness = hand.handedness as "Left" | "Right";
      const colors = HAND_COLORS[handedness] || HAND_COLORS.Right;

      // Draw connections (skeleton)
      ctx.strokeStyle = colors.skeleton;
      ctx.lineWidth = 3;
      for (const [start, end] of HAND_CONNECTIONS) {
        const startPoint = keypoints[start];
        const endPoint = keypoints[end];
        if (startPoint && endPoint) {
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.stroke();
        }
      }

      // Draw keypoints
      for (const keypoint of keypoints) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = colors.keypoint;
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw hand label near wrist (keypoint 0)
      const wrist = keypoints[0];
      if (wrist) {
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = colors.skeleton;
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.strokeText(colors.label, wrist.x - 20, wrist.y + 30);
        ctx.fillText(colors.label, wrist.x - 20, wrist.y + 30);
      }
    },
    []
  );

  // Detection loop
  useEffect(() => {
    if (!isEnabled || !videoElement || !canvasElement || isModelLoading || modelError) {
      return;
    }

    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;

    const videoWidth = videoElement.videoWidth || canvasElement.width;
    const videoHeight = videoElement.videoHeight || canvasElement.height;

    async function detectHands() {
      if (!detectorRef.current || !videoElement || !ctx || !isRunningRef.current) {
        return;
      }

      const startTime = performance.now();

      try {
        // Estimate hands
        const hands = await detectorRef.current.estimateHands(videoElement, {
          flipHorizontal: false, // We handle mirroring in CSS
        });

        // Clear canvas
        ctx.clearRect(0, 0, canvasElement!.width, canvasElement!.height);

        // Only update state when values actually change to reduce re-renders
        const newHandsCount = hands.length;
        if (newHandsCount !== prevHandsCountRef.current) {
          prevHandsCountRef.current = newHandsCount;
          setHandDetected(newHandsCount > 0);
          setHandsCount(newHandsCount);
          
          // Only update currentDetection when hands count changes
          const detection: HandDetectionResult = {
            hands,
            timestamp: Date.now(),
          };
          setCurrentDetection(detection);
        }

        if (hands.length > 0) {
          // Draw all detected hands
          for (const hand of hands) {
            drawHand(hand, ctx);
          }

          // Check if both hands are showing open palms (for "done" gesture)
          let bothPalmsOpen = false;
          if (hands.length >= 2) {
            const handResults = hands.map(hand => 
              classifyLetter(hand.keypoints, videoWidth, videoHeight)
            );
            
            // Check if both hands show OPEN_PALM gesture
            const openPalmCount = handResults.filter(
              r => r.specialGesture === "OPEN_PALM"
            ).length;
            
            bothPalmsOpen = openPalmCount >= 2;
          }
          
          // Only update state when value changes
          if (bothPalmsOpen !== prevBothHandsOpenPalmRef.current) {
            prevBothHandsOpenPalmRef.current = bothPalmsOpen;
            setBothHandsOpenPalm(bothPalmsOpen);
          }
          onBothHandsOpenPalmRef.current?.(bothPalmsOpen);
          
          // If both palms are open, don't process for letter detection
          if (bothPalmsOpen) {
            onLetterDetectedRef.current?.({ letter: null, confidence: 0, allMatches: [], specialGesture: "OPEN_PALM" });
          } else {
            // Use the first hand for classification (or right hand if available)
            const rightHand = hands.find(h => h.handedness === "Right");
            const handForClassification = rightHand || hands[0];

            // Classify the gesture
            const rawResult = classifyLetter(
              handForClassification.keypoints,
              videoWidth,
              videoHeight
            );

            // Smooth the result
            const smoothedResult = smootherRef.current.addResult(rawResult);
            onLetterDetectedRef.current?.(smoothedResult);
          }
        } else {
          // No hand detected, reset smoother
          if (prevBothHandsOpenPalmRef.current !== false) {
            prevBothHandsOpenPalmRef.current = false;
            setBothHandsOpenPalm(false);
          }
          onBothHandsOpenPalmRef.current?.(false);
          smootherRef.current.reset();
          onLetterDetectedRef.current?.({ letter: null, confidence: 0, allMatches: [] });
        }
      } catch (error) {
        console.error("Error during hand detection:", error);
      }

      // Schedule next detection with delay to prevent CPU overload
      // Wait at least MIN_DETECTION_DELAY_MS between detection cycles
      if (isRunningRef.current) {
        const elapsed = performance.now() - startTime;
        const delay = Math.max(0, MIN_DETECTION_DELAY_MS - elapsed);
        timeoutRef.current = setTimeout(detectHands, delay);
      }
    }

    // Start detection loop
    isRunningRef.current = true;
    detectHands();

    return () => {
      isRunningRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Clear canvas when stopping
      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    };
  }, [
    isEnabled,
    videoElement,
    canvasElement,
    isModelLoading,
    modelError,
    drawHand,
    // Note: onLetterDetected and onBothHandsOpenPalm are stored in refs
    // to prevent detection loop restarts when callbacks change
  ]);

  return {
    isModelLoading,
    modelError,
    currentDetection,
    handDetected,
    handsCount,
    bothHandsOpenPalm,
  };
}
