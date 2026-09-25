"use client";

import { motion } from "framer-motion";

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
  const svgCircles = [
    { id: "signin", color: "hsl(var(--primary))", baseR: 90, activeR: 98 },
    { id: "signup", color: "hsl(var(--success, 142 76% 36%))", baseR: 70, activeR: 82 },
    { id: "google", color: "hsl(var(--info, 217 91% 60%))", baseR: 50, activeR: 62 },
    { id: "forgot", color: "hsl(var(--warning, 38 92% 50%))", baseR: 30, activeR: 42 },
  ];

  return (
    <>
      <div className="absolute top-0 right-0 pointer-events-none overflow-hidden w-36 h-36 rounded-tr-[24px]">
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
                animate={{
                  r: isActive ? circle.activeR : circle.baseR,
                  opacity: isActive ? 1.0 : 0.45,
                }}
                transition={{ type: "spring", stiffness: 150, damping: 15 }}
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
          layout
          animate={{ color: activeTheme.accent }}
          transition={{ duration: 0.3 }}
          className="text-[9px] font-extrabold tracking-widest uppercase"
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
