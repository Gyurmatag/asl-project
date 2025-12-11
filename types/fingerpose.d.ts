declare module "fingerpose" {
  export const Finger: {
    Thumb: number;
    Index: number;
    Middle: number;
    Ring: number;
    Pinky: number;
  };

  export const FingerCurl: {
    NoCurl: number;
    HalfCurl: number;
    FullCurl: number;
  };

  export const FingerDirection: {
    VerticalUp: number;
    VerticalDown: number;
    HorizontalLeft: number;
    HorizontalRight: number;
    DiagonalUpRight: number;
    DiagonalUpLeft: number;
    DiagonalDownRight: number;
    DiagonalDownLeft: number;
  };

  export class GestureDescription {
    constructor(name: string);
    addCurl(finger: number, curl: number, confidence: number): void;
    addDirection(finger: number, direction: number, confidence: number): void;
  }

  export interface GestureMatch {
    name: string;
    score: number;
  }

  export interface EstimatorResult {
    gestures: GestureMatch[];
    poseData: unknown;
  }

  export class GestureEstimator {
    constructor(gestures: GestureDescription[]);
    estimate(landmarks: [number, number, number][], minConfidence: number): EstimatorResult;
  }
}
