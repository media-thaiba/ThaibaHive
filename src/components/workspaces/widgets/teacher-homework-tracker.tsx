'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList } from 'lucide-react';

interface TeacherTaskData {
  pendingTasks?: number;
  homeworkPendingApprovals?: number;
}

export function TeacherHomeworkTracker({ data }: { data?: TeacherTaskData }) {
  const tasks = data?.pendingTasks ?? 0;
  const homework = data?.homeworkPendingApprovals ?? 0;

  return (
    <Card data-testid="widget-teacher-homework-tracker" role="region" aria-label="Homework Tracker">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Tasks & Homework</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{tasks}</div>
        <p className="text-xs text-muted-foreground mt-1">Pending tasks</p>
        {homework > 0 && (
          <div className="mt-3">
            <Badge variant="info">{homework} homework to review</Badge>
          </div>
        )}
        {tasks === 0 && homework === 0 && (
          <p className="text-xs text-muted-foreground mt-4">No pending items.</p>
        )}
      </CardContent>
    </Card>
  );
}
