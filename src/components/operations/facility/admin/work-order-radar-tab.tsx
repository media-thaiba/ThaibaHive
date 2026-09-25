import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface WorkOrderRadarTabProps {
  workOrders: any[];
  onOpenDispatchModal?: (wo: any) => void;
  onTransitionStatus?: (woNumber: string, fromStatus: string, toStatus: string) => void;
}

export function WorkOrderRadarTab({
  workOrders = [],
  onOpenDispatchModal,
  onTransitionStatus,
}: WorkOrderRadarTabProps) {
  const getPriorityVariant = (pri: string): 'destructive' | 'warning' | 'info' | 'secondary' => {
    if (pri === 'emergency') return 'destructive';
    if (pri === 'urgent') return 'warning';
    if (pri === 'preventive') return 'info';
    return 'secondary';
  };

  const getStatusVariant = (st: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
    if (st === 'completed' || st === 'verified') return 'success';
    if (st === 'in_progress' || st === 'assigned') return 'warning';
    if (st === 'cancelled') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Autonomous Work Order Radar</CardTitle>
            <div className="text-xs text-muted-foreground mt-0.5">
              Live lifecycle state tracking, 3D indoor technician routing & SLA monitoring
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">WO Number</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Priority</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Assigned Technician</TableHead>
                <TableHead className="text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((wo) => (
                <TableRow key={wo.id}>
                  <TableCell className="font-mono text-xs font-semibold">{wo.workOrderNumber}</TableCell>
                  <TableCell className="text-xs font-medium max-w-xs truncate">{wo.title}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={getPriorityVariant(wo.priority)} className="capitalize">
                      {wo.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs capitalize">{wo.category}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {wo.buildingId} &bull; {wo.floorId}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant={getStatusVariant(wo.status)} className="capitalize">
                      {wo.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {wo.assignedTechnicianId || (
                      <span className="text-muted-foreground italic">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-right space-x-1">
                    {wo.status === 'scheduled' && onOpenDispatchModal && (
                      <Button size="sm" className="h-7 text-xs" onClick={() => onOpenDispatchModal(wo)}>
                        Dispatch
                      </Button>
                    )}
                    {wo.status === 'assigned' && onTransitionStatus && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => onTransitionStatus(wo.workOrderNumber, 'assigned', 'in_progress')}
                      >
                        Start
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
