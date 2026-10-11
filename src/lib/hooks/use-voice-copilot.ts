"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface VoiceSession {
  id: string;
  status: "idle" | "active" | "processing" | "error";
  transcript: string;
  confidence: number;
  error?: string;
  createdAt: Date;
  endedAt?: Date;
}

interface VoiceCopilotState {
  session: VoiceSession | null;
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  confidence: number;
  error?: string;
}

export function useVoiceCopilot() {
  const [state, setState] = useState<VoiceCopilotState>({
    session: null,
    isListening: false,
    isProcessing: false,
    transcript: "",
    confidence: 0,
    error: undefined,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startSession = useCallback(async () => {
    try {
      setState((prev) => ({
        ...prev,
        isListening: true,
        isProcessing: false,
        error: undefined,
        transcript: "",
        confidence: 0,
      }));

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      const sessionId = `vc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const newSession: VoiceSession = {
        id: sessionId,
        status: "active",
        transcript: "",
        confidence: 0,
        createdAt: new Date(),
      };

      setState((prev) => ({
        ...prev,
        session: newSession,
        isListening: true,
        isProcessing: false,
        transcript: "",
        confidence: 0,
      }));

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" });
        
        setState((prev) => ({
          ...prev,
          isProcessing: true,
          isListening: false,
        }));

        try {
          // Send audio to server for STT processing
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");
          formData.append("format", "webm");

          const response = await fetch("/api/ai/copilot/voice/interact", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Voice processing failed");
          }

          const result = await response.json();

          setState((prev) => ({
            ...prev,
            isProcessing: false,
            transcript: result.transcript || "",
            confidence: result.confidence || 0,
            session: prev.session
              ? { ...prev.session, transcript: result.transcript || "", confidence: result.confidence || 0, status: "active" }
              : null,
          }));

          // If there's a response with TTS audio, play it
          if (result.audioBase64) {
            const audio = new Audio(`data:audio/mp3;base64,${result.audioBase64}`);
            audio.play().catch(console.error);
          }
        } catch (error) {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            error: error instanceof Error ? error.message : "Voice processing failed",
            session: prev.session ? { ...prev.session, status: "error" } : null,
          }));
        }
      };

      mediaRecorder.start(250); // Collect data every 250ms
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isListening: false,
        isProcessing: false,
        error: error instanceof Error ? error.message : "Failed to start voice session",
        session: prev.session ? { ...prev.session, status: "error" } : null,
      }));
    }
  }, []);

  const endSession = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isListening: false,
      isProcessing: false,
      session: prev.session
        ? { ...prev.session, status: "idle", endedAt: new Date() }
        : null,
    }));
  }, []);

  const sendAudioChunk = useCallback(async (_chunk: Blob) => {
    // For real-time streaming, we could send chunks to a WebSocket
    // For now, we collect chunks in the MediaRecorder
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    session: state.session,
    isListening: state.isListening,
    isProcessing: state.isProcessing,
    transcript: state.transcript,
    confidence: state.confidence,
    error: state.error,
    startSession,
    endSession,
    sendAudioChunk,
  };
}