const crypto = require("crypto");

class SignJWT {
  constructor(payload) {
    this.payload = { ...payload };
    this.header = { alg: "HS256", typ: "JWT" };
  }
  setProtectedHeader(header) {
    this.header = { ...this.header, ...header };
    return this;
  }
  setAudience(aud) {
    this.payload.aud = aud;
    return this;
  }
  setIssuer(iss) {
    this.payload.iss = iss;
    return this;
  }
  setSubject(sub) {
    this.payload.sub = sub;
    return this;
  }
  setJti(jti) {
    this.payload.jti = jti;
    return this;
  }
  setIssuedAt(iat) {
    this.payload.iat = typeof iat === "number" ? iat : Math.floor(Date.now() / 1000);
    return this;
  }
  setExpirationTime(exp) {
    if (typeof exp === "number") {
      this.payload.exp = exp;
    } else if (typeof exp === "string") {
      const now = this.payload.iat || Math.floor(Date.now() / 1000);
      let seconds = 300;
      if (exp.endsWith("s")) seconds = parseInt(exp);
      else if (exp.endsWith("m")) seconds = parseInt(exp) * 60;
      else if (exp.endsWith("h")) seconds = parseInt(exp) * 3600;
      else if (exp.endsWith("d")) seconds = parseInt(exp) * 86400;
      this.payload.exp = now + seconds;
    }
    return this;
  }
  async sign(secret) {
    const payloadStr = JSON.stringify(this.payload || {});
    const headerStr = JSON.stringify(this.header);
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

async function jwtVerify(token, secret, options = {}) {
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
      const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
      const decoded = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));

      if (options.audience && decoded.aud !== options.audience) {
        throw new Error("audience mismatch");
      }
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        const err = new Error("jwt expired");
        err.code = "ERR_JWT_EXPIRED";
        throw err;
      }

      return { payload: decoded, protectedHeader: header };
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
