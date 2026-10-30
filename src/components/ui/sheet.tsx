"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useDragControls,
  useMotionValue,
  animate,
  PanInfo,
  useReducedMotion,
} from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { appleSprings } from "@/lib/motion";
import { shouldDismissSheet } from "@/lib/sheet-physics";

/* ─── Sheet Context ─── */
interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext() {
  const ctx = React.useContext(SheetContext);
  if (!ctx) throw new Error("Sheet compound components must be used within <Sheet>");
  return ctx;
}

/* ─── Root Sheet Component ─── */
export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  children,
}: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const onOpenChange = isControlled ? controlledOnOpenChange! : setUncontrolledOpen;

  const titleId = React.useId();
  const descriptionId = React.useId();

  return (
    <SheetContext.Provider value={{ open, onOpenChange, titleId, descriptionId }}>
      {children}
    </SheetContext.Provider>
  );
}

/* ─── Sheet Trigger ─── */
export function SheetTrigger({
  children,
  className,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useSheetContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => onOpenChange(true),
    });
  }

  return (
    <button
      type="button"
      className={cn("outline-none", className)}
      onClick={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── Sheet Content ─── */
export interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  showCloseButton?: boolean;
  className?: string;
  dismissThreshold?: number;
}

function subscribeDesktop(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(min-width: 640px)");
  mql.addEventListener?.("change", callback);
  return () => mql.removeEventListener?.("change", callback);
}

function getDesktopSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(min-width: 640px)").matches;
}

function getServerDesktopSnapshot() {
  return false;
}

function subscribeTouch(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener?.("change", callback);
  return () => mql.removeEventListener?.("change", callback);
}

function getTouchSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener?.("change", callback);
  return () => mql.removeEventListener?.("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Global sheet stacking counter for scroll-lock preservation across nested sheets
let activeSheetScrollLockCount = 0;

// Active stack of open sheet closer callbacks (Only top-most sheet closes on Escape)
const activeSheetEscapeStack: (() => void)[] = [];

function shouldExemptFromInert(el: Element, dialogEl: Element | null): boolean {
  if (el === dialogEl || el.contains(dialogEl)) return true;
  if (el.tagName === "SCRIPT" || el.tagName === "STYLE") return true;
  // Exclude toast containers (Sonner) and route announcer so screen reader notifications and route alerts still fire
  if (
    el.hasAttribute("data-sonner-toaster") ||
    el.querySelector?.("[data-sonner-toaster]") ||
    el.id === "next-route-announcer" ||
    el.querySelector?.("#next-route-announcer")
  ) {
    return true;
  }
  // Deliberately broad popper exemption: Radix UI dropdowns and select menus render into portals attached
  // directly to document.body outside the Sheet DOM hierarchy. We exempt active popper containers, menus,
  // and listboxes so controls opened from within the sheet remain interactive and focusable. Note: Any popper
  // already mounted on the page before the sheet opens remains interactive during its unmount cycle; this
  // trade-off is accepted to ensure complete compatibility with portaled child dropdowns and select pickers.
  if (
    el.hasAttribute("data-radix-popper-content-wrapper") ||
    el.querySelector?.("[data-radix-popper-content-wrapper]") ||
    el.getAttribute("role") === "menu" ||
    el.querySelector?.('[role="menu"]') ||
    el.getAttribute("role") === "listbox" ||
    el.querySelector?.('[role="listbox"]')
  ) {
    return true;
  }
  return false;
}

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e: KeyboardEvent) => {
    // If an inner dropdown or modal already consumed the event, ignore to prevent closing sheet
    if (e.defaultPrevented) return;
    if (e.key === "Escape" && activeSheetEscapeStack.length > 0) {
      e.stopPropagation();
      const closeTopSheet = activeSheetEscapeStack[activeSheetEscapeStack.length - 1];
      closeTopSheet?.();
    }
  });
}

export function SheetContent({
  children,
  showCloseButton = true,
  className,
  dismissThreshold = 140,
}: SheetContentProps) {
  const { open, onOpenChange, titleId, descriptionId } = useSheetContext();
  const [mounted, setMounted] = React.useState(false);
  const framerReducedMotion = useReducedMotion();
  const isReducedMotion =
    (typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false) || Boolean(framerReducedMotion);
  const isDesktop = React.useSyncExternalStore(
    subscribeDesktop,
    getDesktopSnapshot,
    getServerDesktopSnapshot
  );
  const isTouch = React.useSyncExternalStore(
    subscribeTouch,
    getTouchSnapshot,
    () => false
  );
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const surfaceRef = React.useRef<HTMLDivElement>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const isPointerDownOnOverlay = React.useRef(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Track iOS Mobile Safari Visual Viewport for Keyboard Insets (--kb-inset)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const updateKeyboardInset = () => {
      const inset = window.innerHeight - vv.height - vv.offsetTop;
      document.documentElement.style.setProperty(
        "--kb-inset",
        `${Math.max(0, inset)}px`
      );
    };

    vv.addEventListener("resize", updateKeyboardInset);
    vv.addEventListener("scroll", updateKeyboardInset);
    updateKeyboardInset();

    return () => {
      vv.removeEventListener("resize", updateKeyboardInset);
      vv.removeEventListener("scroll", updateKeyboardInset);
      document.documentElement.style.removeProperty("--kb-inset");
    };
  }, []);

  // Scroll Arbitration: when at scrollTop <= 0, touch-action is none so downward pull drags sheet.
  // When scrolled down (scrollTop > 0), touch-action is pan-y so internal content scrolls natively.
  React.useEffect(() => {
    if (!open || !surfaceRef.current) return;

    const updateTouchAction = () => {
      const scrollables = Array.from(
        surfaceRef.current?.querySelectorAll<HTMLElement>('[data-sheet-scroll]') ?? []
      );
      scrollables.forEach((el) => {
        if (el.scrollTop <= 0) {
          el.style.touchAction = "none";
        } else {
          el.style.touchAction = "pan-y";
        }
      });
    };

    updateTouchAction();

    const surface = surfaceRef.current;
    surface.addEventListener("scroll", updateTouchAction, { capture: true, passive: true });
    return () => {
      surface.removeEventListener("scroll", updateTouchAction, { capture: true });
    };
  }, [open]);

  // Register in Escape Stack (Guarantees only the top-most nested sheet closes on Escape)
  React.useEffect(() => {
    if (!open) return;
    const closer = () => onOpenChange(false);
    activeSheetEscapeStack.push(closer);

    return () => {
      const idx = activeSheetEscapeStack.lastIndexOf(closer);
      if (idx !== -1) {
        activeSheetEscapeStack.splice(idx, 1);
      }
    };
  }, [open, onOpenChange]);

  // Body Scroll Lock & Screen Reader Background Isolation (Inert siblings & stack-safe for nested sheets)
  React.useEffect(() => {
    if (!open) return;
    const prevActive = document.activeElement as HTMLElement | null;

    if (activeSheetScrollLockCount === 0) {
      document.body.style.overflow = "hidden";
    }
    activeSheetScrollLockCount++;

    const dialogEl = dialogRef.current;
    const inertedByThisSheet: Element[] = [];

    // Isolate background siblings from screen readers (VoiceOver/TalkBack) & interaction
    if (typeof document !== "undefined") {
      Array.from(document.body.children).forEach((child) => {
        if (!shouldExemptFromInert(child, dialogEl)) {
          if (!child.hasAttribute("inert")) {
            child.setAttribute("inert", "");
            child.setAttribute("data-sheet-inert", "true");
            inertedByThisSheet.push(child);
          }
        }
      });
    }

    return () => {
      activeSheetScrollLockCount = Math.max(0, activeSheetScrollLockCount - 1);
      if (activeSheetScrollLockCount === 0) {
        document.body.style.overflow = "";
      }
      inertedByThisSheet.forEach((el) => {
        el.removeAttribute("inert");
        el.removeAttribute("data-sheet-inert");
      });
      prevActive?.focus?.();
    };
  }, [open]);

  // Accessible Focus Trap: Cycle Tab / Shift+Tab within sheet modal
  React.useEffect(() => {
    if (!open || !surfaceRef.current) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !surfaceRef.current) return;

      const focusable = surfaceRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Window pointerup listener to safely reset overlay drag-guard
  React.useEffect(() => {
    const handlePointerUp = () => {
      // Defer reset so in-flight onClick/onPointerUp handlers execute first
      setTimeout(() => {
        isPointerDownOnOverlay.current = false;
      }, 0);
    };
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, []);

  const handleDragStart = () => {
    // Blur any active inputs to dismiss keyboard smoothly without jank
    if (
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLTextAreaElement
    ) {
      document.activeElement.blur();
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentY = y.get();
    const velocityY = info.velocity.y;

    if (shouldDismissSheet(currentY, velocityY, dismissThreshold)) {
      animate(y, 600, {
        ...appleSprings.sheet,
        velocity: velocityY,
        onComplete: () => {
          onOpenChange(false);
          y.set(0);
        },
      });
    } else {
      // Rebound with critical damping spring
      animate(y, 0, appleSprings.criticallyDamped);
    }
  };

  // Scroll Arbitration for Internal Container: Only drag down when scrolled to top
  const handleContentPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isTouch) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('[data-testid="sheet-drag-handle"]')) return;
    if (target?.closest('button, input, select, textarea, a, [role="button"]')) return;

    // Scroll arbitration: only start sheet drag if the touched scroll container is at scrollTop <= 0
    const scrollable = target?.closest<HTMLElement>('[data-sheet-scroll]') ?? scrollRef.current;
    if (scrollable && scrollable.scrollTop > 0) return;

    dragControls.start(e.nativeEvent || e);
  };

  const handleContentTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const scrollable = target?.closest('[data-sheet-scroll]') as HTMLElement | null;
    const currentScrollTop = scrollable ? scrollable.scrollTop : scrollRef.current?.scrollTop ?? 0;
    if (currentScrollTop > 0) {
      e.stopPropagation();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[var(--z-modal,80)] flex items-end sm:items-center justify-center pointer-events-auto"
        >
          {/* Backdrop / Overlay with pointerdown guard against drag-over dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={appleSprings.criticallyDamped}
            onPointerDown={() => {
              isPointerDownOnOverlay.current = true;
            }}
            onPointerUp={() => {
              if (isPointerDownOnOverlay.current) {
                onOpenChange(false);
              }
              isPointerDownOnOverlay.current = false;
            }}
            onClick={() => {
              if (isPointerDownOnOverlay.current) {
                onOpenChange(false);
              }
              isPointerDownOnOverlay.current = false;
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md"
            aria-hidden="true"
          />

          {/* Sheet / Modal Surface (Actual ARIA Dialog container) */}
          <motion.div
            ref={surfaceRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            drag={isTouch ? "y" : false}
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.2, bottom: 0 }}
            style={{ y: isDesktop ? 0 : y }}
            onPointerDown={(e) => {
              isPointerDownOnOverlay.current = false;
              handleContentPointerDown(e);
            }}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            initial={
              isReducedMotion
                ? { y: 0, opacity: 1 }
                : isDesktop
                ? { scale: 0.96, opacity: 0, y: -8 }
                : { y: "100%", opacity: 0.9 }
            }
            animate={
              isReducedMotion
                ? { y: 0, opacity: 1 }
                : isDesktop
                ? { scale: 1, opacity: 1, y: 0 }
                : { y: 0, opacity: 1 }
            }
            exit={
              isReducedMotion
                ? { opacity: 0 }
                : isDesktop
                ? { scale: 0.96, opacity: 0, y: -8 }
                : { y: "100%", opacity: 0 }
            }
            transition={
              isReducedMotion
                ? { duration: 0 }
                : isDesktop
                ? appleSprings.criticallyDamped
                : appleSprings.sheet
            }
            className={cn(
              "relative z-10 flex w-full flex-col overflow-hidden bg-popover/98 text-popover-foreground shadow-2xl backdrop-blur-xl border border-border/80 outline-none",
              // Mobile Bottom Sheet styling
              "rounded-t-3xl max-h-[92dvh] pb-[max(var(--kb-inset,0px),env(safe-area-inset-bottom,0px))]",
              // Desktop Centered Modal styling
              "sm:max-w-lg sm:rounded-2xl sm:max-h-[85vh] sm:pb-0 sm:border dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
              className
            )}
          >
            {/* iOS Pill Drag Handle & Touch Header (touch-action: none) */}
            <div
              data-testid="sheet-drag-handle"
              className="flex w-full shrink-0 flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none sm:hidden touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30 transition-colors" />
            </div>

            {/* Close Button (Accessible non-gesture dismiss) */}
            {showCloseButton && (
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="absolute top-4 right-4 z-20 flex h-8 w-8 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Sheet Content Area (Scroll arbitration delegated to SheetBody or [data-sheet-scroll]) */}
            <div
              ref={scrollRef}
              onTouchMove={handleContentTouchMove}
              className="no-scrollbar flex-1 flex flex-col min-h-0 overflow-hidden p-6 pt-2"
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ─── Sheet Header ─── */
export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-left mb-4", className)}
      {...props}
    />
  );
}

/* ─── Sheet Title ─── */
export function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useSheetContext();
  return (
    <h3
      id={titleId}
      className={cn("text-lg font-semibold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

/* ─── Sheet Description ─── */
export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useSheetContext();
  return (
    <p
      id={descriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/* ─── Sheet Footer ─── */
export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-border/50",
        className
      )}
      {...props}
    />
  );
}

/* ─── Sheet Close ─── */
export function SheetClose({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useSheetContext();
  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className={cn("outline-none", className)}
      {...props}
    >
      {children}
    </button>
  );
}

/* ─── Sheet Drag Handle ─── */
export interface SheetDragHandleProps extends React.HTMLAttributes<HTMLDivElement> {
  "data-testid"?: string;
}

export function SheetDragHandle({
  className,
  "data-testid": testId = "sheet-drag-handle",
  ...props
}: SheetDragHandleProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        "flex w-full shrink-0 flex-col items-center pt-3 pb-1 cursor-grab active:cursor-grabbing select-none sm:hidden touch-none",
        className
      )}
      {...props}
    >
      <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30 transition-colors" />
    </div>
  );
}

/* ─── Sheet Body (Scrollable Container Primitive) ─── */
export interface SheetBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  "data-sheet-scroll"?: string;
}

export function SheetBody({
  className,
  "data-sheet-scroll": scrollAttr = "true",
  ...props
}: SheetBodyProps) {
  return (
    <div
      data-sheet-scroll={scrollAttr}
      className={cn("no-scrollbar flex-1 overflow-y-auto overscroll-contain", className)}
      {...props}
    />
  );
}
