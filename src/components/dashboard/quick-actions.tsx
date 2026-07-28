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
          className="w-full justify-start gap-3 py-5 rounded-lg hover:bg-muted/40 hover:text-primary transition-colors text-left"
        >
          <CalendarPlus className="h-4 w-4 text-warning" />
          <div className="min-w-0">
            <p className="text-xs font-semibold">Apply for Leave</p>
            <p className="text-[10px] text-muted-foreground font-normal">Submit a new request</p>
          </div>
        </Button>
        <Button
          variant="outline"
          onClick={onOpenTask}
          className="w-full justify-start gap-3 py-5 rounded-lg hover:bg-muted/40 hover:text-primary transition-colors text-left"
        >
          <ClipboardPlus className="h-4 w-4 text-info" />
          <div className="min-w-0">
            <p className="text-xs font-semibold">Create Task</p>
            <p className="text-[10px] text-muted-foreground font-normal">Assign to team members</p>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
}
