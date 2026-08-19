import { lookupIP, computeGeoImpossibility, type GeoLocation } from "../../identity/geo-lookup";

describe("Geo Lookup & Impossibility Engine", () => {
  const locNewYork: GeoLocation = {
    ip: "1.2.3.4",
    country: "United States",
    region: "New York",
    lat: 40.7128,
    lon: -74.006,
    isp: "ISP A",
  };

  const locLondon: GeoLocation = {
    ip: "5.6.7.8",
    country: "United Kingdom",
    region: "London",
    lat: 51.5074,
    lon: -0.1278,
    isp: "ISP B",
  };

  it("should flag impossible travel speed (>1000 km/h) between locations", () => {
    // New York to London is ~5570 km. 15 minutes (0.25h) -> 22,280 km/h -> impossible!
    const isImpossible = computeGeoImpossibility(locNewYork, locLondon, 15 * 60 * 1000);
    expect(isImpossible).toBe(true);
  });

  it("should allow plausible travel speed between locations", () => {
    // New York to London over 8 hours -> ~700 km/h -> plausible
    const isImpossible = computeGeoImpossibility(locNewYork, locLondon, 8 * 60 * 60 * 1000);
    expect(isImpossible).toBe(false);
  });

  it("should handle lookupIP failure gracefully by returning null", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error("Network offline"));

    const res = await lookupIP("192.0.2.1");
    expect(res).toBeNull();

    global.fetch = originalFetch;
  });

  it("should cache successful IP lookups", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        country: "India",
        regionName: "Kerala",
        lat: 11.2588,
        lon: 75.7804,
        isp: "Local Fiber",
      }),
    });

    const res1 = await lookupIP("203.0.113.195");
    expect(res1?.country).toBe("India");

    // Second call should return from cache without re-fetching
    const res2 = await lookupIP("203.0.113.195");
    expect(res2?.country).toBe("India");
    expect(global.fetch).toHaveBeenCalledTimes(1);

    global.fetch = originalFetch;
  });
});
