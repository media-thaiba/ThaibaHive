import { getRequestedApiVersion, CURRENT_API_VERSION } from "../api/versioning";

describe("API Versioning Strategy", () => {
  it("should default to CURRENT_API_VERSION if no version header or query param is provided", () => {
    const req = new Request("https://thaibahive.local/api/staff");
    const { version, isSupported } = getRequestedApiVersion(req);
    expect(version).toBe(CURRENT_API_VERSION);
    expect(isSupported).toBe(true);
  });

  it("should parse X-API-Version header", () => {
    const req = new Request("https://thaibahive.local/api/staff", {
      headers: { "X-API-Version": "1.0" },
    });
    const { version, isSupported } = getRequestedApiVersion(req);
    expect(version).toBe("1.0");
    expect(isSupported).toBe(true);
  });

  it("should normalize shorthand version header '1' to '1.0'", () => {
    const req = new Request("https://thaibahive.local/api/staff", {
      headers: { "X-API-Version": "1" },
    });
    const { version, isSupported } = getRequestedApiVersion(req);
    expect(version).toBe("1.0");
    expect(isSupported).toBe(true);
  });

  it("should parse query param ?v=2.0", () => {
    const req = new Request("https://thaibahive.local/api/staff?v=2.0");
    const { version, isSupported } = getRequestedApiVersion(req);
    expect(version).toBe("2.0");
    expect(isSupported).toBe(true);
  });

  it("should mark unsupported version numbers as isSupported = false", () => {
    const req = new Request("https://thaibahive.local/api/staff", {
      headers: { "X-API-Version": "99.0" },
    });
    const { isSupported } = getRequestedApiVersion(req);
    expect(isSupported).toBe(false);
  });
});
