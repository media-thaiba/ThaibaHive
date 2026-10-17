import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowUpRight, ChevronRight } from "lucide-react";

type TaskItem = { id: string; title: string; priority: string; dueDate?: string; status: string };

type ActiveTasksPanelProps = {
  tasks: TaskItem[];
  onToggleTask: (taskId: string) => void;
};

export function ActiveTasksPanel({ tasks, onToggleTask }: ActiveTasksPanelProps) {
  return (
    <Card id="tour-tasks" className="border-muted shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base font-semibold">My Active Tasks</CardTitle>
          <p className="text-xs text-muted-foreground">Things you need to focus on today</p>
        </div>
        <Link href="/my-work/tasks" aria-label="View all tasks" className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5">
          View all tasks <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {tasks.length > 0 ? (
          <div className="divide-y divide-border/40">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between py-3 group">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => onToggleTask(task.id)}
                    aria-label={`Mark "${task.title}" as complete`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-muted-foreground/30 hover:border-primary text-transparent hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Badge
                        variant={
                          task.priority === "urgent" || task.priority === "high"
                            ? "destructive"
                            : task.priority === "medium"
                            ? "warning"
                            : "secondary"
                        }
                        className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0"
                      >
                        {task.priority}
                      </Badge>
                      {task.dueDate && (
                        <span className="text-[11px]">Due {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      )}
                    </div>
                  </div>
                </div>
                <Link href={`/my-work/tasks/${task.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-lg">
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-0.5">No pending tasks assigned to you today.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
