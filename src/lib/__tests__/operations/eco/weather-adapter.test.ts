import { WeatherAdapter } from '../../../operations/eco/ml/weather-adapter';
import { SolarIrradianceModel } from '../../../operations/eco/ml/solar-irradiance-model';

describe('WeatherAdapter & SolarIrradianceModel Unit Tests', () => {
  let adapter: WeatherAdapter;

  beforeEach(() => {
    adapter = WeatherAdapter.getInstance();
  });

  it('should compute clear-sky GHI and zero GHI at night', () => {
    // Solar noon (zenith ~ 20 deg)
    const middayGhi = SolarIrradianceModel.computeClearSkyGhi(20);
    expect(middayGhi).toBeGreaterThan(800); // Expect ~900-1000 W/m2

    // Night (zenith >= 90 deg)
    const nightGhi = SolarIrradianceModel.computeClearSkyGhi(92);
    expect(nightGhi).toBe(0);
  });

  it('should adjust irradiance for cloud cover attenuation', () => {
    const clear = SolarIrradianceModel.computeIrradiance(28.6, 180, 12, 0);
    const overcast = SolarIrradianceModel.computeIrradiance(28.6, 180, 12, 90);

    expect(clear.ghiWm2).toBeGreaterThan(700);
    expect(overcast.ghiWm2).toBeLessThan(clear.ghiWm2 * 0.4);
    expect(overcast.dhiWm2).toBeGreaterThan(0);
  });

  it('should generate 24-hour and 72-hour hourly weather forecast series', async () => {
    const forecast24 = await adapter.getHourlyForecast(28.6, 77.2, 24);
    expect(forecast24).toHaveLength(24);
    expect(forecast24[0].ambientTemperatureC).toBeGreaterThan(10);
    expect(forecast24[0].windSpeedMs).toBeGreaterThan(0);

    const forecast72 = await adapter.getHourlyForecast(28.6, 77.2, 72);
    expect(forecast72).toHaveLength(72);
  });
});
