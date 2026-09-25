export interface FacilityMetricsState {
  sensorIngestionTotal: number;
  sensorLatencyMsSum: number;
  sensorLatencyMsCount: number;
  equipmentHealthSum: number;
  equipmentHealthCount: number;
  anomaliesDetectedTotal: number;
  workOrdersActive: number;
  mttrHoursSum: number;
  mttrHoursCount: number;
  loadShedPowerKw: number;
  partsStockoutTotal: number;
}

export class FacilityMetricsExporter {
  private static instance: FacilityMetricsExporter;
  private state: FacilityMetricsState = {
    sensorIngestionTotal: 0,
    sensorLatencyMsSum: 0,
    sensorLatencyMsCount: 0,
    equipmentHealthSum: 0,
    equipmentHealthCount: 0,
    anomaliesDetectedTotal: 0,
    workOrdersActive: 0,
    mttrHoursSum: 0,
    mttrHoursCount: 0,
    loadShedPowerKw: 0,
    partsStockoutTotal: 0,
  };

  public static getInstance(): FacilityMetricsExporter {
    if (!FacilityMetricsExporter.instance) {
      FacilityMetricsExporter.instance = new FacilityMetricsExporter();
    }
    return FacilityMetricsExporter.instance;
  }

  public recordIngestion(latencyMs: number): void {
    this.state.sensorIngestionTotal++;
    this.state.sensorLatencyMsSum += latencyMs;
    this.state.sensorLatencyMsCount++;
  }

  public recordEquipmentHealth(healthScore: number): void {
    this.state.equipmentHealthSum += healthScore;
    this.state.equipmentHealthCount++;
  }

  public recordAnomalyDetected(): void {
    this.state.anomaliesDetectedTotal++;
  }

  public setWorkOrdersActive(count: number): void {
    this.state.workOrdersActive = count;
  }

  public recordWorkOrderMttr(hours: number): void {
    this.state.mttrHoursSum += hours;
    this.state.mttrHoursCount++;
  }

  public setLoadShedPowerKw(kw: number): void {
    this.state.loadShedPowerKw = kw;
  }

  public recordStockout(): void {
    this.state.partsStockoutTotal++;
  }

  public exportOpenMetrics(institutionId: string = 'global'): string {
    const avgLatency =
      this.state.sensorLatencyMsCount > 0
        ? (this.state.sensorLatencyMsSum / this.state.sensorLatencyMsCount).toFixed(2)
        : '0.00';

    const avgHealth =
      this.state.equipmentHealthCount > 0
        ? (this.state.equipmentHealthSum / this.state.equipmentHealthCount).toFixed(1)
        : '100.0';

    const avgMttr =
      this.state.mttrHoursCount > 0
        ? (this.state.mttrHoursSum / this.state.mttrHoursCount).toFixed(2)
        : '0.00';

    return [
      '# HELP facility_sensor_ingestion_total Total count of sensor telemetry packets ingested',
      '# TYPE facility_sensor_ingestion_total counter',
      `facility_sensor_ingestion_total{institution_id="${institutionId}"} ${this.state.sensorIngestionTotal}`,
      '',
      '# HELP facility_sensor_latency_ms Average telemetry ingestion and normalization latency in milliseconds',
      '# TYPE facility_sensor_latency_ms gauge',
      `facility_sensor_latency_ms{institution_id="${institutionId}"} ${avgLatency}`,
      '',
      '# HELP facility_equipment_health_gauge Average composite equipment health score (0-100)',
      '# TYPE facility_equipment_health_gauge gauge',
      `facility_equipment_health_gauge{institution_id="${institutionId}"} ${avgHealth}`,
      '',
      '# HELP facility_anomalies_detected_total Total count of predictive anomaly alerts detected',
      '# TYPE facility_anomalies_detected_total counter',
      `facility_anomalies_detected_total{institution_id="${institutionId}"} ${this.state.anomaliesDetectedTotal}`,
      '',
      '# HELP facility_work_orders_active_gauge Total active open/in-progress maintenance work orders',
      '# TYPE facility_work_orders_active_gauge gauge',
      `facility_work_orders_active_gauge{institution_id="${institutionId}"} ${this.state.workOrdersActive}`,
      '',
      '# HELP facility_mttr_hours_gauge Mean time to repair (MTTR) in hours',
      '# TYPE facility_mttr_hours_gauge gauge',
      `facility_mttr_hours_gauge{institution_id="${institutionId}"} ${avgMttr}`,
      '',
      '# HELP facility_load_shed_power_kw Total active power curtailment shedded in kW',
      '# TYPE facility_load_shed_power_kw gauge',
      `facility_load_shed_power_kw{institution_id="${institutionId}"} ${this.state.loadShedPowerKw}`,
      '',
      '# HELP facility_parts_stockout_total Total spare parts stockout events encountered',
      '# TYPE facility_parts_stockout_total counter',
      `facility_parts_stockout_total{institution_id="${institutionId}"} ${this.state.partsStockoutTotal}`,
    ].join('\n');
  }
}

export const facilityMetricsExporter = FacilityMetricsExporter.getInstance();
