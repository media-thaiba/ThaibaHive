import "@testing-library/jest-dom";

if (typeof global.Request === "undefined") {
  global.Request = class MockRequest {
    url: string;
    method: string;
    body: string;
    constructor(input: string, init?: any) {
      this.url = input;
      this.method = init?.method || "GET";
      this.body = init?.body || "";
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
    static json(data: any, init?: any) {
      return new MockResponse(data, init);
    }
  } as any;
}
