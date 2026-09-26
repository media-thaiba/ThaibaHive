'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PlannerCourse {
  id: string;
  courseCode: string;
  title: string;
  credits: number;
  hasPrerequisiteViolation?: boolean;
  status?: string;
}

interface CourseCardProps {
  course: PlannerCourse;
  onRemove?: (id: string) => void;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onRemove: _onRemove,
}) => {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-card shadow-sm space-y-1 transition-all cursor-move',
        course.hasPrerequisiteViolation ? 'border-destructive/60 bg-destructive/5' : 'hover:border-primary/50'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-sm text-foreground">{course.courseCode}</span>
        <Badge variant={course.hasPrerequisiteViolation ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
          {course.credits} cr
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-1">{course.title}</p>
      {course.hasPrerequisiteViolation && (
        <p className="text-[10px] text-destructive font-medium">⚠️ Prerequisite Unmet</p>
      )}
    </div>
  );
};
