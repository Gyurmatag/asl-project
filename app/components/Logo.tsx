export default function Logo() {
  return (
    <div className="logo-container">
      <svg
        width="36"
        height="36"
        viewBox="0 0 42 42"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="logo-svg"
      >
        {/* Eye - representing vision/recognition */}
        <defs>
          <linearGradient id="eyeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* Eye shape - more elegant */}
        <ellipse
          cx="21"
          cy="21"
          rx="13"
          ry="9"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="url(#eyeGradient)"
        />
        {/* Iris */}
        <circle
          cx="21"
          cy="21"
          r="7"
          fill="currentColor"
        />
        {/* Pupil with highlight */}
        <circle
          cx="21"
          cy="21"
          r="4"
          fill="currentColor"
        />
        <circle
          cx="23"
          cy="19"
          r="1.5"
          fill="white"
          opacity="0.9"
        />
        {/* Upper eyelid - more refined */}
        <path
          d="M 7 21 Q 21 9 35 21"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.25"
        />
        {/* Lower eyelid */}
        <path
          d="M 7 21 Q 21 33 35 21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.15"
        />
      </svg>
      <span className="logo-text">sign2voice</span>
    </div>
  );
}

