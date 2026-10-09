"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, replyToId?: string, attachmentUrl?: string) => Promise<void>;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  replyTo?: { id: string; senderName?: string; content: string } | null;
  onCancelReply?: () => void;
}

export function MessageInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
  replyTo,
  onCancelReply,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    if (onTyping) {
      onTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleSend = async () => {
    if (!content.trim() || isSending || disabled) return;

    const textToSend = content.trim();
    setContent("");
    if (onTyping) onTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    try {
      setIsSending(true);
      await onSendMessage(textToSend, "text", replyTo?.id);
      if (onCancelReply) onCancelReply();
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="border-t bg-card p-3">
      {replyTo && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-muted/70 px-3 py-1.5 text-xs text-muted-foreground border-l-2 border-primary">
          <div className="truncate">
            <span className="font-semibold text-foreground">Replying to {replyTo.senderName || "message"}: </span>
            <span className="truncate">{replyTo.content}</span>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="ml-2 text-muted-foreground hover:text-foreground font-bold"
              aria-label="Cancel reply"
            >
              ✕
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            className={cn(
              "w-full resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              "max-h-32 min-h-[42px]"
            )}
            aria-label="Message text"
          />
        </div>

        <Button
          type="button"
          size="icon"
          onClick={handleSend}
          disabled={!content.trim() || isSending || disabled}
          className="h-[42px] w-[42px] rounded-xl shrink-0"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
