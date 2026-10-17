"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  CheckSquare, Activity, FolderOpen, MessageSquare,
  Calendar, ShieldCheck, Bell, Mail, Lock,
  ArrowLeft, Database, Cpu, Settings, Cloud, Users,
  Clock, GraduationCap, Wallet, Fingerprint
} from "lucide-react";
import { LoginHeader } from "./_components/login-header";
import { LoginForm } from "./_components/login-form";
import type { AuthMode } from "./_components/login-header";
import { UnifiedStars } from "@/components/ui/unified-stars";
import { EtheralShadow } from "@/components/ui/etheral-shadow";

// ── Floating Icon Configuration for ThaibaHive ──
interface FloatingIconConfig {
  id: number;
  label: string;
  stat: string;
  icon: React.ElementType;
  color: string;
  rgb: string;
  angle: number; // in radians
  baseRadius: number; // in pixels
  isLeft: boolean;
  isBackground?: boolean;
}

const FLOATING_ICONS: FloatingIconConfig[] = [
  // ── Foreground Left Nodes ──
  {
    id: 1,
    label: "Tasks & Milestones",
    stat: "3 due today",
    icon: CheckSquare,
    color: "#10b981", // Emerald
    rgb: "16,185,129",
    angle: 3.7, // Top-Left-Center
    baseRadius: 680,
    isLeft: true,
  },
  {
    id: 2,
    label: "Attendance Core",
    stat: "98.4% present",
    icon: Clock,
    color: "#06b6d4", // Cyan
    rgb: "6,182,212",
    angle: 4.4, // Top-Center-Left
    baseRadius: 480,
    isLeft: true,
  },
  {
    id: 3,
    label: "Academic Intelligence",
    stat: "Curriculum synced",
    icon: GraduationCap,
    color: "#6366f1", // Indigo
    rgb: "99,102,241",
    angle: 2.6, // Middle-Left
    baseRadius: 650,
    isLeft: true,
  },
  {
    id: 4,
    label: "Institutional Files",
    stat: "Encrypted vaults",
    icon: FolderOpen,
    color: "#a855f7", // Purple
    rgb: "168,85,247",
    angle: 3.1, // Far Middle-Left
    baseRadius: 420,
    isLeft: true,
  },
  {
    id: 5,
    label: "Campus Channels",
    stat: "Department hubs",
    icon: MessageSquare,
    color: "#ec4899", // Pink
    rgb: "236,72,153",
    angle: 2.2, // Bottom-Left
    baseRadius: 500,
    isLeft: true,
  },
  {
    id: 6,
    label: "Staff Leave Ledger",
    stat: "Workflow active",
    icon: Calendar,
    color: "#f97316", // Orange
    rgb: "249,115,22",
    angle: 1.7, // Bottom-Center-Left
    baseRadius: 460,
    isLeft: true,
  },
  {
    id: 7,
    label: "Campus Shield & RBAC",
    stat: "Perimeter secure",
    icon: ShieldCheck,
    color: "#8b5cf6", // Violet
    rgb: "139,92,246",
    angle: 2.5, // Middle-Left-Inner
    baseRadius: 300,
    isLeft: true,
  },
  {
    id: 8,
    label: "Emergency Notices",
    stat: "Broadcast online",
    icon: Bell,
    color: "#f59e0b", // Amber
    rgb: "245,158,11",
    angle: 3.8, // Top-Left-Inner
    baseRadius: 320,
    isLeft: true,
  },
  // ── Foreground Right Nodes ──
  {
    id: 9,
    label: "Multi-Tenant DB",
    stat: "PostgreSQL active",
    icon: Database,
    color: "#3b82f6", // Blue
    rgb: "59,130,246",
    angle: 5.0, // Top-Right
    baseRadius: 460,
    isLeft: false,
  },
  {
    id: 10,
    label: "Autonomous AIGENT-OS",
    stat: "v2.6 Core running",
    icon: Cpu,
    color: "#ef4444", // Red
    rgb: "239,68,68",
    angle: 5.6, // Far Top-Right
    baseRadius: 580,
    isLeft: false,
  },
  {
    id: 11,
    label: "Institution Control",
    stat: "Policies synced",
    icon: Settings,
    color: "#94a3b8", // Slate
    rgb: "148,163,184",
    angle: 0.5, // Middle-Right-Inner
    baseRadius: 500,
    isLeft: false,
  },
  {
    id: 12,
    label: "Multi-Campus Cloud",
    stat: "Encrypted sync",
    icon: Cloud,
    color: "#0ea5e9", // Sky
    rgb: "14,165,233",
    angle: 0.0, // Far Middle-Right
    baseRadius: 620,
    isLeft: false,
  },
  {
    id: 13,
    label: "Faculty & Staff Network",
    stat: "142 members active",
    icon: Users,
    color: "#10b981", // Emerald
    rgb: "16,185,129",
    angle: 0.8, // Bottom-Right-Inner
    baseRadius: 340,
    isLeft: false,
  },
  {
    id: 14,
    label: "Official Dispatch Mail",
    stat: "Mail node active",
    icon: Mail,
    color: "#84cc16", // Lime
    rgb: "132,204,22",
    angle: 0.8, // Bottom-Right
    baseRadius: 680,
    isLeft: false,
  },
  {
    id: 15,
    label: "FIDO2 & WebAuthn",
    stat: "Passkeys enabled",
    icon: Lock,
    color: "#06b6d4", // Cyan
    rgb: "6,182,212",
    angle: 1.3, // Far Bottom-Right
    baseRadius: 580,
    isLeft: false,
  },
  {
    id: 16,
    label: "Campus Finance Ledgers",
    stat: "Audited & balanced",
    icon: Wallet,
    color: "#eab308", // Yellow
    rgb: "234,179,8",
    angle: 6.0, // Top-Right-Inner
    baseRadius: 350,
    isLeft: false,
  },
  // ── Deep Ambient Background Nodes ──
  {
    id: 17,
    label: "Deep Node Alpha",
    stat: "",
    icon: Fingerprint,
    color: "#14b8a6",
    rgb: "20,184,166",
    angle: 3.0,
    baseRadius: 720,
    isLeft: true,
    isBackground: true,
  },
  {
    id: 18,
    label: "Deep Node Beta",
    stat: "",
    icon: Database,
    color: "#3b82f6",
    rgb: "59,130,246",
    angle: 4.1,
    baseRadius: 660,
    isLeft: true,
    isBackground: true,
  },
  {
    id: 19,
    label: "Deep Node Gamma",
    stat: "",
    icon: Cloud,
    color: "#0ea5e9",
    rgb: "14,165,233",
    angle: 1.9,
    baseRadius: 680,
    isLeft: true,
    isBackground: true,
  },
  {
    id: 20,
    label: "Deep Node Delta",
    stat: "",
    icon: ShieldCheck,
    color: "#8b5cf6",
    rgb: "139,92,246",
    angle: 2.6,
    baseRadius: 750,
    isLeft: true,
    isBackground: true,
  },
  {
    id: 21,
    label: "Deep Node Epsilon",
    stat: "",
    icon: CheckSquare,
    color: "#10b981",
    rgb: "16,185,129",
    angle: 5.3,
    baseRadius: 740,
    isLeft: false,
    isBackground: true,
  },
  {
    id: 22,
    label: "Deep Node Zeta",
    stat: "",
    icon: Bell,
    color: "#f59e0b",
    rgb: "245,158,11",
    angle: 6.1,
    baseRadius: 670,
    isLeft: false,
    isBackground: true,
  },
  {
    id: 23,
    label: "Deep Node Eta",
    stat: "",
    icon: Mail,
    color: "#84cc16",
    rgb: "132,204,22",
    angle: 0.9,
    baseRadius: 730,
    isLeft: false,
    isBackground: true,
  },
  {
    id: 24,
    label: "Deep Node Theta",
    stat: "",
    icon: Lock,
    color: "#06b6d4",
    rgb: "6,182,212",
    angle: 1.4,
    baseRadius: 760,
    isLeft: false,
    isBackground: true,
  },
];

// ── Constellation layout constants (design space, tuned for 1920×1080) ──
const DESIGN_MAX_RADIUS = 760; // largest baseRadius in FLOATING_ICONS
const EDGE_MARGIN = 60; // min px kept between outermost coin and viewport edge
const HERO_GAP = 28; // min px kept between hero block edge and a coin's edge
const BASE_COIN_SIZE = 72; // unified coin diameter at uiScale = 1.0

// Distance from center where a ray at (cos, sin) exits the rect (hw × hh)
const rayExit = (cos: number, sin: number, hw: number, hh: number) =>
  Math.min(
    Math.abs(cos) < 1e-6 ? Infinity : hw / Math.abs(cos),
    Math.abs(sin) < 1e-6 ? Infinity : hh / Math.abs(sin)
  );

// ── Interactive Cursor-Repelling Coin Component ──
const Icon = ({
  mouseX,
  mouseY,
  parallaxMX,
  parallaxMY,
  iconData,
  index,
  showLoginForm,
  isAnyNodeHovered,
  hoveredNode,
  setHoveredNode,
  uiScale,
}: {
  mouseX: React.MutableRefObject<number>;
  mouseY: React.MutableRefObject<number>;
  parallaxMX: any;
  parallaxMY: any;
  iconData: FloatingIconConfig;
  index: number;
  showLoginForm: boolean;
  isAnyNodeHovered: boolean;
  hoveredNode: string | null;
  setHoveredNode: (id: string | null) => void;
  uiScale: number;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const glow = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });
  const springGlow = useSpring(glow, { stiffness: 100, damping: 15 });

  useEffect(() => {
    if (iconData.isBackground) return;

    const handleMouseMove = () => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        const iconCenterX = rect.left + rect.width / 2;
        const iconCenterY = rect.top + rect.height / 2;

        const distance = Math.sqrt(
          Math.pow(mouseX.current - iconCenterX, 2) +
          Math.pow(mouseY.current - iconCenterY, 2)
        );

        if (distance < 240) {
          glow.set(1 - distance / 240);
        } else {
          glow.set(0);
        }

        if (distance < 180 && !showLoginForm) {
          const angle = Math.atan2(
            mouseY.current - iconCenterY,
            mouseX.current - iconCenterX
          );
          const force = (1 - distance / 180) * 55 * uiScale;
          x.set(-Math.cos(angle) * force);
          y.set(-Math.sin(angle) * force);
        } else {
          x.set(0);
          y.set(0);
        }
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [x, y, glow, mouseX, mouseY, uiScale, iconData.isBackground, showLoginForm]);

  const isHovered = !iconData.isBackground && hoveredNode === String(iconData.id);
  const specX = 50 + (mouseX.current / (typeof window !== "undefined" ? window.innerWidth : 1000) - 0.5) * 60;
  const specY = 50 + (mouseY.current / (typeof window !== "undefined" ? window.innerHeight : 1000) - 0.5) * 60;
  const coinSize = BASE_COIN_SIZE * uiScale * (iconData.isBackground ? 0.6 : 1.0);

  const parallaxX = useTransform(
    parallaxMX,
    (v: number) => (showLoginForm ? 0 : v * (iconData.isBackground ? 4 : 10) * uiScale)
  );
  const parallaxY = useTransform(
    parallaxMY,
    (v: number) => (showLoginForm ? 0 : v * (iconData.isBackground ? 4 : 10) * uiScale)
  );

  const borderColor = useTransform(
    springGlow,
    [0, 1],
    ["rgba(255,255,255,0.06)", `rgba(${iconData.rgb}, 0.45)`]
  );

  const boxShadow = useTransform(
    springGlow,
    [0, 1],
    [
      "0 10px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.4)",
      `0 15px 35px rgba(${iconData.rgb}, 0.25), 0 0 18px rgba(${iconData.rgb}, 0.15), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.4)`,
    ]
  );

  const IconComponent = iconData.icon;

  return (
    <motion.div
      ref={ref}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        x: parallaxX,
        y: parallaxY,
        zIndex: isHovered ? 40 : iconData.isBackground ? 5 : 10,
        marginLeft: -coinSize / 2,
        marginTop: -coinSize / 2,
        width: coinSize,
        height: coinSize,
      }}
      className={iconData.isBackground ? "pointer-events-none" : "cursor-pointer"}
      onMouseEnter={iconData.isBackground ? undefined : () => setHoveredNode(String(iconData.id))}
      onMouseLeave={iconData.isBackground ? undefined : () => setHoveredNode(null)}
    >
      <motion.div
        style={{
          x: springX,
          y: springY,
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: iconData.isBackground
            ? isAnyNodeHovered
              ? 0.15
              : 0.28
            : isAnyNodeHovered && !isHovered
            ? 0.4
            : 1,
          scale: isHovered ? 1.15 : isAnyNodeHovered ? 0.9 : 1,
        }}
        transition={{
          delay: index * 0.03,
          type: "spring",
          stiffness: 110,
          damping: 12,
        }}
      >
        <motion.div
          style={{
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            position: "relative",
          }}
          animate={{
            y: [0, -6, 0, 6, 0],
            x: [0, 4, 0, -4, 0],
            rotate: [0, 3, 0, -3, 0],
          }}
          transition={{
            duration: (6 + (iconData.id % 4) * 1.5) * (iconData.isBackground ? 1.5 : 1.0),
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        >
          {/* Dynamic Proximity Neon Glow Aura */}
          {!iconData.isBackground && (
            <motion.div
              style={{
                position: "absolute",
                inset: "-30%",
                borderRadius: "50%",
                background: `radial-gradient(circle at center, rgba(${iconData.rgb}, 0.25) 0%, rgba(${iconData.rgb}, 0.05) 50%, rgba(3, 3, 5, 0) 70%)`,
                opacity: springGlow,
                pointerEvents: "none",
                zIndex: -1,
              }}
            />
          )}

          <motion.div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "radial-gradient(circle at center, rgba(14,18,22,0.94) 0%, rgba(4,6,8,0.98) 100%)",
              border: "1.5px solid",
              borderColor: isHovered ? iconData.color : borderColor,
              boxShadow: isHovered
                ? `0 20px 45px rgba(${iconData.rgb}, 0.35), 0 0 25px rgba(${iconData.rgb}, 0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.5)`
                : boxShadow,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              transition: "border-color 0.2s ease",
            }}
          >
            {/* Central Node Backlight */}
            <div
              style={{
                position: "absolute",
                inset: "-20%",
                background: `radial-gradient(circle at center, rgba(${iconData.rgb}, 0.12) 0%, rgba(3, 3, 5, 0) 70%)`,
                pointerEvents: "none",
              }}
            />

            {/* Icon Element */}
            <IconComponent
              size={24 * uiScale}
              style={{
                color: isHovered ? iconData.color : "rgba(255,255,255,0.75)",
                filter: isHovered ? `drop-shadow(0 0 8px ${iconData.color})` : "none",
                transition: "all 0.2s ease",
              }}
            />

            {/* Specular Glare */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: `radial-gradient(circle at ${specX}% ${specY}%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
                pointerEvents: "none",
                mixBlendMode: "overlay",
                zIndex: 10,
              }}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: coinSize + 10,
              left: "50%",
              x: "-50%",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 50,
            }}
            className="flex flex-col items-center"
          >
            <div className="w-1.5 h-1.5 bg-[#0b0c10] border-l border-t border-zinc-800 rotate-45 z-10 -mb-[4px]" />
            <div className="bg-[#0b0c10]/95 border border-zinc-800 text-white rounded-lg px-2.5 py-1.5 shadow-2xl flex flex-col items-center gap-0.5">
              <span className="text-[10px] font-extrabold tracking-wider uppercase" style={{ color: iconData.color }}>
                {iconData.label}
              </span>
              {iconData.stat && (
                <span className="text-[9px] text-zinc-400 font-medium">
                  {iconData.stat}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Theme definitions matching AuthMode ──
const modeThemes = {
  signin: {
    accent: "#10b981",
    borderClass: "border-primary/25",
    shadowClass: "shadow-primary/5",
    subtitle: "CONNECTING TO THAIBAHIVE SECURE NODE",
  },
  signup: {
    accent: "#059669",
    borderClass: "border-emerald-500/25",
    shadowClass: "shadow-emerald-500/5",
    subtitle: "ENROLLING SECURE USER NODE",
  },
  google: {
    accent: "#3b82f6",
    borderClass: "border-blue-500/25",
    shadowClass: "shadow-blue-500/5",
    subtitle: "SYNCHRONIZING IDENTITY PROVIDER",
  },
  forgot: {
    accent: "#f59e0b",
    borderClass: "border-amber-500/25",
    shadowClass: "shadow-amber-500/5",
    subtitle: "RECOVERING SECURE NODE KEYS",
  },
};

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const parallaxMX = useMotionValue(0);
  const parallaxMY = useMotionValue(0);
  const [windowSize, setWindowSize] = useState({ w: 1920, h: 1080 });

  const mouseX = useRef(0);
  const mouseY = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Read URL query params on mount to support direct links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode") as AuthMode;
    const direct = params.get("direct");
    const token = params.get("token") || params.get("invite");

    if (m === "signup" || m === "google" || m === "forgot") {
      setMode(m);
      setShowLoginForm(true);
    } else if (direct === "true" || token) {
      setShowLoginForm(true);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const m = params.get("mode") as AuthMode;
      if (m === "signup" || m === "google" || m === "forgot") {
        setMode(m);
        setShowLoginForm(true);
      } else {
        setMode("signin");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Window resize tracking
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    mouseX.current = e.clientX;
    mouseY.current = e.clientY;
    const w = windowSize.w || 1920;
    const h = windowSize.h || 1080;
    parallaxMX.set(e.clientX / w - 0.5);
    parallaxMY.set(e.clientY / h - 0.5);
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", newMode);
    window.history.pushState({}, "", url.toString());
  };

  // ── Unified UI scale: viewport-only & panel-independent ──
  // Geometric mean of width/height ratios (neither axis dominates), clamped
  // so coins never feel oversized on Welcome or shrink when Login opens
  // (previously currentPanelWidth dropped 100% → 58.33%, shrinking everything).
  const uiScale = Math.min(
    Math.max(Math.sqrt((windowSize.h / 1080) * (windowSize.w / 1920)), 0.68),
    1.0
  );

  // ── Split-view orbit scale (orbit rings only; coin sizing uses uiScale) ──
  const orbitPanelWidth = windowSize.w * 0.5833;
  const orbitScale = Math.max(
    Math.min(orbitPanelWidth / 1920, windowSize.h / 1080),
    0.55
  );

  const activeTheme = modeThemes[mode];

  // Concentric Orbit Calculations for split-view
  const effectivePanelWidth = Math.min(orbitPanelWidth, 1400);
  const innerRadius = 360 * orbitScale;
  const outerRadius = effectivePanelWidth * 0.82;
  const orbitGap = (outerRadius - innerRadius) / 5;
  const orbitLogoSize = Math.max(240, Math.round(440 * orbitScale));

  // Responsive logo size for the welcome hero:
  // On mobile (< 640px): ~140-150px so it remains bold without crowding
  // On tablet (< 1024px): ~190-200px
  // On desktop (>= 1024px): large ~240-260px matching the login page
  const welcomeLogoSize = windowSize.w < 640
    ? Math.round(Math.min(windowSize.w * 0.36, 150))
    : windowSize.w < 1024
    ? Math.round(Math.min(windowSize.w * 0.26, 200))
    : Math.max(220, Math.round(260 * uiScale));

  // ── Aspect-aware projection for the Welcome constellation ──
  const halfW = windowSize.w / 2;
  const halfH = windowSize.h / 2;
  const aspect = windowSize.w / Math.max(windowSize.h, 1);
  const coinRadiusPx = (BASE_COIN_SIZE * uiScale) / 2;
  const heroHalfW = Math.min(348 * uiScale, (halfW - EDGE_MARGIN) * 0.85);
  const heroHalfH = Math.min(
    (welcomeLogoSize * 0.5 + 115) * uiScale,
    (halfH - EDGE_MARGIN) * 0.65
  );
  // Proportional horizontal expansion: 1.0 on square (1:1), smoothly expanding to ~1.36 on 16:9, and up to 1.45 on ultrawide
  const xStretch = Math.min(1.45, Math.max(1.0, 1.0 + (aspect - 1.0) * 0.46));

  // Proportional coin density based on screen viewport:
  // - Mobile (< 640px): 6 curated perimeter coins for an uncluttered, spacious mobile experience
  // - Tablet (640px - 1023px): 12 balanced coins
  // - Desktop (>= 1024px): Full constellation (all 24 coins)
  const visibleWelcomeCoins = useMemo(() => {
    if (windowSize.w < 640) {
      // 6 key outer perimeter icons (Top-L, Top-R, Mid-L, Mid-R, Bot-L, Bot-R)
      const mobileIds = [2, 4, 5, 9, 12, 15];
      return FLOATING_ICONS.filter((icon) => mobileIds.includes(icon.id));
    }
    if (windowSize.w < 1024) {
      const tabletIds = [1, 2, 4, 5, 7, 8, 9, 10, 12, 13, 15, 16];
      return FLOATING_ICONS.filter((icon) => tabletIds.includes(icon.id));
    }
    return FLOATING_ICONS;
  }, [windowSize.w]);

  // Polar → screen projection: fits the outer ring inside the viewport at
  // ANY aspect ratio (1:1, 16:9, 4:3, ultrawide), pushes inner coins clear
  // of the central hero block, and keeps outer coins off the screen edges.
  const projectCoin = (icon: FloatingIconConfig) => {
    const c = Math.cos(icon.angle);
    const s = Math.sin(icon.angle);

    // Uniform base fit: outermost ring (760) must sit inside the edge margin
    const fit = Math.min(
      (halfH - EDGE_MARGIN) / DESIGN_MAX_RADIUS,
      (halfW - EDGE_MARGIN) / DESIGN_MAX_RADIUS,
      1.0
    );
    let r = icon.baseRadius * fit;

    // Inner bound — safe clearance around the hero (pre-stretch space)
    const heroEdge = rayExit(c, s, heroHalfW / xStretch, heroHalfH);
    const minR = heroEdge + HERO_GAP + coinRadiusPx;

    // Outer bound — never drift past the viewport edge margin (pre-stretch space)
    const maxR = rayExit(c, s, (halfW - EDGE_MARGIN) / xStretch, halfH - EDGE_MARGIN);

    // minR wins normally; on tiny viewports where the hero fills the screen,
    // maxR wins so coins stay on-screen.
    r = Math.min(Math.max(r, minR), Math.max(maxR, 0));
    return { x: c * r * xStretch, y: s * r };
  };

  const getOrbitRadius = (index: number) => innerRadius + (index - 1) * orbitGap;

  // Render concentric orbit ring
  const renderOrbit = (
    coins: FloatingIconConfig[],
    radius: number,
    duration: number,
    direction: "clockwise" | "counter-clockwise",
    orbitIndex: number
  ) => {
    const isClockwise = direction === "clockwise";
    return (
      <div
        key={`orbit-${orbitIndex}`}
        className="absolute flex items-center justify-center pointer-events-none"
        style={{
          width: radius * 2,
          height: radius * 2,
          left: 0,
          top: 0,
          transform: "translate(-50%, -50%)",
          zIndex: 1,
        }}
      >
        <div className="absolute inset-0 border border-solid border-emerald-500/10 rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, rotate: isClockwise ? 360 : -360 }}
          transition={{
            opacity: { duration: 1.5, delay: 0.2 * orbitIndex },
            rotate: { duration, repeat: Infinity, ease: "linear" },
          }}
          className="absolute pointer-events-none"
          style={{ width: 0, height: 0, left: "50%", top: "50%" }}
        >
          {coins.map((iconData, i) => {
            const angle = (360 / coins.length) * i;
            return (
              <div
                key={iconData.id}
                className="absolute pointer-events-auto"
                style={{
                  transform: `translate(-50%, -50%) rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)`,
                }}
              >
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: isClockwise ? -360 : 360 }}
                  transition={{ duration, repeat: Infinity, ease: "linear" }}
                  style={{
                    width: 0,
                    height: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <motion.div layoutId={`coin-${iconData.id}`}>
                    <Icon
                      mouseX={mouseX}
                      mouseY={mouseY}
                      parallaxMX={parallaxMX}
                      parallaxMY={parallaxMY}
                      iconData={iconData}
                      index={i + orbitIndex * 8}
                      showLoginForm={showLoginForm}
                      isAnyNodeHovered={hoveredNode !== null}
                      hoveredNode={hoveredNode}
                      setHoveredNode={setHoveredNode}
                      uiScale={uiScale}
                    />
                  </motion.div>
                </motion.div>
              </div>
            );
          })}
        </motion.div>
      </div>
    );
  };

  const orbit1Coins = FLOATING_ICONS.slice(0, 3);
  const orbit2Coins = FLOATING_ICONS.slice(3, 7);
  const orbit3Coins = FLOATING_ICONS.slice(7, 12);
  const orbit4Coins = FLOATING_ICONS.slice(12, 16);

  return (
    <div
      suppressHydrationWarning
      className="login-page-root w-full h-screen overflow-hidden font-sans select-none bg-[#030305] relative flex flex-col justify-between"
      style={{
        colorScheme: "dark",
        backgroundColor: "#030305",
      }}
    >
      {/* ── Outer Desktop/Web Frame ── */}
      <div
        className="login-page-frame absolute inset-0 overflow-hidden flex flex-col md:flex-row"
        onMouseMove={handleGlobalMouseMove}
      >
        {/* Ambient Ethereal Glow Overlay */}
        <EtheralShadow
          className="w-full h-full"
          sizing="fill"
          color="rgba(16, 185, 129, 0.22)"
          animation={{ scale: 70, speed: 85 }}
          noise={{ opacity: 0, scale: 1.0 }}
        >
          <div className="w-full h-full flex relative overflow-hidden">
            {/* Unified Space Background Canvas */}
            <div className="absolute inset-0 pointer-events-none z-0">
              <UnifiedStars />
            </div>


            {/* Top Operational Status Bar */}
            <div className="absolute top-0 inset-x-0 h-14 border-b border-white/5 flex items-center justify-between px-6 z-40 pointer-events-none">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-black/40 backdrop-blur-md text-xs font-medium text-muted-foreground shadow-xs pointer-events-auto">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <Activity className="h-3 w-3 text-emerald-400" />
                <span>System Status: Operational</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold pointer-events-auto">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>v2.6 Secure Node</span>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                LEFT CONTAINER: Centerpiece Hero OR Concentric Orbiting Rings
                ═══════════════════════════════════════════════════════════════ */}
            <div
              className={`h-full flex items-center justify-center relative overflow-visible transition-[width] duration-500 ease-out ${
                showLoginForm ? "hidden lg:flex lg:w-[58.333333%]" : "w-full"
              }`}
              style={{ perspective: 1000, zIndex: 5 }}
            >
              {showLoginForm ? (
                /* Concentric Orbiting Rings View when form is open */
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    width: 0,
                    height: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                    zIndex: 1,
                  }}
                  className="select-none"
                >
                  {/* Central Luminous Logo Emblem in the center of the Orbit */}
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      transform: "translate(-50%, -50%)",
                      width: orbitLogoSize,
                      height: orbitLogoSize,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 10,
                      pointerEvents: "none",
                    }}
                  >
                    <motion.div
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="relative w-full h-full flex items-center justify-center"
                    >
                      {/* Glowing Core Radial Backdrop */}
                      <div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(16,185,129,0.12) 50%, rgba(3, 3, 5, 0) 75%)",
                          filter: "blur(20px)",
                        }}
                      />

                      {/* Logo Graphic with Emerald Halo */}
                      <div
                        className="w-full h-full flex items-center justify-center filter drop-shadow-[0_0_36px_rgba(16,185,129,0.6)]"
                        style={{
                          padding: `${Math.round(orbitLogoSize * 0.08)}px`,
                        }}
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
                          className="w-full h-full flex items-center justify-center"
                        >
                          <img
                            src="/Logo/thl_logo.svg"
                            alt="ThaibaHive Logo"
                            className="w-full h-full object-contain"
                          />
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Concentric rings */}
                  {mounted && renderOrbit(orbit1Coins, getOrbitRadius(1), 40, "clockwise", 1)}
                  {mounted && renderOrbit(orbit2Coins, getOrbitRadius(2), 56, "counter-clockwise", 2)}
                  {mounted && renderOrbit(orbit3Coins, getOrbitRadius(3), 72, "clockwise", 3)}
                  {mounted && renderOrbit(orbit4Coins, getOrbitRadius(4), 88, "counter-clockwise", 4)}
                </div>
              ) : (
                /* Scattered Interactive Repelling Coins Layer */
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1] overflow-hidden select-none">
                  {mounted &&
                    visibleWelcomeCoins.map((iconData, index) => {
                      const { x: nx, y: ny } = projectCoin(iconData);
                      return (
                        <div
                          key={iconData.id}
                          className="absolute pointer-events-auto"
                          style={{
                            left: "50%",
                            top: "50%",
                            transform: `translate(-50%, -50%) translate3d(${nx}px, ${ny}px, 0)`,
                          }}
                        >
                          <motion.div layoutId={`coin-${iconData.id}`}>
                            <Icon
                              mouseX={mouseX}
                              mouseY={mouseY}
                              parallaxMX={parallaxMX}
                              parallaxMY={parallaxMY}
                              iconData={iconData}
                              index={index}
                              showLoginForm={showLoginForm}
                              isAnyNodeHovered={hoveredNode !== null}
                              hoveredNode={hoveredNode}
                              setHoveredNode={setHoveredNode}
                              uiScale={uiScale}
                            />
                          </motion.div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* ─── FULL-SCREEN WELCOME HERO VIEW ─── */}
              <AnimatePresence mode="wait">
                {!showLoginForm && (
                  <motion.div
                    key="welcome-hero"
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0, scale: 0.95, y: 12 },
                      visible: {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        transition: {
                          staggerChildren: 0.1,
                          delayChildren: 0.1,
                        },
                      },
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.95,
                      y: -12,
                      transition: { duration: 0.22, ease: "easeOut" },
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 80,
                      damping: 18,
                    }}
                    className="max-w-2xl px-6 flex flex-col items-center justify-center text-center relative z-30 select-none"
                  >
                    {/* Rotating Decorative Welcome Logo */}
                    <div
                      className="relative flex items-center justify-center opacity-95 filter drop-shadow-[0_0_36px_rgba(16,185,129,0.55)]"
                      style={{
                        width: welcomeLogoSize,
                        height: welcomeLogoSize,
                        marginBottom: `${Math.max(16, 28 * uiScale)}px`,
                      }}
                    >
                      {/* Glowing Core Radial Backdrop */}
                      <div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(16,185,129,0.12) 50%, rgba(3, 3, 5, 0) 75%)",
                          filter: "blur(20px)",
                        }}
                      />

                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 90,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        style={{
                          width: welcomeLogoSize,
                          height: welcomeLogoSize,
                          padding: `${Math.round(welcomeLogoSize * 0.08)}px`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src="/Logo/thl_logo.svg"
                          alt="ThaibaHive Logo"
                          className="w-full h-full object-contain"
                        />
                      </motion.div>
                    </div>

                    {/* Bold Clean Headline matching MediaHive */}
                    <div className="flex flex-col items-center">
                      <h1
                        className="font-black tracking-tight text-white uppercase m-0 leading-tight"
                        style={{
                          fontSize: `${windowSize.w < 640 ? Math.max(22, Math.round(windowSize.w * 0.062)) : Math.max(26, Math.round(44 * uiScale))}px`,
                          textShadow: "0 2px 24px rgba(255,255,255,0.2)",
                        }}
                      >
                        WELCOME TO THAIBAHIVE
                      </h1>
                    </div>

                    {/* Subtitle */}
                    <p
                      className="mx-auto text-zinc-400 leading-relaxed font-sans"
                      style={{
                        marginTop: `${Math.max(10, 18 * uiScale)}px`,
                        fontSize: `${Math.max(12, 15 * uiScale)}px`,
                        maxWidth: `${Math.min(Math.max(280, 580 * uiScale), windowSize.w - 48)}px`,
                      }}
                    >
                      The Unified App for the Thaiba Family. Seamlessly manage academic operations, attendance, staff intelligence, and campus workflows.
                    </p>

                    {/* Radiant Enter Workspace Button matching MediaHive */}
                    <div
                      style={{ marginTop: `${Math.max(20, 28 * uiScale)}px` }}
                      className="relative z-40"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowLoginForm(true);
                          setMode("signin");
                        }}
                        style={{
                          background: "linear-gradient(135deg, #00d2b4 0%, #00bfa5 100%)",
                          boxShadow: "0 0 35px rgba(0, 210, 180, 0.55), 0 0 15px rgba(0, 210, 180, 0.35)",
                          color: "#030305",
                          fontSize: "13px",
                          minWidth: "205px",
                          cursor: "pointer",
                        }}
                        className="relative group overflow-hidden rounded-full px-8 py-3 font-bold tracking-widest flex items-center justify-center uppercase transition-transform border border-emerald-300/40 select-none pointer-events-auto"
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          ENTER WORKSPACE
                        </span>
                        <div className="absolute inset-0 z-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                RIGHT CONTAINER: MediaHive-Style Glassmorphic Auth Card
                ═══════════════════════════════════════════════════════════════ */}
            <AnimatePresence>
              {showLoginForm && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{
                    type: "spring",
                    stiffness: 85,
                    damping: 18,
                  }}
                  style={{ zIndex: 25 }}
                  className="w-full lg:w-[41.666667%] h-full flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 relative bg-[#040406]/95 border-l border-zinc-900/60 overflow-y-auto"
                >
                  {/* Frosted Glass Auth Card */}
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={`w-full max-w-md relative overflow-hidden text-card-foreground border ${activeTheme.borderClass} rounded-[24px] shadow-2xl dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.06)] ${activeTheme.shadowClass} p-6 sm:p-8 space-y-6`}
                    style={{
                      backgroundColor: "rgba(10, 15, 26, 0.94)",
                      backdropFilter: "blur(20px)",
                      WebkitBackdropFilter: "blur(20px)",
                    }}
                  >
                    {/* Integrated Back Button Inside Login Box */}
                    <div className="flex items-center justify-between pb-1 -mt-1 relative z-20">
                      <button
                        type="button"
                        onClick={() => setShowLoginForm(false)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 bg-background/50 hover:bg-background/80 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs group"
                      >
                        <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform text-emerald-400" />
                        <span>Back</span>
                      </button>
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-400/90 tracking-wider uppercase">
                        <img src="/Logo/thl_logo.svg" alt="Logo" className="h-4 w-4 object-contain" />
                        <span>ThaibaHive</span>
                      </div>
                    </div>

                    <LoginHeader mode={mode} activeTheme={activeTheme} />

                    <LoginForm
                      mode={mode}
                      handleModeChange={handleModeChange}
                      activeTheme={activeTheme}
                    />

                    <div className="space-y-4 pt-1">
                      {mode === "signin" && (
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => handleModeChange("forgot")}
                            className="text-xs text-primary hover:underline font-bold transition-all cursor-pointer"
                          >
                            Forgot password?
                          </button>
                        </div>
                      )}

                      <div className="border-t border-border/50 pt-4 text-center space-y-0.5">
                        <p className="text-[10px] text-muted-foreground font-medium tracking-wide">
                          ThaibaHive secure workspace access protocols are active.
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium tracking-wide">
                          Authorized connections only.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </EtheralShadow>
      </div>

      {/* ── Footer ── */}
      <div className="w-full text-center py-2 z-30 text-xs text-muted-foreground absolute bottom-0 pointer-events-none">
        <p className="text-[10px]" suppressHydrationWarning>
          &copy; 2026 Thaiba Garden Group of Institutions &bull; All Rights Reserved
        </p>
      </div>
    </div>
  );
}
