export function QRCodeSVG({ data, size = 128 }: { data: string; size?: number }) {
  const simplePattern = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const seed = simplePattern(data);
  const modules = 25;
  const moduleSize = size / modules;

  const cells: React.ReactNode[] = [];
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const bit = (seed >> ((x * 7 + y * 13) % 32)) & 1;
      const isFinderPattern =
        (x < 7 && y < 7) ||
        (x >= modules - 7 && y < 7) ||
        (x < 7 && y >= modules - 7);

      if (isFinderPattern) {
        const inBorder = x < 1 || y < 1 || x >= 6 || y >= 6;
        const inInner = x > 1 && y > 1 && x < 5 && y < 5;
        const fill = (inBorder || inInner) ? "#000" : "#fff";
        cells.push(
          <rect
            key={`${x}-${y}`}
            x={x * moduleSize}
            y={y * moduleSize}
            width={moduleSize}
            height={moduleSize}
            fill={fill}
          />
        );
      } else if (bit) {
        cells.push(
          <rect
            key={`${x}-${y}`}
            x={x * moduleSize}
            y={y * moduleSize}
            width={moduleSize}
            height={moduleSize}
            fill="#000"
          />
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`QR Code for visitor pass: ${data}`}
    >
      <rect width={size} height={size} fill="#fff" />
      <g>{cells}</g>
    </svg>
  );
}
