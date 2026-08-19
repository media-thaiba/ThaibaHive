class SignJWT {
  constructor(payload) {
    this.payload = payload;
  }
  setProtectedHeader() { return this; }
  setIssuedAt() { return this; }
  setExpirationTime() { return this; }
  sign() {
    const payloadStr = JSON.stringify(this.payload || {});
    const token = "mock." + Buffer.from(payloadStr, "utf8").toString("base64url") + ".sig";
    return Promise.resolve(token);
  }
}

async function jwtVerify(token) {
  try {
    const parts = (token || "").split(".");
    if (parts.length >= 2) {
      const decoded = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      return { payload: decoded };
    }
  } catch (e) {}
  throw new Error("Invalid JWT token");
}

function decodeJwt(token) {
  try {
    const parts = (token || "").split(".");
    if (parts.length >= 2) {
      return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    }
  } catch (e) {}
  return {};
}

module.exports = {
  SignJWT,
  jwtVerify,
  decodeJwt,
};
