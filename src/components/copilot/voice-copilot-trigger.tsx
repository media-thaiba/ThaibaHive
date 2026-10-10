"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoiceCopilot } from "@/lib/hooks/use-voice-copilot";

interface VoiceCopilotTriggerProps {
  className?: string;
  variant?: "default" | "compact" | "sidebar";
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
}

export function VoiceCopilotTrigger({
  className,
  variant = "default",
  onSessionStart,
  onSessionEnd,
}: VoiceCopilotTriggerProps) {
  const {
    session,
    isListening,
    isProcessing,
    transcript,
    confidence,
    error,
    startSession,
    endSession,
    sendAudioChunk,
  } = useVoiceCopilot();

  const [showTranscript, setShowTranscript] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Simulate audio level visualization during listening
  useEffect(() => {
    if (!isListening) {
      setAudioLevel(0);
      return;
    }

    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isListening]);

  const handleToggle = useCallback(async () => {
    if (session?.status === "active") {
      await endSession();
      onSessionEnd?.();
    } else {
      await startSession();
      onSessionStart?.();
    }
  }, [session?.status, startSession, endSession, onSessionStart, onSessionEnd]);

  const renderCompact = () => (
    <Button
      onClick={handleToggle}
      disabled={isProcessing}
      aria-label={session?.status === "active" ? "End voice copilot session" : "Start voice copilot"}
      className={cn(
        "relative flex items-center justify-center transition-all duration-200",
        variant === "compact" && "p-2 h-8 w-8",
        variant === "sidebar" && "w-full justify-start px-3 py-2 h-10",
        isProcessing && "opacity-50 cursor-wait",
        className
      )}
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : session?.status === "active" ? (
        <MicOff className="h-4 w-4 text-destructive" />
      ) : (
        <Mic className="h-4 w-4 text-primary" />
      )}

      {/* Audio level indicator when listening */}
      {session?.status === "active" && !isProcessing && (
        <div className="absolute -right-1 -top-1 flex items-center gap-0.5 h-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-0.5 rounded-full bg-primary/60 transition-all duration-75"
              style={{
                height: `${Math.max(4, audioLevel * (i / 4))}px`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>
      )}

      {variant === "sidebar" && (
        <span className="ml-2 text-sm font-medium text-foreground">
          {session?.status === "active" ? "Listening..." : "Voice Copilot"}
        </span>
      )}
    </Button>
  );

  const renderDefault = () => (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Button
        onClick={handleToggle}
        disabled={isProcessing}
        size="lg"
        className={cn(
          "w-16 h-16 rounded-full transition-all duration-300",
          session?.status === "active" ? "bg-destructive/10 text-destructive ring-2 ring-destructive/20" : "bg-primary/10 text-primary ring-2 ring-primary/20",
          isProcessing && "opacity-50 cursor-wait"
        )}
        aria-label={session?.status === "active" ? "End voice session" : "Start voice copilot"}
      >
        {isProcessing ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : session?.status === "active" ? (
          <MicOff className="h-8 w-8 text-destructive" />
        ) : (
          <Mic className="h-8 w-8 text-primary" />
        )}
      </Button>

      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">
          {session?.status === "active" ? "Voice Copilot Active" : "Voice Copilot"}
        </p>
        {session?.status === "active" && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  session.status === "active" && "bg-emerald-500"
                )}
              />
              Listening
            </span>
            {showTranscript && transcript && (
              <span className="text-muted-foreground max-w-[200px] truncate">
                "{transcript}"
              </span>
            )}
            <span className="text-muted-foreground">
              Confidence: {Math.round(confidence * 100)}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowTranscript(!showTranscript)}
          className="text-xs"
        >
          {showTranscript ? "Hide" : "Show"} Transcript
        </Button>
        {error && (
          <span className="text-xs text-destructive flex items-center gap-1">
            ⚠ {error}
          </span>
        )}
      </div>
    </div>
  );

  return variant === "compact" || variant === "sidebar" ? renderCompact() : renderDefault();
}

export function VoiceCopilotButton({ className }: { className?: string }) {
  return <VoiceCopilotTrigger variant="compact" className={className} />;
}