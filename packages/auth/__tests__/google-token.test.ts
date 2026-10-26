import { verifyGoogleToken } from "../google";

const mockJwtVerify = jest.fn();

jest.mock("jose", () => ({
  createRemoteJWKSet: jest.fn().mockReturnValue({}),
  jwtVerify: (...args: any[]) => mockJwtVerify(...args),
}));

describe("verifyGoogleToken", () => {
  const validClientIds = [
    "client-id-web.apps.googleusercontent.com",
    "client-id-mobile.apps.googleusercontent.com",
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws if idToken is missing or empty", async () => {
    await expect(verifyGoogleToken("", validClientIds)).rejects.toThrow("Google ID token is required");
    await expect(verifyGoogleToken(null as any, validClientIds)).rejects.toThrow("Google ID token is required");
  });

  it("throws if allowedClientIds is missing or empty (fails closed, no wildcard/skip)", async () => {
    await expect(verifyGoogleToken("mock-token", [])).rejects.toThrow(
      "Google authentication misconfigured: allowedClientIds must be provided and non-empty"
    );
    await expect(verifyGoogleToken("mock-token", null as any)).rejects.toThrow(
      "Google authentication misconfigured: allowedClientIds must be provided and non-empty"
    );
  });

  it("fails closed when jose throws audience mismatch or signature error", async () => {
    mockJwtVerify.mockRejectedValueOnce(
      new Error('unexpected "aud" claim value')
    );

    await expect(verifyGoogleToken("token-wrong-aud", validClientIds)).rejects.toThrow(
      'unexpected "aud" claim value'
    );
  });

  it("fails closed when jose throws token expired error", async () => {
    mockJwtVerify.mockRejectedValueOnce(
      new Error('"exp" claim timestamp check failed')
    );

    await expect(verifyGoogleToken("token-expired", validClientIds)).rejects.toThrow(
      '"exp" claim timestamp check failed'
    );
  });

  it("fails if token issuer is untrusted (handled by jose issuer verification)", async () => {
    mockJwtVerify.mockRejectedValueOnce(
      new Error('unexpected "iss" claim value')
    );

    await expect(verifyGoogleToken("token-evil-iss", validClientIds)).rejects.toThrow(
      'unexpected "iss" claim value'
    );
  });

  it("fails if email_verified is false", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        iss: "https://accounts.google.com",
        aud: validClientIds[0],
        sub: "google-sub-123",
        email: "unverified@gmail.com",
        email_verified: false,
      },
    });

    await expect(verifyGoogleToken("token-unverified-email", validClientIds)).rejects.toThrow(
      "Google email is not verified"
    );
  });

  it("succeeds with verified Google ID token claims and returns identity", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        iss: "https://accounts.google.com",
        aud: validClientIds[0],
        sub: "google-sub-99999",
        email: "media@thaibagarden.com",
        name: "Media Admin",
        picture: "https://lh3.googleusercontent.com/a/photo",
        email_verified: true,
      },
    });

    const result = await verifyGoogleToken("valid-token", validClientIds);
    expect(result).toEqual({
      email: "media@thaibagarden.com",
      name: "Media Admin",
      picture: "https://lh3.googleusercontent.com/a/photo",
      sub: "google-sub-99999",
    });

    expect(mockJwtVerify).toHaveBeenCalledWith(
      "valid-token",
      expect.anything(),
      expect.objectContaining({
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: validClientIds,
      })
    );
  });
});
