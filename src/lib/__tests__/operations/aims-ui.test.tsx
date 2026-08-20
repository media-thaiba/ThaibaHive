import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { SmartCampusRadar } from '@/components/operations/smart-campus-radar';
import { HvacEnergyOptimizerCard } from '@/components/operations/hvac-energy-optimizer-card';
import { FleetLogisticsMapCard } from '@/components/operations/fleet-logistics-map-card';
import { BiometricAttendancePanel } from '@/components/operations/biometric-attendance-panel';
import { CloudCostEsgCard } from '@/components/operations/cloud-cost-esg-card';
import { CrossCampusResourceGrid } from '@/components/operations/cross-campus-resource-grid';
import { MarlAgentControlDialog } from '@/components/operations/marl-agent-control-dialog';

expect.extend(toHaveNoViolations);

describe('AIMS-023 — Admin Smart Campus UI Component & Accessibility Suite', () => {
  it('should render SmartCampusRadar with real-time telemetry metrics and pass axe a11y audit', async () => {
    const { container } = render(
      <SmartCampusRadar
        energySavingsKwh={345.5}
        activeDispatches={3}
        biometricPunches={120}
        cloudSavingsDollars={650}
        renewableEnergyRatio={48}
      />
    );

    expect(screen.getByText('AIMS Smart Campus Autonomous Operations Radar')).toBeInTheDocument();
    expect(screen.getByText('345.5 kWh')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('$650/mo')).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should render HvacEnergyOptimizerCard and pass axe a11y audit', async () => {
    const opts = [
      {
        id: 'opt_1',
        zoneId: 'Science Lab 201',
        baselineTempCelsius: 21,
        optimizedSetpointCelsius: 23,
        deltaCelsius: 2,
        projectedKwhSavings: 15.4,
      },
    ];

    const { container } = render(
      <HvacEnergyOptimizerCard
        optimizations={opts}
        summary={{ totalSavedKwh: 15.4, totalCostSavedDollars: 2.15 }}
        isLoading={false}
      />
    );

    expect(screen.getByText('Autonomous HVAC & Energy Grid')).toBeInTheDocument();
    expect(screen.getByText('Science Lab 201')).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should render FleetLogisticsMapCard and pass axe a11y audit', async () => {
    const dispatches = [
      {
        routeId: 'r_101',
        vehicleId: 'Electric Shuttle 04',
        totalDistanceKm: 8.5,
        totalDurationMinutes: 20,
        projectedCo2EmissionsKg: 1.2,
        status: 'ACTIVE',
      },
    ];

    const { container } = render(
      <FleetLogisticsMapCard dispatches={dispatches} activeCount={1} isLoading={false} />
    );

    expect(screen.getByText('Autonomous Fleet & Route Logistics')).toBeInTheDocument();
    expect(screen.getByText('Electric Shuttle 04')).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should render BiometricAttendancePanel and pass axe a11y audit', async () => {
    const logs = [
      {
        id: 'log_1',
        userId: 'Student #4092',
        locationName: 'East Gate Kiosk',
        verificationMethod: 'EDGE_NEURAL_ZKP',
        syncStatus: 'SYNCED',
      },
    ];

    const { container } = render(<BiometricAttendancePanel logs={logs} totalCount={1} isLoading={false} />);

    expect(screen.getByText('Edge Biometrics & ZKP Attestation')).toBeInTheDocument();
    expect(screen.getByText('Student #4092')).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should render CloudCostEsgCard and CrossCampusResourceGrid with clean accessibility', async () => {
    const cloudData = {
      resources: [],
      recommendations: [],
      totalEstimatedSavingsDollars: 450,
    };
    const carbonData = {
      esgReport: { renewableEnergyRatioPercent: 50 },
      emissions: { scope1FleetFuelKgCo2e: 100, scope2GridElectricityKgCo2e: 500, scope3CloudComputeKgCo2e: 50 },
      initiatives: [],
    };

    const { container: cloudContainer } = render(
      <CloudCostEsgCard cloudData={cloudData} carbonData={carbonData} isLoading={false} />
    );
    expect(screen.getByText('Cloud Cost & ESG Sustainability')).toBeInTheDocument();
    expect(await axe(cloudContainer)).toHaveNoViolations();

    const resources = [
      {
        resourceId: 'res_1',
        name: 'Biochemistry Centrifuge Lab',
        category: 'SPECIALIZED_EQUIPMENT',
        capacityUnits: 4,
        hourlyCostRateDollars: 75,
      },
    ];

    const { container: meshContainer } = render(
      <CrossCampusResourceGrid resources={resources} recommendations={[]} isLoading={false} />
    );
    expect(screen.getByText('Cross-Campus Resource Mesh & CRDT Sync')).toBeInTheDocument();
    expect(screen.getByText('Biochemistry Centrifuge Lab')).toBeInTheDocument();
    expect(await axe(meshContainer)).toHaveNoViolations();
  });

  it('should open MarlAgentControlDialog and trigger emergency kill switch callback', async () => {
    const handleKillSwitch = jest.fn().mockResolvedValue(undefined);
    const handleClose = jest.fn();

    render(
      <MarlAgentControlDialog
        isOpen={true}
        onClose={handleClose}
        onEmergencyKillSwitch={handleKillSwitch}
      />
    );

    expect(screen.getByText('MARL Multi-Agent Autonomous Guardrails')).toBeInTheDocument();
    const killButton = screen.getByText('Trigger Global Kill-Switch');
    await React.act(async () => {
      fireEvent.click(killButton);
    });
    expect(handleKillSwitch).toHaveBeenCalledTimes(1);
  });
});
