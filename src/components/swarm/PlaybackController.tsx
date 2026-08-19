"use client";

import React, { useTransition } from "react";
import { usePlaybackState } from "@/lib/observability/playback-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, SkipForward, SkipBack, Calendar, Loader2, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

// PlayPauseButton Subcomponent
interface PlayPauseButtonProps {
  isPlaying: boolean;
  disabled: boolean;
  onPlay: () => void;
  onPause: () => void;
}

const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({
  isPlaying,
  disabled,
  onPlay,
  onPause,
}) => {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      disabled={disabled}
      onClick={isPlaying ? onPause : onPlay}
      className={cn(
        "transition-colors",
        isPlaying ? "border-amber-500/50 hover:bg-amber-500/10 text-amber-500" : "border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-500"
      )}
    >
      {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 fill-emerald-500" />}
    </Button>
  );
};

// TimelineSlider Subcomponent
interface TimelineSliderProps {
  currentIndex: number;
  maxIndex: number;
  disabled: boolean;
  onScrub: (index: number) => void;
}

const TimelineSlider: React.FC<TimelineSliderProps> = ({
  currentIndex,
  maxIndex,
  disabled,
  onScrub,
}) => {
  const value = maxIndex > 0 ? currentIndex : 0;
  return (
    <input
      type="range"
      min={0}
      max={maxIndex > 0 ? maxIndex : 0}
      value={value}
      disabled={disabled}
      onChange={(e) => onScrub(parseInt(e.target.value, 10))}
      className={cn(
        "w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-primary focus:outline-none",
        disabled && "opacity-30 cursor-not-allowed"
      )}
    />
  );
};

// SpeedSelector Subcomponent
interface SpeedSelectorProps {
  currentSpeed: number;
  disabled: boolean;
  onSpeedChange: (speed: number) => void;
}

const SpeedSelector: React.FC<SpeedSelectorProps> = ({
  currentSpeed,
  disabled,
  onSpeedChange,
}) => {
  const speeds = [0.5, 1, 2, 5];
  return (
    <div className="flex items-center gap-1">
      <Gauge className="size-3.5 text-muted-foreground mr-1" />
      {speeds.map((speed) => (
        <Button
          key={speed}
          variant="outline"
          size="xs"
          disabled={disabled}
          onClick={() => onSpeedChange(speed)}
          className={cn(
            "text-xs px-1.5 h-6",
            currentSpeed === speed
              ? "bg-primary/25 border-primary text-primary hover:bg-primary/30"
              : "hover:bg-muted"
          )}
        >
          {speed}x
        </Button>
      ))}
    </div>
  );
};

// Main PlaybackController Component
export const PlaybackController: React.FC = () => {
  const {
    isPlaybackMode,
    isPlaying,
    playbackSpeed,
    currentTime,
    startTime,
    endTime,
    events,
    currentIndex,
    togglePlaybackMode,
    setPlaybackRange,
    loadEvents,
    play,
    pause,
    stepForward,
    stepBackward,
    scrubTimeline,
    setPlaybackSpeed,
  } = usePlaybackState();

  const [isPending, startTransition] = useTransition();

  const handleLoadEvents = () => {
    startTransition(async () => {
      await loadEvents();
    });
  };

  const hasEvents = events.length > 0;
  const isControlsDisabled = !isPlaybackMode || !hasEvents || isPending;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Toggle & Load Group */}
        <div className="flex items-center gap-3">
          <Button
            variant={isPlaybackMode ? "default" : "outline"}
            size="sm"
            onClick={togglePlaybackMode}
            className={cn(
              isPlaybackMode
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "border-border text-muted-foreground"
            )}
          >
            {isPlaybackMode ? "Exit Playback" : "Enter Playback Mode"}
          </Button>

          {isPlaybackMode && (
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={handleLoadEvents}
              className="gap-1.5"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Calendar className="size-3.5" />
              )}
              {isPending ? "Loading..." : "Load Range Trace"}
            </Button>
          )}
        </div>

        {/* Date Inputs */}
        {isPlaybackMode && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">From:</span>
              <Input
                type="datetime-local"
                value={startTime.substring(0, 16)}
                onChange={(e) => {
                  const isoString = new Date(e.target.value).toISOString();
                  setPlaybackRange(isoString, endTime);
                }}
                disabled={isPending}
                className="h-8 py-0 px-2 text-xs w-44"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">To:</span>
              <Input
                type="datetime-local"
                value={endTime.substring(0, 16)}
                onChange={(e) => {
                  const isoString = new Date(e.target.value).toISOString();
                  setPlaybackRange(startTime, isoString);
                }}
                disabled={isPending}
                className="h-8 py-0 px-2 text-xs w-44"
              />
            </div>
          </div>
        )}
      </div>

      {/* Playback Progress and Timeline controls */}
      {isPlaybackMode && (
        <div
          className={cn(
            "p-3 rounded-lg border border-slate-800 bg-slate-900/50 space-y-3 transition-opacity",
            !hasEvents && "opacity-50"
          )}
        >
          {/* Timeline and scrubber */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Timeline Progress</span>
              <span>
                {hasEvents
                  ? `Tick ${currentIndex + 1} / ${events.length}`
                  : "No trace loaded — Select date range and click Load"}
              </span>
            </div>
            <TimelineSlider
              currentIndex={currentIndex}
              maxIndex={events.length - 1}
              disabled={isControlsDisabled}
              onScrub={scrubTimeline}
            />
          </div>

          {/* Action buttons panel */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={isControlsDisabled || currentIndex <= 0}
                onClick={stepBackward}
              >
                <SkipBack className="size-3.5" />
              </Button>

              <PlayPauseButton
                isPlaying={isPlaying}
                disabled={isControlsDisabled}
                onPlay={play}
                onPause={pause}
              />

              <Button
                variant="outline"
                size="icon-sm"
                disabled={isControlsDisabled || currentIndex >= events.length - 1}
                onClick={stepForward}
              >
                <SkipForward className="size-3.5" />
              </Button>
            </div>

            {/* Current Virtual Timestamp */}
            {hasEvents && currentTime && (
              <div className="text-xs text-amber-500 font-mono">
                [VIRTUAL TIME] {new Date(currentTime).toLocaleString()}
              </div>
            )}

            {/* Speed Selector */}
            <SpeedSelector
              currentSpeed={playbackSpeed}
              disabled={isControlsDisabled}
              onSpeedChange={setPlaybackSpeed}
            />
          </div>
        </div>
      )}
    </div>
  );
};
