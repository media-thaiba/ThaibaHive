class SignJWT {
  setProtectedHeader() { return this; }
  setIssuedAt() { return this; }
  setExpirationTime() { return this; }
  sign() { return Promise.resolve("mock.jwt.token"); }
}

async function jwtVerify() {
  return {
    payload: {
      userId: "user-1",
      institutionId: "inst-1",
      role: "super_admin",
      permissions: ["*"],
    },
  };
}

module.exports = {
  SignJWT,
  jwtVerify,
};
