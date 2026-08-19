export interface GeoLocation {
  ip: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  isp: string;
}

const geoCache = new Map<string, { loc: GeoLocation, expiresAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function lookupIP(ip: string): Promise<GeoLocation | null> {
  const cached = geoCache.get(ip);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.loc;
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,lat,lon,isp`);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data.status !== 'success') return null;

    const loc: GeoLocation = {
      ip,
      country: data.country,
      region: data.regionName,
      lat: data.lat,
      lon: data.lon,
      isp: data.isp
    };

    geoCache.set(ip, { loc, expiresAt: Date.now() + CACHE_TTL_MS });
    return loc;
  } catch {
    return null; // Graceful degradation
  }
}

// Distance in km using Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
}

export function computeGeoImpossibility(loc1: GeoLocation, loc2: GeoLocation, timeDeltaMs: number): boolean {
  if (timeDeltaMs <= 0) return true; // Concurrent from diff locations
  
  const distanceKm = getDistanceFromLatLonInKm(loc1.lat, loc1.lon, loc2.lat, loc2.lon);
  const hours = timeDeltaMs / (1000 * 60 * 60);
  const speed = distanceKm / hours;

  // Commercial airliner is ~900km/h. >1000km/h is impossible.
  return speed > 1000;
}
