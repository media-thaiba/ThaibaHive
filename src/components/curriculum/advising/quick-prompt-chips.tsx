'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ensureArray } from '@/lib/utils';

interface QuickPromptChipsProps {
  prompts?: string[];
  onSelectPrompt: (prompt: string) => void;
}

export const QuickPromptChips: React.FC<QuickPromptChipsProps> = ({
  prompts = [],
  onSelectPrompt,
}) => {
  const safePrompts = ensureArray<string>(prompts);
  if (safePrompts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 py-2">
      {safePrompts.map((p, idx) => (
        <Button
          key={idx}
          variant="outline"
          size="sm"
          className="text-xs h-7 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => onSelectPrompt(p)}
        >
          {p}
        </Button>
      ))}
    </div>
  );
};
