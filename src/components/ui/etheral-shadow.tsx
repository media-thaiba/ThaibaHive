"use client";

import React, { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface AnimationConfig {
  preview?: boolean;
  scale: number;
  speed: number;
}

interface NoiseConfig {
  opacity: number;
  scale: number;
}

interface EtheralShadowProps {
  sizing?: "fill" | "stretch";
  color?: string;
  animation?: AnimationConfig;
  noise?: NoiseConfig;
  style?: CSSProperties;
  className?: string;
  children?: React.ReactNode;
  showTitle?: boolean;
  titleText?: string;
}

export function EtheralShadow({
  color = "rgba(16, 185, 129, 0.25)", // Thaiba Emerald default
  animation = { scale: 80, speed: 40 },
  noise: _noise,
  style,
  className,
  children,
  showTitle = false,
  titleText = "ThaibaHive",
}: EtheralShadowProps) {
  const animationEnabled = animation && animation.scale > 0;

  const getGlowColor = (alpha: number) => {
    if (color.startsWith("rgba")) {
      return color.replace(/[^,]+(?=\s*\)$)/, ` ${alpha}`);
    }
    return color;
  };

  return (
    <div
      className={cn("w-full h-full relative overflow-hidden bg-[#030305]", className)}
      style={{
        colorScheme: "dark",
        backgroundColor: "#030305",
        ...style,
      }}
    >
      <style jsx>{`
        @keyframes ambient-drift {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(25px, -15px, 0) scale(1.06);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        .ambient-glow-layer {
          animation: ${animationEnabled ? "ambient-drift 25s ease-in-out infinite" : "none"};
        }
      `}</style>

      {/* GPU-Safe Ambient Radial Gradient Orbs */}
      <div
        className="ambient-glow-layer absolute inset-0 pointer-events-none z-0 will-change-transform"
        style={{
          background: `
            radial-gradient(circle at 18% 22%, ${getGlowColor(0.14)} 0%, rgba(3, 3, 5, 0) 55%),
            radial-gradient(circle at 82% 78%, ${getGlowColor(0.08)} 0%, rgba(3, 3, 5, 0) 50%),
            radial-gradient(circle at 50% 50%, ${getGlowColor(0.04)} 0%, rgba(3, 3, 5, 0) 65%)
          `,
        }}
      />

      {/* Optional Title Layer */}
      {showTitle && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <h1 className="md:text-7xl text-6xl lg:text-8xl font-bold text-center text-foreground relative z-20">
            {titleText}
          </h1>
        </div>
      )}



      {/* Children Content Layer */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
