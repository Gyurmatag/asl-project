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

// Hand connections for drawing skeleton
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17],             // Palm
];

export interface HandDetectionResult {
  hands: handPoseDetection.Hand[];
  timestamp: number;
}

interface UseHandDetectionProps {
  videoElement: HTMLVideoElement | null;
  canvasElement: HTMLCanvasElement | null;
  isEnabled: boolean;
  onLetterDetected?: (result: LetterClassificationResult) => void;
}

interface UseHandDetectionReturn {
  isModelLoading: boolean;
  modelError: string | null;
  currentDetection: HandDetectionResult | null;
  handDetected: boolean;
}

export function useHandDetection({
  videoElement,
  canvasElement,
  isEnabled,
  onLetterDetected,
}: UseHandDetectionProps): UseHandDetectionReturn {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [currentDetection, setCurrentDetection] = useState<HandDetectionResult | null>(null);
  const [handDetected, setHandDetected] = useState(false);

  const detectorRef = useRef<handPoseDetection.HandDetector | null>(null);
  const smootherRef = useRef<ClassificationSmoother>(new ClassificationSmoother(5));
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

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
          maxHands: 1, // Only detect one hand for ASL
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

      // Draw connections (skeleton)
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 2;
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
        ctx.fillStyle = "#FF0000";
        ctx.fill();
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        ctx.stroke();
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

      try {
        // Estimate hands
        const hands = await detectorRef.current.estimateHands(videoElement, {
          flipHorizontal: false, // We handle mirroring in CSS
        });

        // Clear canvas
        ctx.clearRect(0, 0, canvasElement!.width, canvasElement!.height);

        const detection: HandDetectionResult = {
          hands,
          timestamp: Date.now(),
        };
        setCurrentDetection(detection);
        setHandDetected(hands.length > 0);

        if (hands.length > 0) {
          const hand = hands[0];
          
          // Draw hand landmarks
          drawHand(hand, ctx);

          // Classify the gesture
          const rawResult = classifyLetter(
            hand.keypoints,
            videoWidth,
            videoHeight
          );

          // Smooth the result
          const smoothedResult = smootherRef.current.addResult(rawResult);
          onLetterDetected?.(smoothedResult);
        } else {
          // No hand detected, reset smoother
          smootherRef.current.reset();
          onLetterDetected?.({ letter: null, confidence: 0, allMatches: [] });
        }
      } catch (error) {
        console.error("Error during hand detection:", error);
      }

      // Continue detection loop
      if (isRunningRef.current) {
        animationFrameRef.current = requestAnimationFrame(detectHands);
      }
    }

    // Start detection loop
    isRunningRef.current = true;
    detectHands();

    return () => {
      isRunningRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
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
    onLetterDetected,
  ]);

  return {
    isModelLoading,
    modelError,
    currentDetection,
    handDetected,
  };
}
