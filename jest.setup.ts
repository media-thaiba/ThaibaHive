import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";
import { TextEncoder, TextDecoder } from "util";

expect.extend(toHaveNoViolations);

if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = TextEncoder as any;
}
if (typeof global.TextDecoder === "undefined") {
  global.TextDecoder = TextDecoder as any;
}

if (typeof global.Request === "undefined") {

  global.Request = class MockRequest {
    url: string;
    method: string;
    body: string;
    headers: { get: (key: string) => string | null; forEach: (cb: any) => void };
    constructor(input: string, init?: any) {
      Object.defineProperty(this, "url", { value: input, writable: true, configurable: true });
      this.url = input;
      this.method = init?.method || "GET";
      this.body = init?.body || "";
      const headersMap = new Map<string, string>();
      if (init?.headers) {
        if (init.headers instanceof Map) {
          init.headers.forEach((v: any, k: any) => headersMap.set(String(k).toLowerCase(), String(v)));
        } else {
          Object.entries(init.headers).forEach(([k, v]) => {
            headersMap.set(k.toLowerCase(), String(v));
          });
        }
      }
      this.headers = {
        get: (key: string) => headersMap.get(key.toLowerCase()) || null,
        forEach: (cb: any) => headersMap.forEach(cb)
      };
    }
    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }
    async text() {
      return typeof this.body === "string" ? this.body : JSON.stringify(this.body || {});
    }
  } as any;
}


if (typeof global.Response === "undefined") {
  global.Response = class MockResponse {
    body: any;
    status: number;
    headers: { get: (key: string) => string | null; set: (key: string, val: string) => void; entries: () => IterableIterator<[string, string]>; forEach: (cb: any) => void };
    constructor(body: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      const headersMap = new Map<string, string>();
      if (init?.headers) {
        if (init.headers instanceof Map) {
          init.headers.forEach((v: any, k: any) => headersMap.set(String(k).toLowerCase(), String(v)));
        } else if (typeof init.headers.forEach === "function") {
          init.headers.forEach((v: any, k: any) => headersMap.set(String(k).toLowerCase(), String(v)));
        } else {
          Object.entries(init.headers).forEach(([k, v]) => {
            headersMap.set(k.toLowerCase(), String(v));
          });
        }
      }
      this.headers = {
        get: (key: string) => headersMap.get(key.toLowerCase()) || null,
        set: (key: string, val: string) => headersMap.set(key.toLowerCase(), String(val)),
        entries: () => headersMap.entries(),
        forEach: (cb: any) => headersMap.forEach(cb),
      };
    }
    async json() {
      return typeof this.body === "string" ? JSON.parse(this.body) : this.body;
    }
    async text() {
      return typeof this.body === "string" ? this.body : JSON.stringify(this.body);
    }
    static json(data: any, init?: any) {
      return new MockResponse(data, init);
    }
    static redirect(url: string | URL, status = 302) {
      return new MockResponse(null, {
        status,
        headers: { location: url.toString() },
      });
    }
  } as any;
}

if (typeof global.TransformStream === "undefined") {
  const { TransformStream, ReadableStream, WritableStream } = require("stream/web");
  global.TransformStream = TransformStream;
  global.ReadableStream = ReadableStream;
  global.WritableStream = WritableStream;
}
