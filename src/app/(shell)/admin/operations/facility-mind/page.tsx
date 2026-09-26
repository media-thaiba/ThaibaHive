'use client';

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EquipmentStudioTab } from '@/components/operations/facility/admin/equipment-studio-tab';
import { PredictiveMatrixTab } from '@/components/operations/facility/admin/predictive-matrix-tab';
import { WorkOrderRadarTab } from '@/components/operations/facility/admin/work-order-radar-tab';
import { InventoryVaultTab } from '@/components/operations/facility/admin/inventory-vault-tab';
import { EnergyLoadTab } from '@/components/operations/facility/admin/energy-load-tab';
import { WorkOrderDispatchModal } from '@/components/operations/facility/workorders/work-order-dispatch-modal';
import { TwinFloorMap } from '@/components/operations/facility/twin/facility-twin-types';

export default function FacilityMindAdminPage() {
  const [activeTab, setActiveTab] = useState('equipment');
  const [equipment, setEquipment] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch modal state
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
  const [rankedTechs, setRankedTechs] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/facility/equipment').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/facility/alerts').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/facility/workorders').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/facility/inventory').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/facility/inventory?checkReorder=true').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([eqRes, altRes, woRes, partRes, reqRes]) => {
        if (eqRes?.equipment) setEquipment(eqRes.equipment);
        if (altRes?.alerts) setAlerts(altRes.alerts);
        if (woRes?.workOrders) setWorkOrders(woRes.workOrders);
        if (partRes?.parts) setParts(partRes.parts);
        if (reqRes?.requisitions) setRequisitions(reqRes.requisitions);
      })
      .catch(() => {
        // Safe error fallback
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleOpenDispatchModal = async (wo: any) => {
    setSelectedWorkOrder(wo);
    // Fetch technician ranking from dispatch API
    try {
      const res = await fetch('/api/facility/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderNumber: wo.workOrderNumber,
          requiredSkill: wo.category === 'hvac' ? 'hvac' : 'general',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setRankedTechs(json.rankedCandidates || []);
      }
    } catch {}
    setDispatchModalOpen(true);
  };

  const handleConfirmDispatch = async (payload: { technicianId: string; reservedParts: any[] }) => {
    if (!selectedWorkOrder) return;
    try {
      // 1. Transition work order to assigned
      await fetch('/api/facility/workorders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderNumber: selectedWorkOrder.workOrderNumber,
          fromStatus: selectedWorkOrder.status,
          toStatus: 'assigned',
          notes: `Dispatched to technician ${payload.technicianId}`,
        }),
      });

      // 2. Reserve parts if any
      if (payload.reservedParts.length > 0) {
        await fetch('/api/facility/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: payload.reservedParts.map((p) => ({
              workOrderId: selectedWorkOrder.workOrderNumber,
              partNumber: p.partNumber,
              quantity: p.quantity,
            })),
          }),
        });
      }

      // Refresh work orders
      const woRes = await fetch('/api/facility/workorders').then((r) => (r.ok ? r.json() : null));
      if (woRes?.workOrders) setWorkOrders(woRes.workOrders);
    } catch {}
  };

  const handleTriageAlert = async (alertId: string, status: string) => {
    try {
      await fetch('/api/facility/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status, notes: 'Triaged by admin' }),
      });
      const altRes = await fetch('/api/facility/alerts').then((r) => (r.ok ? r.json() : null));
      if (altRes?.alerts) setAlerts(altRes.alerts);
    } catch {}
  };

  const handleCreateWorkOrderFromAlert = async (alertId: string) => {
    try {
      await fetch('/api/facility/workorders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anomalyAlertId: alertId }),
      });
      const woRes = await fetch('/api/facility/workorders').then((r) => (r.ok ? r.json() : null));
      if (woRes?.workOrders) setWorkOrders(woRes.workOrders);
      const altRes = await fetch('/api/facility/alerts').then((r) => (r.ok ? r.json() : null));
      if (altRes?.alerts) setAlerts(altRes.alerts);
    } catch {}
  };

  const handleExecutePeakShave = async (_setbackDegrees: number) => {
    return {
      eventId: 'PEAK_MANUAL_01',
      totalPowerCurtailmentKw: 68.4,
      facilitiesShedded: [
        { buildingId: 'bldg_eng', equipmentTag: 'CHILLER-01', previousSetpointC: 21.0, newSetpointC: 22.5, estimatedPowerSavedKw: 38.2 },
        { buildingId: 'bldg_acad', equipmentTag: 'AHU-04', previousSetpointC: 21.0, newSetpointC: 22.5, estimatedPowerSavedKw: 30.2 },
      ],
      exemptionsHonored: ['bldg_bioresearch cleanroom', 'vivarium server room'],
      status: 'executed',
    };
  };

  // Construct Digital Twin floor maps
  const mockFloorMaps: TwinFloorMap[] = [
    {
      buildingId: 'bldg_eng',
      floorId: 'floor_basement',
      floorName: 'Engineering Complex - Basement MEP Level',
      equipmentNodes: equipment.map((eq, i) => ({
        equipmentId: eq.id,
        assetTag: eq.assetTag,
        name: eq.name,
        category: eq.category || 'hvac',
        status: eq.status || 'operational',
        healthScore: eq.healthScore ?? 95,
        buildingId: eq.buildingId || 'bldg_eng',
        floorId: eq.floorId || 'floor_basement',
        x: 25 + (i % 3) * 25,
        y: 35 + Math.floor(i / 3) * 30,
        z: -1,
        activeAlertCount: alerts.filter((a) => a.equipmentId === eq.id && a.status === 'open').length,
      })),
    },
    {
      buildingId: 'bldg_eng',
      floorId: 'floor_roof',
      floorName: 'Engineering Complex - Rooftop Plant',
      equipmentNodes: [
        {
          equipmentId: 'CT-01',
          assetTag: 'CT-01',
          name: 'Cooling Tower North 400-Ton',
          category: 'hvac',
          status: 'operational',
          healthScore: 98.0,
          buildingId: 'bldg_eng',
          floorId: 'floor_roof',
          x: 45,
          y: 40,
          z: 5,
          activeAlertCount: 0,
        },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <PageHeader
          title="FACILITY-MIND / SmartCampus OS Cockpit"
          description="Autonomous Predictive Maintenance, IoT Sensor Telemetry & 3D Digital Twin Command"
        />
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="FACILITY-MIND / SmartCampus OS Cockpit"
        description="Autonomous Predictive Maintenance, IoT Sensor Telemetry & 3D Digital Twin Command"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="equipment">Equipment Studio & Twin</TabsTrigger>
          <TabsTrigger value="predictive">
            Predictive Matrix ({alerts.filter((a) => a.status === 'open').length})
          </TabsTrigger>
          <TabsTrigger value="work_orders">Work Order Radar</TabsTrigger>
          <TabsTrigger value="inventory">Parts Inventory</TabsTrigger>
          <TabsTrigger value="energy">Energy & Load Shed</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment">
          <EquipmentStudioTab equipmentList={equipment} floorMaps={mockFloorMaps} />
        </TabsContent>

        <TabsContent value="predictive">
          <PredictiveMatrixTab
            alerts={alerts}
            onTriageAlert={handleTriageAlert}
            onCreateWorkOrder={handleCreateWorkOrderFromAlert}
          />
        </TabsContent>

        <TabsContent value="work_orders">
          <WorkOrderRadarTab
            workOrders={workOrders}
            onOpenDispatchModal={handleOpenDispatchModal}
          />
        </TabsContent>

        <TabsContent value="inventory">
          <InventoryVaultTab
            parts={parts}
            requisitions={requisitions}
            onTriggerReorderScan={async () => {
              const res = await fetch('/api/facility/inventory?checkReorder=true').then((r) => (r.ok ? r.json() : null));
              if (res?.requisitions) setRequisitions(res.requisitions);
            }}
          />
        </TabsContent>

        <TabsContent value="energy">
          <EnergyLoadTab onExecutePeakShave={handleExecutePeakShave} />
        </TabsContent>
      </Tabs>

      {/* Autonomous Dispatch Modal */}
      {selectedWorkOrder && (
        <WorkOrderDispatchModal
          isOpen={dispatchModalOpen}
          onClose={() => setDispatchModalOpen(false)}
          workOrderNumber={selectedWorkOrder.workOrderNumber}
          workOrderTitle={selectedWorkOrder.title}
          rankedTechnicians={rankedTechs}
          availableParts={parts}
          onConfirmDispatch={handleConfirmDispatch}
        />
      )}
    </div>
  );
}
