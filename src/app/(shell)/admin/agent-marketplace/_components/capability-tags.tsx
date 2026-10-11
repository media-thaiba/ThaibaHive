import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

type CapabilityTagsProps = {
  capabilities: string[];
  max?: number;
};

export function CapabilityTags({ capabilities, max = 4 }: CapabilityTagsProps) {
  if (capabilities.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground italic">
        <Wrench aria-hidden className="h-3 w-3" />
        No declared capabilities
      </span>
    );
  }
  const shown = capabilities.slice(0, max);
  const hidden = capabilities.length - shown.length;
  return (
    <span className="flex flex-wrap items-center gap-1" aria-label="Capability tags">
      {shown.map((cap) => (
        <Badge key={cap} variant="outline" className="text-[10px] font-normal">
          {cap}
        </Badge>
      ))}
      {hidden > 0 && (
        <Badge variant="secondary" className="text-[10px] font-normal" title={capabilities.slice(max).join(", ")}>
          +{hidden} more
        </Badge>
      )}
    </span>
  );
}
