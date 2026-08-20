import { GeofenceMonitor } from '../../../operations/twin/assets/geofence-monitor';

describe('Geofence Monitor & Perimeter Security', () => {
  let monitor: GeofenceMonitor;

  beforeEach(() => {
    monitor = new GeofenceMonitor();
    monitor.registerGeofence({
      geofenceId: 'GEO-RESTRICTED-LAB',
      facilityId: 'FAC-ENG',
      name: 'High-Security Robotics Lab',
      polygon: {
        points: [
          [0, 0],
          [20, 0],
          [20, 20],
          [0, 20],
        ],
      },
      alertOnExit: true,
      alertOnEntry: true,
      severity: 'critical',
    });
  });

  it('should detect asset entering and exiting geofenced perimeter', () => {
    // 1. Initial entry
    const enterEvents = monitor.evaluateAssetPosition('ROBOTIC-ARM-01', { x: 10, y: 10, z: 0 });
    expect(enterEvents.length).toBe(1);
    expect(enterEvents[0].eventType).toBe('enter');
    expect(enterEvents[0].severity).toBe('critical');

    // 2. Asset movement within zone (no new event)
    const insideEvents = monitor.evaluateAssetPosition('ROBOTIC-ARM-01', { x: 12, y: 12, z: 0 });
    expect(insideEvents.length).toBe(0);

    // 3. Asset breach / exit from zone
    const exitEvents = monitor.evaluateAssetPosition('ROBOTIC-ARM-01', { x: 50, y: 50, z: 0 });
    expect(exitEvents.length).toBe(1);
    expect(exitEvents[0].eventType).toBe('breach');
    expect(exitEvents[0].details).toContain('exited perimeter without authorization');
  });
});
