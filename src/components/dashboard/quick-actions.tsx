import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, ClipboardPlus } from "lucide-react";

type QuickActionsProps = {
  onOpenLeave: () => void;
  onOpenTask: () => void;
};

export function QuickActions({ onOpenLeave, onOpenTask }: QuickActionsProps) {
  return (
    <Card className="border-muted shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0 space-y-2">
        <Button
          variant="outline"
          onClick={onOpenLeave}
          className="w-full justify-start gap-3 py-5 rounded-lg border-border/60 hover:border-warning/40 hover:bg-warning/[0.05] transition-all duration-150 text-left group"
        >
          <div className="p-1.5 rounded-md bg-warning/10 text-warning group-hover:scale-105 transition-transform">
            <CalendarPlus className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold group-hover:text-warning transition-colors">Apply for Leave</p>
            <p className="text-[10px] text-muted-foreground font-normal">Submit a new request</p>
          </div>
        </Button>
        <Button
          variant="outline"
          onClick={onOpenTask}
          className="w-full justify-start gap-3 py-5 rounded-lg border-border/60 hover:border-info/40 hover:bg-info/[0.05] transition-all duration-150 text-left group"
        >
          <div className="p-1.5 rounded-md bg-info/10 text-info group-hover:scale-105 transition-transform">
            <ClipboardPlus className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold group-hover:text-info transition-colors">Create Task</p>
            <p className="text-[10px] text-muted-foreground font-normal">Assign to team members</p>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
}
