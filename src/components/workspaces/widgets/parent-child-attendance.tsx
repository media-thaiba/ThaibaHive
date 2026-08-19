'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserCheck } from 'lucide-react';

interface ChildData {
  studentName?: string;
  attendanceStatus?: string;
}

interface ParentData {
  children?: ChildData[];
  presentCount?: number;
  totalChildren?: number;
}

export function ParentChildAttendance({ data }: { data?: ParentData }) {
  const children = data?.children ?? [];
  const present = data?.presentCount ?? 0;
  const total = data?.totalChildren ?? children.length;

  return (
    <Card data-testid="widget-parent-child-attendance" role="region" aria-label="Child Attendance">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">Child Attendance</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{present}/{total}</div>
        <p className="text-xs text-muted-foreground mt-1">Children present today</p>
        {children.length > 0 && (
          <div className="flex flex-col gap-1 mt-3">
            {children.map((child, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm">{child.studentName}</span>
                <Badge variant={child.attendanceStatus === 'present' ? 'success' : child.attendanceStatus === 'absent' ? 'destructive' : 'secondary'}>
                  {child.attendanceStatus ?? 'Unknown'}
                </Badge>
              </div>
            ))}
          </div>
        )}
        {total === 0 && (
          <p className="text-xs text-muted-foreground mt-4">No student records found.</p>
        )}
      </CardContent>
    </Card>
  );
}
