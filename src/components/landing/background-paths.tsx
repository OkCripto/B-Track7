type PathConfig = {
  id: number;
  d: string;
  width: number;
  dashLength: number;
  dashGap: number;
  duration: number;
  delay: number;
};

const createRng = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

const buildPaths = (position: number, flipped: boolean) =>
  Array.from({ length: 24 }, (_, i): PathConfig => {
    const seed =
      ((i + 1) * 2654435761) ^
      (position > 0 ? 0xa5a5a5a5 : 0x5a5a5a5a) ^
      (flipped ? 0xc3c3c3c3 : 0x3c3c3c3c);
    const rng = createRng(seed);
    const dashLength = 60 + rng() * 80;
    const dashGap = 150 + rng() * 100;
    const duration = 9 + rng() * 12;
    const delay = rng() * 10;

    const d = flipped
      ? `M${696 + 380 - i * 5 * position} ${-189 - i * 6}C${696 + 380 - i * 5 * position} ${
          -189 - i * 6
        } ${696 + 312 - i * 5 * position} ${216 - i * 6} ${696 - 152 + i * 5 * position} ${
          343 - i * 6
        }C${696 - 616 + i * 5 * position} ${470 - i * 6} ${696 - 684 + i * 5 * position} ${
          875 - i * 6
        } ${696 - 684 + i * 5 * position} ${875 - i * 6}`
      : `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${
          189 + i * 6
        } -${312 - i * 5 * position} ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${
          616 - i * 5 * position
        } ${470 - i * 6} ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${
          875 - i * 6
        }`;

    return {
      id: i,
      d,
      width: 0.7 + i * 0.02,
      dashLength,
      dashGap,
      duration,
      delay,
    };
  });

function PathGroup({ position, flipped }: { position: number; flipped: boolean }) {
  const paths = buildPaths(position, flipped);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="h-full w-full" viewBox="0 0 696 316" fill="none">
        {paths.map((path) => (
          <g key={`${flipped ? "flipped" : "normal"}-${path.id}`}>
            <path d={path.d} stroke="none" fill="none" />
            <path
              d={path.d}
              stroke="rgba(255, 255, 255, 0.75)"
              strokeWidth={path.width}
              fill="none"
              style={{
                ...( {
                  "--dash": `${path.dashLength.toFixed(2)}px`,
                  "--gap": `${path.dashGap.toFixed(2)}px`,
                  "--offset": `${(path.dashLength + path.dashGap).toFixed(2)}px`,
                  "--duration": `${path.duration.toFixed(2)}s`,
                  "--delay": `${path.delay.toFixed(2)}s`,
                } as React.CSSProperties),
                opacity: 0.4 + path.id * 0.02,
              }}
              className="path-animate"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function BackgroundPaths() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <PathGroup position={1} flipped={false} />
      <PathGroup position={-1} flipped={false} />
      <PathGroup position={1} flipped />
      <PathGroup position={-1} flipped />
    </div>
  );
}
