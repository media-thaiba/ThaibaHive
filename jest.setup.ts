import "@testing-library/jest-dom";

if (typeof global.Request === "undefined") {
  global.Request = class MockRequest {
    url: string;
    method: string;
    body: string;
    headers: { get: (key: string) => string | null; forEach: (cb: any) => void };
    constructor(input: string, init?: any) {
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
      return JSON.parse(this.body);
    }
  } as any;
}

if (typeof global.Response === "undefined") {
  global.Response = class MockResponse {
    body: any;
    status: number;
    headers: any;
    constructor(body: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = {
        get: (key: string) => init?.headers?.[key] || null,
        forEach: () => {}
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
  } as any;
}

if (typeof global.TransformStream === "undefined") {
  const { TransformStream, ReadableStream, WritableStream } = require("stream/web");
  global.TransformStream = TransformStream;
  global.ReadableStream = ReadableStream;
  global.WritableStream = WritableStream;
}
