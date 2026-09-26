'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TermColumn, TermData } from './term-column';
import { PrerequisiteLineOverlay } from './prerequisite-line-overlay';
import { ensureArray } from '@/lib/utils';

interface DegreePlannerCanvasProps {
  initialTerms?: TermData[];
  onSavePlan?: (terms: TermData[]) => void;
}

const defaultInitialTerms: TermData[] = [
  {
    termIndex: 1,
    termName: 'Year 1 Fall',
    courses: [
      { id: 'c_cs101', courseCode: 'CS101', title: 'Intro to Programming', credits: 4 },
      { id: 'c_math151', courseCode: 'MATH151', title: 'Calculus I', credits: 4 },
      { id: 'c_eng101', courseCode: 'ENG101', title: 'College Composition', credits: 3 },
      { id: 'c_gen1', courseCode: 'GEN100', title: 'First Year Seminar', credits: 3 },
    ],
  },
  {
    termIndex: 2,
    termName: 'Year 1 Spring',
    courses: [
      { id: 'c_cs102', courseCode: 'CS102', title: 'Data Structures', credits: 4 },
      { id: 'c_math152', courseCode: 'MATH152', title: 'Discrete Mathematics', credits: 3 },
      { id: 'c_phys1', courseCode: 'PHYS101', title: 'University Physics I', credits: 4 },
      { id: 'c_gen2', courseCode: 'HUM101', title: 'World History', credits: 3 },
    ],
  },
  {
    termIndex: 3,
    termName: 'Year 2 Fall',
    courses: [
      { id: 'c_cs201', courseCode: 'CS201', title: 'Algorithms', credits: 4 },
      { id: 'c_cs210', courseCode: 'CS210', title: 'Computer Architecture', credits: 4 },
      { id: 'c_stat1', courseCode: 'STAT200', title: 'Probability & Statistics', credits: 3 },
      { id: 'c_gen3', courseCode: 'PSY101', title: 'General Psychology', credits: 3 },
    ],
  },
  {
    termIndex: 4,
    termName: 'Year 2 Spring',
    courses: [
      { id: 'c_cs301', courseCode: 'CS301', title: 'Operating Systems', credits: 4 },
      { id: 'c_cs320', courseCode: 'CS320', title: 'Database Systems', credits: 3 },
      { id: 'c_cs330', courseCode: 'CS330', title: 'Software Engineering', credits: 3 },
      { id: 'c_gen4', courseCode: 'COM101', title: 'Public Speaking', credits: 3 },
    ],
  },
];

export const DegreePlannerCanvas: React.FC<DegreePlannerCanvasProps> = ({
  initialTerms = defaultInitialTerms,
  onSavePlan,
}) => {
  const [terms] = useState<TermData[]>(initialTerms);

  const totalDegreeCredits = terms.reduce(
    (total, term) => total + term.courses.reduce((sum, c) => sum + (c.credits || 3), 0),
    0
  );

  return (
    <div className="space-y-4 relative">
      <PrerequisiteLineOverlay />

      <Card className="bg-card">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Interactive 4-Year Visual Degree Roadmap</span>
              <Badge variant="info">{totalDegreeCredits} / 120 Credits Planned</Badge>
            </div>
            <Button size="sm" onClick={() => onSavePlan && onSavePlan(terms)}>
              Save Degree Roadmap
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex gap-4 overflow-x-auto pb-4">
            {ensureArray<TermData>(terms).map((term) => (
              <TermColumn key={term.termIndex} term={term} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
