export async function fetchWithDPoP(
  url: string, 
  options: RequestInit = {}, 
  attachDPoP?: (url: string, method: string) => Promise<string | null>
): Promise<Response> {
  const headers = new Headers(options.headers || {});
  
  if (attachDPoP) {
    const proof = await attachDPoP(url, options.method || 'GET');
    if (proof) {
      headers.set('DPoP', proof);
    }
  }

  return fetch(url, {
    ...options,
    headers
  });
}
