export function parseWifiSsids(wifiSsidsStr: string | null): string[] {
  if (!wifiSsidsStr) return [];
  return wifiSsidsStr
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
