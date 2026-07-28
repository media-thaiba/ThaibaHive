import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Circle } from "lucide-react";

type TourStep = {
  targetId: string;
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
};

const TOUR_STEPS: TourStep[] = [
  { targetId: "tour-profile", title: "Profile Status", content: "Track your profile completion progress here.", position: "bottom" },
  { targetId: "tour-attendance", title: "Attendance & Shift", content: "Quickly check in/out and view your attendance status.", position: "left" },
  { targetId: "tour-tasks", title: "My Tasks Panel", content: "View and manage your active tasks directly from this dashboard checklist.", position: "bottom" },
  { targetId: "tour-shortcuts", title: "Shortcuts", content: "Quick navigation to all major sections of the app.", position: "top" },
];

type GuidedTourProps = {
  active: boolean;
  onClose: () => void;
};

export function GuidedTour({ active, onClose }: GuidedTourProps) {
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) { setStep(0); return; }
    const s = TOUR_STEPS[step];
    if (!s) return;
    const el = document.getElementById(s.targetId);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tooltipEl = ref.current;
    const h = tooltipEl?.offsetHeight || 120;
    const w = tooltipEl?.offsetWidth || 280;
    let top = 0, left = 0;
    switch (s.position) {
      case "bottom": top = rect.bottom + window.scrollY + 12; left = rect.left + window.scrollX + rect.width / 2 - w / 2; break;
      case "top": top = rect.top + window.scrollY - h - 12; left = rect.left + window.scrollX + rect.width / 2 - w / 2; break;
      case "left": top = rect.top + window.scrollY + rect.height / 2 - h / 2; left = rect.left + window.scrollX - w - 12; break;
      case "right": top = rect.top + window.scrollY + rect.height / 2 - h / 2; left = rect.right + window.scrollX + 12; break;
    }
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    top = Math.max(8, top);
    setPos({ top, left });
  }, [active, step]);

  if (!active) return null;

  return (
    <>
      <div className="fixed inset-0 z-[var(--z-overlay)] bg-black/35 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`Tour step ${step + 1} of ${TOUR_STEPS.length}: ${TOUR_STEPS[step]?.title}`}
        aria-describedby="tour-content"
        className="fixed z-[var(--z-tooltip)] w-72 rounded-xl border bg-popover p-4 shadow-lg animate-in fade-in-0 zoom-in-95 duration-200"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p id="tour-title" className="text-sm font-semibold">{TOUR_STEPS[step]?.title}</p>
          <button onClick={onClose} aria-label="Close tour" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p id="tour-content" className="text-xs text-muted-foreground mb-3">{TOUR_STEPS[step]?.content}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5" aria-label="Tour progress">
            {TOUR_STEPS.map((_, i) => (
              <Circle key={i} className={`h-2 w-2 transition-colors ${i === step ? "fill-primary text-primary" : "fill-muted text-muted-foreground"}`} aria-hidden="true" />
            ))}
          </div>
          <div className="flex gap-1.5">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" aria-hidden="true" /> Back
              </Button>
            )}
            {step < TOUR_STEPS.length - 1 ? (
              <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" aria-hidden="true" />
              </Button>
            ) : (
              <Button size="sm" onClick={onClose}>Finish</Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
