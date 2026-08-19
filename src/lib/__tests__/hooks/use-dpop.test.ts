/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { useDPoP } from "@/lib/hooks/use-dpop";

// Minimal SubtleCrypto mock
const mockSign = jest.fn().mockResolvedValue(new Uint8Array(64).buffer);
const mockExportKey = jest.fn().mockImplementation((_fmt: string, _key: unknown) =>
  Promise.resolve({ kty: "EC", crv: "P-256", x: "x-value", y: "y-value", key_ops: [] }),
);
const mockGenerateKey = jest.fn().mockResolvedValue({
  publicKey:  {},
  privateKey: {},
});

Object.defineProperty(global, "crypto", {
  value: {
    subtle: {
      generateKey:  mockGenerateKey,
      exportKey:    mockExportKey,
      sign:         mockSign,
    },
    randomUUID: jest.fn().mockReturnValue("test-uuid"),
  },
});

describe("useDPoP with IndexedDB", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("becomes ready and generates non-extractable keys", async () => {
    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useDPoP());
      hookResult = result;
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(hookResult.current.isReady).toBe(true);
    expect(mockGenerateKey).toHaveBeenCalledWith(
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  });

  it("getPublicKeyJwk returns public JWK when ready", async () => {
    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useDPoP());
      hookResult = result;
      await new Promise((r) => setTimeout(r, 50));
    });
    const jwk = hookResult.current.getPublicKeyJwk();
    expect(jwk).toBeDefined();
    expect(jwk?.crv).toBe("P-256");
  });

  it("attachDPoP generates proof when ready", async () => {
    let hookResult: any;
    await act(async () => {
      const { result } = renderHook(() => useDPoP());
      hookResult = result;
      await new Promise((r) => setTimeout(r, 50));
    });
    const proof = await hookResult.current.attachDPoP("https://example.com/api", "POST");
    expect(typeof proof).toBe("string");
    expect(proof?.split(".").length).toBe(3);
  });
});
