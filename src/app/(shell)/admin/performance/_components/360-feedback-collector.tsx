"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FeedbackCollector360() {
  const [peerName, setPeerName] = useState("");
  const [sentList, setSentList] = useState<string[]>(["Dr. Robert Miller (Peer Evaluator)"]);

  const handleSendRequest = () => {
    if (!peerName) return;
    setSentList([...sentList, peerName]);
    setPeerName("");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>360-Degree Peer Feedback Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {sentList.map((item, idx) => (
            <div key={idx} className="p-2 border rounded text-xs flex justify-between items-center">
              <span>{item}</span>
              <span className="text-muted-foreground font-medium">Pending Feedback</span>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-2 border-t">
          <Label className="text-xs">Request Peer Feedback</Label>
          <Input value={peerName} onChange={(e) => setPeerName(e.target.value)} placeholder="Peer Staff Name / Email..." />
          <Button variant="outline" size="sm" onClick={handleSendRequest} className="w-full">Send Request</Button>
        </div>
      </CardContent>
    </Card>
  );
}
