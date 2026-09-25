import { facilityMetricsExporter } from '../../../operations/facility/telemetry/facility-metrics';

describe('Prometheus OpenMetrics Facilities Health Exporter (Sprint-052 FACILITY-013)', () => {
  it('should export all 8 Prometheus OpenMetrics series with proper types and labels', () => {
    facilityMetricsExporter.recordIngestion(12.5);
    facilityMetricsExporter.recordEquipmentHealth(94.2);
    facilityMetricsExporter.recordAnomalyDetected();
    facilityMetricsExporter.setWorkOrdersActive(3);
    facilityMetricsExporter.recordWorkOrderMttr(2.5);
    facilityMetricsExporter.setLoadShedPowerKw(45.0);
    facilityMetricsExporter.recordStockout();

    const metricsOutput = facilityMetricsExporter.exportOpenMetrics('inst_alpha');

    expect(metricsOutput).toContain('facility_sensor_ingestion_total{institution_id="inst_alpha"}');
    expect(metricsOutput).toContain('facility_sensor_latency_ms{institution_id="inst_alpha"}');
    expect(metricsOutput).toContain('facility_equipment_health_gauge{institution_id="inst_alpha"}');
    expect(metricsOutput).toContain('facility_anomalies_detected_total{institution_id="inst_alpha"}');
    expect(metricsOutput).toContain('facility_work_orders_active_gauge{institution_id="inst_alpha"}');
    expect(metricsOutput).toContain('facility_mttr_hours_gauge{institution_id="inst_alpha"}');
    expect(metricsOutput).toContain('facility_load_shed_power_kw{institution_id="inst_alpha"} 45');
    expect(metricsOutput).toContain('facility_parts_stockout_total{institution_id="inst_alpha"}');
  });
});
