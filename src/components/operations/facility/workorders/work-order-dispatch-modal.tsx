import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TechnicianAssignmentCard, RankedTechnician } from './technician-assignment-card';
import { PartsReservationPicker, SparePartItem } from './parts-reservation-picker';

interface WorkOrderDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrderNumber: string;
  workOrderTitle: string;
  rankedTechnicians: RankedTechnician[];
  availableParts: SparePartItem[];
  onConfirmDispatch: (payload: { technicianId: string; reservedParts: { partNumber: string; quantity: number }[] }) => void;
}

export function WorkOrderDispatchModal({
  isOpen,
  onClose,
  workOrderNumber,
  workOrderTitle,
  rankedTechnicians = [],
  availableParts = [],
  onConfirmDispatch,
}: WorkOrderDispatchModalProps) {
  const [selectedTechId, setSelectedTechId] = useState<string>(
    rankedTechnicians.length > 0 ? rankedTechnicians[0].technicianId : ''
  );
  const [selectedParts, setSelectedParts] = useState<{ partNumber: string; quantity: number }[]>([]);

  const handleConfirm = () => {
    if (!selectedTechId) return;
    onConfirmDispatch({
      technicianId: selectedTechId,
      reservedParts: selectedParts,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center justify-between">
            <span>Spatial Autonomous Dispatch</span>
            <span className="font-mono text-xs text-muted-foreground">{workOrderNumber}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {workOrderTitle} &bull; Select technician candidate based on 3D spatial routing & skill fit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Technician Selection */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Optimal Ranked Technicians
            </div>
            <div className="space-y-2">
              {rankedTechnicians.map((tech) => (
                <TechnicianAssignmentCard
                  key={tech.technicianId}
                  technician={tech}
                  isSelected={selectedTechId === tech.technicianId}
                  onSelect={setSelectedTechId}
                />
              ))}
            </div>
          </div>

          {/* Parts Reservation */}
          <PartsReservationPicker
            availableParts={availableParts}
            selectedParts={selectedParts}
            onChange={setSelectedParts}
          />
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!selectedTechId} onClick={handleConfirm}>
            Confirm Dispatch & Reserve Parts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
