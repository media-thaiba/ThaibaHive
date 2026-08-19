import { StreamEventFrame } from "./realtime-streaming-service";

export function getSSEHeaders(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

export function formatSSEEvent(event: StreamEventFrame): string {
  const dataString = JSON.stringify(event.payload);
  return `id: ${event.eventId}\nevent: ${event.channel}\ndata: ${dataString}\n\n`;
}

export function formatSSEComment(comment: string): string {
  return `: ${comment}\n\n`;
}

export function formatSSEResponse(events: StreamEventFrame[]): string {
  return events.map((e) => formatSSEEvent(e)).join("");
}
