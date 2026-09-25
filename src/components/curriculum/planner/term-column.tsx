'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CourseCard, PlannerCourse } from './course-card';
import { CreditMeter } from './credit-meter';
import { ensureArray } from '@/lib/utils';

export interface TermData {
  termIndex: number;
  termName: string;
  courses: PlannerCourse[];
}

interface TermColumnProps {
  term: TermData;
  onRemoveCourse?: (courseId: string) => void;
}

export const TermColumn: React.FC<TermColumnProps> = ({
  term,
  onRemoveCourse,
}) => {
  const safeCourses = ensureArray<PlannerCourse>(term.courses);
  const totalCredits = safeCourses.reduce((sum, c) => sum + (c.credits || 3), 0);

  return (
    <Card className="flex flex-col h-full min-w-[220px] bg-muted/20">
      <CardHeader className="py-2.5 px-3 border-b bg-card rounded-t-lg">
        <CardTitle className="text-xs font-bold text-foreground flex items-center justify-between">
          <span>{term.termName}</span>
          <span className="text-[11px] text-muted-foreground font-normal">Term {term.termIndex}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {safeCourses.map((c) => (
            <CourseCard key={c.id} course={c} onRemove={onRemoveCourse} />
          ))}
          {safeCourses.length === 0 && (
            <div className="border border-dashed rounded-lg p-4 text-center text-xs text-muted-foreground">
              Drop course here
            </div>
          )}
        </div>
        <CreditMeter credits={totalCredits} />
      </CardContent>
    </Card>
  );
};
