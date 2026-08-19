import {  } from "next/server";

export function mockNextRequest(
  url: string = "http://localhost:3000/api/test",
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
) {
  const method = options.method || "GET";
  const headers = new Headers(options.headers || {});
  if (options.body && typeof options.body === "object") {
    headers.set("content-type", "application/json");
  }

  const req: any = {
    url,
    method,
    headers: {
      get: (key: string) => headers.get(key) || headers.get(key.toLowerCase()) || null,
      forEach: (cb: any) => headers.forEach(cb),
      has: (key: string) => headers.has(key),
    },
    json: async () => (typeof options.body === "string" ? JSON.parse(options.body) : options.body || {}),
    text: async () => (typeof options.body === "string" ? options.body : JSON.stringify(options.body || {})),
    nextUrl: new URL(url),
  };

  return req;
}
