"use client";

import { motion, useReducedMotion } from "framer-motion";

export type AuthMode = "signin" | "signup" | "google" | "forgot";

type LoginHeaderProps = {
  mode: AuthMode;
  activeTheme: {
    accent: string;
    borderClass: string;
    shadowClass: string;
    subtitle: string;
  };
};

export function LoginHeader({ mode, activeTheme }: LoginHeaderProps) {
  const shouldReduceMotion = useReducedMotion();

  const svgCircles = [
    { id: "signin", color: "#10b981", baseR: 90, activeR: 98 },
    { id: "signup", color: "#16a34a", baseR: 70, activeR: 82 },
    { id: "google", color: "#3b82f6", baseR: 50, activeR: 62 },
    { id: "forgot", color: "#f59e0b", baseR: 30, activeR: 42 },
  ];

  return (
    <>
      <div className="absolute top-0 right-0 pointer-events-none overflow-hidden w-36 h-36 rounded-tr-2xl">
        <svg
          className="absolute -top-5 -right-5 w-32 h-32"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {svgCircles.map((circle) => {
            const isActive = mode === circle.id;
            return (
              <motion.circle
                key={circle.id}
                cx="100"
                cy="0"
                initial={{
                  r: circle.baseR,
                  opacity: 0.45,
                }}
                animate={{
                  r: isActive ? circle.activeR : circle.baseR,
                  opacity: isActive ? 1.0 : 0.45,
                }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 150, damping: 15 }
                }
                fill={circle.color}
              />
            );
          })}
          <circle cx="100" cy="0" r="16" fill="hsl(var(--card))" />
        </svg>
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">
          {mode === "signin" && "ACCESS WORKSPACE"}
          {mode === "signup" && "CREATE PROFILE"}
          {mode === "google" && "GOOGLE FEDERATION"}
          {mode === "forgot" && "FORGOT KEY"}
        </h2>
        <motion.p
          layout={!shouldReduceMotion}
          animate={{ color: activeTheme.accent }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2 }}
          className="text-[11px] font-bold tracking-wider uppercase"
        >
          {activeTheme.subtitle}
        </motion.p>
        <p className="text-xs text-muted-foreground font-normal leading-relaxed pt-3">
          {mode === "signin" && "Please verify your credentials or create a new developer profile to deploy your workspace node."}
          {mode === "signup" && "Create your credentials and link your employee profile to register as a network operator."}
          {mode === "google" && "Authorize your Thaiba Garden workspace nodes using Google OAuth secure session handoff."}
          {mode === "forgot" && "Request an automated recovery token to reset your password and redeploy your workspace node keys."}
        </p>
      </div>
    </>
  );
}
