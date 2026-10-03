const crypto = require("crypto");

class SignJWT {
  constructor(payload) {
    this.payload = payload;
  }
  setProtectedHeader() { return this; }
  setIssuedAt() { return this; }
  setExpirationTime() { return this; }
  async sign(secret) {
    const payloadStr = JSON.stringify(this.payload || {});
    const headerStr = JSON.stringify({ alg: "HS256", typ: "JWT" });
    const b64Header = Buffer.from(headerStr, "utf8").toString("base64url");
    const b64Payload = Buffer.from(payloadStr, "utf8").toString("base64url");
    const data = `${b64Header}.${b64Payload}`;
    
    let sig = "mock_sig";
    if (secret) {
      const keyBuffer = Buffer.isBuffer(secret) ? secret : Buffer.from(secret);
      sig = crypto.createHmac("sha256", keyBuffer).update(data).digest("base64url");
    }
    return `${data}.${sig}`;
  }
}

async function jwtVerify(token, secret) {
  try {
    const parts = (token || "").split(".");
    if (parts.length === 3) {
      const data = `${parts[0]}.${parts[1]}`;
      if (secret) {
        const keyBuffer = Buffer.isBuffer(secret) ? secret : Buffer.from(secret);
        const expectedSig = crypto.createHmac("sha256", keyBuffer).update(data).digest("base64url");
        if (parts[2] !== expectedSig) {
          throw new Error("signature verification failed");
        }
      }
      const decoded = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      return { payload: decoded };
    }
  } catch (err) {
    throw new Error(err.message || "Invalid JWT token");
  }
  throw new Error("Invalid JWT token");
}

function decodeJwt(token) {
  try {
    const parts = (token || "").split(".");
    if (parts.length >= 2) {
      return JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    }
  } catch {}
  return {};
}

module.exports = {
  SignJWT,
  jwtVerify,
  decodeJwt,
};
