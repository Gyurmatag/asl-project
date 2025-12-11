import * as Fingerpose from "fingerpose";

// Supported letters (J and Z require motion, not supported)
export const SUPPORTED_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y"
] as const;

export type SupportedLetter = (typeof SUPPORTED_LETTERS)[number];

// Shorthand aliases for cleaner gesture definitions
const Finger = Fingerpose.Finger;
const FingerCurl = Fingerpose.FingerCurl;
const FingerDirection = Fingerpose.FingerDirection;

// Helper to create gesture with common patterns
function createGesture(name: string): Fingerpose.GestureDescription {
  return new Fingerpose.GestureDescription(name);
}

// ===== ASL Letter Gesture Definitions =====

// A: Fist with thumb alongside (thumb up beside fist)
const aGesture = createGesture("A");
aGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
aGesture.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
aGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
aGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
aGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);

// B: Flat hand, fingers together pointing up, thumb across palm
const bGesture = createGesture("B");
bGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
bGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
bGesture.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
bGesture.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
bGesture.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
bGesture.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
bGesture.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7);

// C: Curved hand forming C shape
const cGesture = createGesture("C");
cGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
cGesture.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
cGesture.addCurl(Finger.Middle, FingerCurl.HalfCurl, 1.0);
cGesture.addCurl(Finger.Ring, FingerCurl.HalfCurl, 1.0);
cGesture.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 1.0);

// D: Index pointing up, others curled touching thumb
const dGesture = createGesture("D");
dGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
dGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
dGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
dGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
dGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
dGesture.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);

// E: All fingers curled, thumb across
const eGesture = createGesture("E");
eGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
eGesture.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
eGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
eGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
eGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);

// F: OK sign with three fingers up (thumb + index circle, others extended)
const fGesture = createGesture("F");
fGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
fGesture.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
fGesture.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
fGesture.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
fGesture.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);

// G: Index + thumb pointing sideways (like pointing a gun)
const gGesture = createGesture("G");
gGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
gGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
gGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
gGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
gGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
gGesture.addDirection(Finger.Index, FingerDirection.HorizontalLeft, 0.7);
gGesture.addDirection(Finger.Index, FingerDirection.HorizontalRight, 0.7);

// H: Index + middle pointing sideways together
const hGesture = createGesture("H");
hGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
hGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
hGesture.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
hGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
hGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
hGesture.addDirection(Finger.Index, FingerDirection.HorizontalLeft, 0.7);
hGesture.addDirection(Finger.Index, FingerDirection.HorizontalRight, 0.7);

// I: Pinky up only, others curled
const iGesture = createGesture("I");
iGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
iGesture.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
iGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
iGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
iGesture.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);
iGesture.addDirection(Finger.Pinky, FingerDirection.VerticalUp, 0.7);

// K: Index + middle up and spread, thumb between
const kGesture = createGesture("K");
kGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);
kGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
kGesture.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
kGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
kGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
kGesture.addDirection(Finger.Index, FingerDirection.DiagonalUpLeft, 0.7);
kGesture.addDirection(Finger.Index, FingerDirection.DiagonalUpRight, 0.7);

// L: L-shape (thumb + index extended perpendicular)
const lGesture = createGesture("L");
lGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
lGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
lGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
lGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
lGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
lGesture.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);

// M: Three fingers over thumb (index, middle, ring curled over thumb)
const mGesture = createGesture("M");
mGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
mGesture.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
mGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
mGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
mGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);

// N: Two fingers over thumb (index, middle curled over thumb)
const nGesture = createGesture("N");
nGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
nGesture.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
nGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
nGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
nGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);

// O: All fingers curved to touch thumb (O shape)
const oGesture = createGesture("O");
oGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
oGesture.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
oGesture.addCurl(Finger.Middle, FingerCurl.HalfCurl, 1.0);
oGesture.addCurl(Finger.Ring, FingerCurl.HalfCurl, 1.0);
oGesture.addCurl(Finger.Pinky, FingerCurl.HalfCurl, 1.0);

// P: K-hand pointing down
const pGesture = createGesture("P");
pGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 0.8);
pGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
pGesture.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
pGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
pGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
pGesture.addDirection(Finger.Index, FingerDirection.DiagonalDownLeft, 0.7);
pGesture.addDirection(Finger.Index, FingerDirection.DiagonalDownRight, 0.7);

// Q: G-hand pointing down
const qGesture = createGesture("Q");
qGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
qGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
qGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
qGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
qGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
qGesture.addDirection(Finger.Index, FingerDirection.DiagonalDownLeft, 0.7);
qGesture.addDirection(Finger.Index, FingerDirection.DiagonalDownRight, 0.7);

// R: Crossed index + middle fingers
const rGesture = createGesture("R");
rGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
rGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
rGesture.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
rGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
rGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
rGesture.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);

// S: Fist with thumb over fingers
const sGesture = createGesture("S");
sGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
sGesture.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
sGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
sGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
sGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);

// T: Thumb between index and middle finger
const tGesture = createGesture("T");
tGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 1.0);
tGesture.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
tGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
tGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
tGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);

// U: Index + middle together pointing up
const uGesture = createGesture("U");
uGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
uGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
uGesture.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
uGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
uGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
uGesture.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);
uGesture.addDirection(Finger.Middle, FingerDirection.VerticalUp, 0.7);

// V: Peace sign (index + middle spread)
const vGesture = createGesture("V");
vGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
vGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
vGesture.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
vGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
vGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
vGesture.addDirection(Finger.Index, FingerDirection.DiagonalUpLeft, 0.7);
vGesture.addDirection(Finger.Index, FingerDirection.DiagonalUpRight, 0.7);

// W: Three fingers up spread (index, middle, ring)
const wGesture = createGesture("W");
wGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
wGesture.addCurl(Finger.Index, FingerCurl.NoCurl, 1.0);
wGesture.addCurl(Finger.Middle, FingerCurl.NoCurl, 1.0);
wGesture.addCurl(Finger.Ring, FingerCurl.NoCurl, 1.0);
wGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);
wGesture.addDirection(Finger.Index, FingerDirection.VerticalUp, 0.7);

// X: Index finger hooked/bent
const xGesture = createGesture("X");
xGesture.addCurl(Finger.Thumb, FingerCurl.HalfCurl, 0.8);
xGesture.addCurl(Finger.Index, FingerCurl.HalfCurl, 1.0);
xGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
xGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
xGesture.addCurl(Finger.Pinky, FingerCurl.FullCurl, 1.0);

// Y: Thumb + pinky out (hang loose / shaka)
const yGesture = createGesture("Y");
yGesture.addCurl(Finger.Thumb, FingerCurl.NoCurl, 1.0);
yGesture.addCurl(Finger.Index, FingerCurl.FullCurl, 1.0);
yGesture.addCurl(Finger.Middle, FingerCurl.FullCurl, 1.0);
yGesture.addCurl(Finger.Ring, FingerCurl.FullCurl, 1.0);
yGesture.addCurl(Finger.Pinky, FingerCurl.NoCurl, 1.0);

// Export all gestures
export const ASL_GESTURES = [
  aGesture,
  bGesture,
  cGesture,
  dGesture,
  eGesture,
  fGesture,
  gGesture,
  hGesture,
  iGesture,
  kGesture,
  lGesture,
  mGesture,
  nGesture,
  oGesture,
  pGesture,
  qGesture,
  rGesture,
  sGesture,
  tGesture,
  uGesture,
  vGesture,
  wGesture,
  xGesture,
  yGesture,
];

// Create and export the gesture estimator
export const gestureEstimator = new Fingerpose.GestureEstimator(ASL_GESTURES);
