import React from 'react';

interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  inverted?: boolean;
}

export const MissionPossibleLogo: React.FC<LogoProps> = ({
  size = 30,
  showWordmark = true,
  inverted = false,
}) => {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Outer rounded connection frame */}
        <rect
          x="1.5"
          y="1.5"
          width="33"
          height="33"
          rx="9"
          fill={inverted ? '#0F172A' : '#0F766E'}
        />
        {/* Left human arc reaching upward & inward */}
        <path
          d="M9.5 25.5C9.5 19.2 12.8 14.5 18 14.5"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        {/* Right human arc reaching upward & inward */}
        <path
          d="M26.5 25.5C26.5 19.2 23.2 14.5 18 14.5"
          stroke="#5EEAD4"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        {/* Bridge crossbar symbolizing shared mission & match */}
        <path
          d="M12.5 22.5L18 17.5L23.5 22.5"
          stroke="#FBBF24"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Central cause beacon */}
        <circle cx="18" cy="10.5" r="2.6" fill="#FBBF24" />
      </svg>

      {showWordmark && (
        <span
          className={`font-display text-lg font-bold tracking-tight whitespace-nowrap ${
            inverted ? 'text-white' : 'text-slate-900'
          }`}
        >
          Mission<span className={inverted ? 'text-teal-300' : 'text-teal-700'}>Possible</span>
        </span>
      )}
    </span>
  );
};
