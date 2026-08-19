"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

interface VoiceQueryResponse {
  sttResult: {
    transcript: string;
    confidence: number;
  };
  parsedQuery: {
    intent: string;
    campusId?: string;
    synthesizedAudioText: string;
  };
}

export function ExecutiveVoiceCopilot() {
  const [transcript, setTranscript] = useState<string>("");
  const [isListening, setIsListening] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<VoiceQueryResponse | null>(null);

  const handleExecuteVoiceQuery = (textToQuery: string) => {
    if (!textToQuery.trim()) return;

    setLoading(true);
    setError(null);

    fetch("/api/admin/voice/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcriptText: textToQuery }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Voice query processing failed");
        return res.json();
      })
      .then((data) => {
        setResponse(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to process voice query");
        setLoading(false);
      });
  };

  const toggleMicListening = () => {
    if (!isListening) {
      setIsListening(true);
      setTranscript("Show financial operating margin for Campus North");
      setTimeout(() => {
        setIsListening(false);
        handleExecuteVoiceQuery("Show financial operating margin for Campus North");
      }, 1500);
    } else {
      setIsListening(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Executive Voice Intelligence Center</h1>
        <Badge variant="info">Copilot Swarm Connected</Badge>
      </div>

      {error && (
        <Alert variant="error">
          <span>{error}</span>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Hands-Free Voice Interface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl space-y-3">
              <Button
                variant={isListening ? "destructive" : "default"}
                className="w-16 h-16 rounded-full text-lg"
                onClick={toggleMicListening}
              >
                🎙️
              </Button>
              <div className="text-sm font-medium">
                {isListening ? "Listening to executive voice input..." : "Push microphone to speak"}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold">Or enter voice transcript text:</label>
              <div className="flex gap-2">
                <Input
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="e.g. Show student retention risk alerts for South Campus"
                />
                <Button disabled={loading} onClick={() => handleExecuteVoiceQuery(transcript)}>
                  {loading ? "Processing..." : "Ask Copilot"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Copilot Swarm Intelligence Response</CardTitle>
          </CardHeader>
          <CardContent>
            {response ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">Intent Detected:</span>
                  <Badge variant="success">{response.parsedQuery.intent}</Badge>
                </div>
                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-semibold">Transcript:</span> &quot;{response.sttResult.transcript}&quot;
                  </div>
                  <div>
                    <span className="font-semibold">Confidence:</span> {Math.round(response.sttResult.confidence * 100)}%
                  </div>
                  <div className="p-3 bg-muted rounded-lg border text-sm">
                    <span className="font-semibold block mb-1">Synthesized Voice Answer:</span>
                    {response.parsedQuery.synthesizedAudioText}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Speak or type a voice query to receive instant copilot swarm intelligence.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
