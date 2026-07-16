"use client";

import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Check, ArrowRight, Sparkles,
  User, Clock, Calendar, CheckSquare, FileText, ThumbsUp, Bell, Users,
  HelpCircle, Coffee, DollarSign, Truck, Briefcase, ShoppingCart, Store,
} from "lucide-react";
import { toast } from "sonner";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User, Clock, Calendar, CheckSquare, FileText, ThumbsUp, Bell, Users,
  HelpCircle, Coffee, DollarSign, Truck, Briefcase, ShoppingCart,
};

type OnboardingModalProps = {
  open: boolean;
  onComplete: () => void;
};

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<"welcome" | "activating" | "done">("welcome");
  const [progress, setProgress] = useState(0);

  const instantApps = [
    { name: "Digital Profile", icon: "User" },
    { name: "Attendance", icon: "Clock" },
    { name: "Leave Management", icon: "Calendar" },
    { name: "Task Management", icon: "CheckSquare" },
    { name: "Daily Reports", icon: "FileText" },
    { name: "Announcements", icon: "Megaphone" },
    { name: "Events", icon: "CalendarCheck" },
    { name: "Help Desk", icon: "HelpCircle" },
    { name: "Recognition", icon: "Award" },
    { name: "Polls", icon: "ThumbsUp" },
  ];

  useEffect(() => {
    if (step === "activating") {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setStep("done");
            return 100;
          }
          return prev + 10;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleActivate = async () => {
    setStep("activating");
    setProgress(0);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      if (res.ok) {
        setProgress(100);
        setStep("done");
      } else {
        toast.error("Failed to activate modules");
        setStep("welcome");
      }
    } catch {
      toast.error("Failed to activate modules");
      setStep("welcome");
    }
  };

  const handleDismiss = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg">
        {step === "welcome" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <DialogTitle>Welcome to ThaibaHive!</DialogTitle>
              </div>
              <DialogDescription>
                Your account has been created. Let&apos;s set up your workspace with the tools you need.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                We&apos;ll auto-activate <strong>10 instant modules</strong> for you:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {instantApps.map((app) => {
                  const Icon = iconMap[app.icon] ?? Store;
                  return (
                    <div key={app.name} className="flex items-center gap-2 text-sm">
                      <Icon className="h-4 w-4 text-primary" />
                      <span>{app.name}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Additional apps are available in the Marketplace after setup.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleActivate} className="w-full">
                Get Started <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "activating" && (
          <>
            <DialogHeader>
              <DialogTitle>Setting up your workspace</DialogTitle>
              <DialogDescription>
                Activating your instant modules...
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-6">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                {Math.min(progress, 100)}% complete
              </p>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" />
                <DialogTitle>You&apos;re all set!</DialogTitle>
              </div>
              <DialogDescription>
                10 modules have been activated for your account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="rounded-lg border bg-success/5 p-4">
                <h4 className="text-sm font-medium mb-2">Active Modules</h4>
                <div className="flex flex-wrap gap-1.5">
                  {instantApps.map((app) => (
                    <Badge key={app.name} variant="outline" className="border-success/30 text-success">
                      <Check className="h-3 w-3 mr-1" /> {app.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Visit the <strong>Marketplace</strong> to discover more apps and request access to restricted modules.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleDismiss} className="w-full">
                Start Exploring
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
