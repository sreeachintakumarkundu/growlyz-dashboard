export default function GrowlyZLogo({ size = 32, boxed = false, className = '' }) {
  const id = `gz${size}`;

  if (boxed) {
    // App-icon style: dark rounded square + dark navy upper + orange triangle lower
    const r = Math.round(size * 0.22);
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id={`${id}og`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF7A00" />
            <stop offset="100%" stopColor="#FF4500" />
          </linearGradient>
          <clipPath id={`${id}cl`}>
            <rect width="32" height="32" rx={r} />
          </clipPath>
        </defs>
        {/* Dark background */}
        <rect width="32" height="32" rx={r} fill="#111827" />
        {/* Dark navy upper-left shape */}
        <path d="M0 0 H32 V9 L5 32 H0 Z" fill="#1d3350" clipPath={`url(#${id}cl)`} />
        {/* Orange lower-right triangle */}
        <path d="M32 9 V32 H5 Z" fill={`url(#${id}og)`} clipPath={`url(#${id}cl)`} />
      </svg>
    );
  }

  // Inline Z-mark for navbars (no background box)
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={`${id}og`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF5500" />
          <stop offset="100%" stopColor="#FF9200" />
        </linearGradient>
      </defs>
      {/* Dark charcoal — upper-left portion */}
      <path d="M2 3 L30 3 L30 11 L18 11 L2 23 Z" fill="#1e293b" />
      {/* Orange gradient — lower-right portion */}
      <path d="M30 11 L18 11 L2 23 L2 29 L30 29 Z" fill={`url(#${id}og)`} />
    </svg>
  );
}
