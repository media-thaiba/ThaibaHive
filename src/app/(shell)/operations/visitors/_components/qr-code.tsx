import QRCode from "qrcode";

export function QRCodeSVG({ data, size = 128 }: { data: string; size?: number }) {
  const qr = QRCode.create(data, { errorCorrectionLevel: "M" });
  const modules = qr.modules.size;
  const bits = qr.modules.data as unknown as Uint8Array;
  const cell = size / modules;

  const cells: React.ReactNode[] = [];
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (bits[y * modules + x]) {
        cells.push(
          <rect
            key={`${x}-${y}`}
            x={x * cell}
            y={y * cell}
            width={cell}
            height={cell}
            fill="#000"
            shapeRendering="crispEdges"
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
      aria-label="Visitor pass QR code"
    >
      <rect width={size} height={size} fill="#fff" />
      <g>{cells}</g>
    </svg>
  );
}
