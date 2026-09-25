'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const AdvisorBookingCard: React.FC = () => {
  const [booked, setBooked] = useState(false);

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold flex items-center justify-between">
          <span>Assigned Academic Counselor</span>
          <Badge variant="success">Available Today</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            DR
          </div>
          <div>
            <p className="font-semibold text-foreground">Dr. Rachel Vance</p>
            <p className="text-muted-foreground text-[11px]">Computer Science Undergraduate Counselor</p>
          </div>
        </div>

        {booked ? (
          <div className="p-2.5 bg-success/10 text-success rounded-lg font-medium text-center">
            ✓ Advising Session Confirmed for Tomorrow at 2:00 PM
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            onClick={() => setBooked(true)}
          >
            Book Advising Appointment
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
