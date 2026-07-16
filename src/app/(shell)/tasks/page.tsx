"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckSquare,
  GripVertical,
  Calendar,
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedToId: string | null;
  dueDate: string | null;
  sortOrder: number;
  createdAt: string;
  assignee?: { firstName: string; lastName: string } | null;
};

const columns = ["todo", "in_progress", "review", "completed"] as const;
const columnLabels: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
};

const columnColors: Record<string, string> = {
  todo: "bg-muted",
  in_progress: "bg-info/10",
  review: "bg-warning/10",
  completed: "bg-success/10",
};

const priorityStyles: Record<string, { badge: "secondary" | "info" | "warning" | "destructive"; bg: string }> = {
  low: { badge: "secondary", bg: "" },
  medium: { badge: "info", bg: "bg-info/[0.03]" },
  high: { badge: "warning", bg: "bg-warning/[0.03]" },
  urgent: { badge: "destructive", bg: "bg-destructive/[0.03]" },
};

function getDueDateStatus(dueDate: string | null): "overdue" | "today" | "upcoming" | "none" {
  if (!dueDate) return "none";
  const now = new Date();
  const due = new Date(dueDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays <= 3) return "upcoming";
  return "none";
}

function dueDateColor(status: ReturnType<typeof getDueDateStatus>): string {
  switch (status) {
    case "overdue": return "text-destructive bg-destructive/10";
    case "today": return "text-warning bg-warning/10";
    case "upcoming": return "text-info bg-info/10";
    default: return "text-muted-foreground";
  }
}

function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dueStatus = getDueDateStatus(task.dueDate);
  const pStyle = priorityStyles[task.priority] || priorityStyles.medium;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border bg-card p-3.5 ${pStyle.bg} space-y-2.5 shadow-xs hover:shadow-sm transition-all duration-200`}
    >
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon-xs"
          className="mt-0.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </Button>
        <Link href={`/tasks/${task.id}`} className="text-sm font-medium hover:underline flex-1 line-clamp-2">
          {task.title}
        </Link>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 pl-6">{task.description}</p>
      )}

      <div className="flex items-center gap-2 pl-6 flex-wrap">
        <Badge variant={pStyle.badge}>{task.priority}</Badge>
        {task.dueDate && (
          <span className={`text-xs px-1.5 py-0.5 rounded-md ${dueDateColor(dueStatus)}`}>
            <Calendar className="h-3 w-3 inline mr-0.5" />
            {dueStatus === "overdue" && "Overdue: "}
            {dueStatus === "today" && "Today: "}
            {task.dueDate}
          </span>
        )}
      </div>

      {task.assignee && (
        <div className="pl-6">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
              {task.assignee.firstName[0]}{task.assignee.lastName[0]}
            </div>
            <span className="text-xs text-muted-foreground">
              {task.assignee.firstName} {task.assignee.lastName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCardOverlay({ task }: { task: Task }) {
  const pStyle = priorityStyles[task.priority] || priorityStyles.medium;
  return (
    <div className={`rounded-xl border bg-card p-3.5 ${pStyle.bg} shadow-lg w-[280px]`}>
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground" />
        <span className="text-sm font-medium line-clamp-2">{task.title}</span>
      </div>
      {task.assignee && (
        <div className="mt-2 pl-6">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
              {task.assignee.firstName[0]}{task.assignee.lastName[0]}
            </div>
            <span className="text-xs text-muted-foreground">
              {task.assignee.firstName} {task.assignee.lastName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { staff } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [mobileColumn, setMobileColumn] = useState<string>("todo");
  const [scope, setScope] = useState<"all" | "my" | "department">("all");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
    useSensor(TouchSensor)
  );

  const fetchTasks = useCallback(async (s: "all" | "my" | "department") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?scope=${s}`);
      const d = await res.json();
      setTasks(Array.isArray(d.tasks) ? d.tasks : []);
    } catch {
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(scope);
  }, [scope, fetchTasks]);

  async function saveTasksOrder(updates: { id: string; status: string; sortOrder: number }[]) {
    try {
      const res = await fetch("/api/tasks/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: updates }),
      });
      if (!res.ok) {
        throw new Error("Failed to persist task reorder");
      }
    } catch (err) {
      console.error(err);
      toast.error("Couldn't save task order \u2014 reverted");
      fetchTasks(scope);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeTaskObj = tasks.find((t) => t.id === activeId);
    if (!activeTaskObj) return;

    const overTaskObj = tasks.find((t) => t.id === overId);

    let updatedTasks = [...tasks];

    if (activeTaskObj && overTaskObj && activeTaskObj.status === overTaskObj.status) {
      // Same-column sorting
      const oldIndex = tasks.findIndex((t) => t.id === activeId);
      const newIndex = tasks.findIndex((t) => t.id === overId);
      updatedTasks = arrayMove(tasks, oldIndex, newIndex);
    } else if (columns.includes(overId as any)) {
      // Cross-column drop onto a column container
      const targetColumn = overId;
      const activeIndex = tasks.findIndex((t) => t.id === activeId);
      
      // Update status
      updatedTasks[activeIndex] = { ...activeTaskObj, status: targetColumn };
      const taskToMove = updatedTasks[activeIndex];
      
      // Filter active out, then place at the end of the column
      const tasksWithoutActive = updatedTasks.filter((t) => t.id !== activeId);
      const targetColTasks = tasksWithoutActive.filter((t) => t.status === targetColumn);
      
      if (targetColTasks.length > 0) {
        const lastColTask = targetColTasks[targetColTasks.length - 1];
        const lastColTaskIdx = tasksWithoutActive.findIndex((t) => t.id === lastColTask.id);
        tasksWithoutActive.splice(lastColTaskIdx + 1, 0, taskToMove);
      } else {
        tasksWithoutActive.push(taskToMove);
      }
      updatedTasks = tasksWithoutActive;
    } else if (overTaskObj) {
      // Cross-column drop onto another task card
      const targetColumn = overTaskObj.status;
      
      const updatedActive = { ...activeTaskObj, status: targetColumn };
      const tempTasks = tasks.filter((t) => t.id !== activeId);
      const newOverIndex = tempTasks.findIndex((t) => t.id === overId);
      
      tempTasks.splice(newOverIndex, 0, updatedActive);
      updatedTasks = tempTasks;
    }

    // Recalculate sequential sortOrder for tasks in each column to prevent gaps
    const tasksByStatus: Record<string, typeof tasks> = {
      todo: [],
      in_progress: [],
      review: [],
      completed: []
    };

    updatedTasks.forEach((t) => {
      if (tasksByStatus[t.status]) {
        tasksByStatus[t.status].push(t);
      }
    });

    const finalTasks: Task[] = [];
    const dbUpdates: { id: string; status: string; sortOrder: number }[] = [];

    columns.forEach((col) => {
      tasksByStatus[col].forEach((task, index) => {
        finalTasks.push({ ...task, sortOrder: index });
        dbUpdates.push({ id: task.id, status: col, sortOrder: index });
      });
    });

    // Optimistically update frontend state
    setTasks(finalTasks);

    // Persist reorder to database
    saveTasksOrder(dbUpdates);
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8">
      <PageHeader
        title="Tasks"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border bg-muted/30 p-0.5">
              {(["all", "my", "department"] as const).map((s) => (
                <Button
                  key={s}
                  variant={scope === s ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setScope(s)}
                  className="text-xs h-7 px-2.5"
                >
                  {s === "all" ? "All" : s === "my" ? "My Tasks" : "Dept Tasks"}
                </Button>
              ))}
            </div>
            <Link href="/tasks/new">
              <Button>New Task</Button>
            </Link>
          </div>
        }
        className="mb-6"
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="h-12 w-12" />}
          title="No tasks yet"
          description="Create your first task to get started. Drag tasks between columns to update their status."
          action={{ label: "Create Task", href: "/tasks/new" }}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Mobile column tabs */}
          <div className="flex sm:hidden gap-1 mb-4 overflow-x-auto">
            {columns.map((col) => {
              const count = tasks.filter((t) => t.status === col).length;
              return (
                <Button
                  key={col}
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileColumn(col)}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    mobileColumn === col
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {columnLabels[col]} ({count})
                </Button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col);
              const isVisible = mobileColumn === col;
              return (
                <div key={col} className={`rounded-xl border bg-muted/20 ${!isVisible ? "hidden sm:block" : ""}`}>
                  <div className={`border-b px-3.5 py-2.5 flex items-center justify-between rounded-t-xl ${columnColors[col]}`}>
                    <span className="text-sm font-medium">{columnLabels[col]}</span>
                    <Badge variant="secondary" className="text-xs">
                      {colTasks.length}
                    </Badge>
                  </div>
                  <SortableContext
                    items={colTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="p-2.5 space-y-2.5 min-h-[300px]">
                      {colTasks.map((task) => (
                        <SortableTaskCard key={task.id} task={task} />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
