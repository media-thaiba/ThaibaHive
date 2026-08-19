"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckIcon, ChevronRightIcon } from "lucide-react";

type WizardStep = {
  id: string;
  title: string;
  description: string;
};

const STEPS: WizardStep[] = [
  { id: "profile", title: "Personal Profile", description: "Verify your personal information" },
  { id: "department", title: "Department Assignment", description: "Confirm your department and role" },
  { id: "nfc", title: "NFC Card Setup", description: "Pair your NFC card for check-in" },
  { id: "notifications", title: "Notifications", description: "Set your notification preferences" },
  { id: "complete", title: "All Done!", description: "You are ready to use ThaibaHive" },
];

type StaffOnboardingWizardProps = {
  staffId: string;
  onComplete: () => void;
};

export function StaffOnboardingWizard({ staffId, onComplete }: StaffOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  function handleNext() {
    const step = STEPS[currentStep];
    if (step) {
      setCompletedSteps((prev) => new Set([...prev, step.id]));
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete();
    }
  }

  const step = STEPS[currentStep];
  if (!step) return null;
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={
                i < currentStep
                  ? "flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold"
                  : i === currentStep
                  ? "flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary text-primary text-xs font-semibold"
                  : "flex h-7 w-7 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground text-xs"
              }
            >
              {i < currentStep ? <CheckIcon className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-8 ${i < currentStep ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{step.title}</CardTitle>
            <Badge variant="secondary">
              Step {currentStep + 1} of {STEPS.length}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step.id === "profile" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input placeholder="Your full name" />
              </div>
              <div className="space-y-1">
                <Label>Phone Number</Label>
                <Input placeholder="+91 XXXXX XXXXX" />
              </div>
            </div>
          )}
          {step.id === "department" && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Your department assignment has been configured by the administrator. Please verify it looks correct.
            </div>
          )}
          {step.id === "nfc" && (
            <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              Tap your NFC card to pair it with your account, or skip this step to do it later.
            </div>
          )}
          {step.id === "notifications" && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Push notifications are enabled. You will receive alerts for leave approvals, announcements, and tasks.</p>
            </div>
          )}
          {step.id === "complete" && (
            <div className="text-center space-y-2 py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <CheckIcon className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium">Onboarding complete!</p>
              <p className="text-sm text-muted-foreground">You can now use all ThaibaHive features.</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={handleNext} className="gap-2">
              {isLast ? "Get Started" : "Continue"}
              {!isLast && <ChevronRightIcon className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
