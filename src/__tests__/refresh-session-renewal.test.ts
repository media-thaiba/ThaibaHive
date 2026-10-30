/**
 * End-to-end regression coverage for POST /api/auth/refresh against the real DB.
 *
 * Guards the bug where the refresh flow re-INSERTed an already-existing
 * user_sessions.id (primary key), causing every successful refresh to fail with
 * SQLITE_CONSTRAINT / 500. Renewal must UPDATE the existing row instead.
 */
/** @jest-environment node */
import { POST } from "@/app/api/auth/refresh/route";
import { createSessionWithRefresh } from "@thaiba/auth/session";
import { db, staff, userSessions, usedNonces } from "@thaiba/db";
import { and, eq, like } from "drizzle-orm";

const STAFF_ID = "usr_refresh_e2e_1";
const STAFF_EMAIL = "refresh-e2e@thaiba.edu";
const DAY_MS = 24 * 60 * 60 * 1000;

const sessionPayload = {
  staffId: STAFF_ID,
  email: STAFF_EMAIL,
  role: "staff",
  employeeId: "EMP-E2E1",
  name: "Refresh E2E",
  tokenVersion: 0,
};

async function readSessionRow(sid: string) {
  return db
    .select()
    .from(userSessions)
    .where(eq(userSessions.id, sid))
    .get();
}

function refreshRequest(refreshToken: string) {
  return new Request("http://localhost/api/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Platform": "mobile",
    },
    body: JSON.stringify({ refreshToken }),
  });
}

describe("POST /api/auth/refresh (real DB integration)", () => {
  beforeAll(async () => {
    await db
      .insert(staff)
      .values({
        id: STAFF_ID,
        email: STAFF_EMAIL,
        employeeId: "EMP-E2E1",
        firstName: "Refresh",
        lastName: "E2E",
        role: "staff",
        isActive: true,
        tokenVersion: 0,
      })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await db
      .delete(userSessions)
      .where(eq(userSessions.staffId, STAFF_ID))
      .run()
      .catch(() => {});
    await db
      .delete(usedNonces)
      .where(like(usedNonces.jti, "rf%"))
      .run()
      .catch(() => {});
    await db
      .delete(staff)
      .where(eq(staff.id, STAFF_ID))
      .run()
      .catch(() => {});
  });

  it("renews the session, slides expiry 30 days and preserves the original login", async () => {
    // Simulate a mobile login: mints the session row + refresh token.
    const login = await createSessionWithRefresh(sessionPayload, true, "mobile", 30 * 24 * 60 * 60);

    // Age the session to 1 day of remaining life, as if it were 29 days old.
    await db
      .update(userSessions)
      .set({ expiresAt: Date.now() + 1 * DAY_MS })
      .where(eq(userSessions.id, login.sid))
      .run();

    const before = await readSessionRow(login.sid);
    expect(before).toBeTruthy();
    expect(before!.expiresAt).toBeLessThan(Date.now() + 2 * DAY_MS);

    const res = await POST(refreshRequest(login.refreshToken));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(typeof body.token).toBe("string");
    expect(typeof body.refreshToken).toBe("string");
    expect(body.user.email).toBe(STAFF_EMAIL);

    const after = await readSessionRow(login.sid);
    expect(after).toBeTruthy();
    expect(after!.status).toBe("active");
    // loginAt must NOT be reset by a renewal.
    expect(after!.loginAt).toBe(before!.loginAt);
    // Expiry slides forward to ~30 days from now.
    expect(after!.expiresAt).toBeGreaterThanOrEqual(Date.now() + 29 * DAY_MS);
    expect(after!.expiresAt).toBeGreaterThan(before!.expiresAt);
  });

  it("accepts the ROTATED refresh token for a subsequent refresh (repeat refreshes)", async () => {
    const login = await createSessionWithRefresh(sessionPayload, true, "mobile", 30 * 24 * 60 * 60);

    const first = await POST(refreshRequest(login.refreshToken));
    expect(first.status).toBe(200);
    const firstBody = await first.json();

    const second = await POST(refreshRequest(firstBody.refreshToken));
    expect(second.status).toBe(200);
    const secondBody = await second.json();
    expect(typeof secondBody.token).toBe("string");

    // Still a single session row per sid — no duplicates, no orphans.
    const rows = await db
      .select({ id: userSessions.id })
      .from(userSessions)
      .where(eq(userSessions.staffId, STAFF_ID));
    const matching = rows.filter((r) => r.id === login.sid);
    expect(matching).toHaveLength(1);
  });

  it("rejects a refresh token whose session row is gone", async () => {
    const login = await createSessionWithRefresh(sessionPayload, true, "mobile", 30 * 24 * 60 * 60);
    await db
      .delete(userSessions)
      .where(and(eq(userSessions.id, login.sid), eq(userSessions.staffId, STAFF_ID)))
      .run();

    const res = await POST(refreshRequest(login.refreshToken));
    expect(res.status).toBe(401);
  });

  it("rejects refresh if session exceeded 90-day absolute cap from loginAt", async () => {
    const login = await createSessionWithRefresh(sessionPayload, true, "mobile", 30 * 24 * 60 * 60);

    // Set loginAt to 91 days ago
    await db
      .update(userSessions)
      .set({ loginAt: Date.now() - 91 * DAY_MS })
      .where(eq(userSessions.id, login.sid))
      .run();

    const res = await POST(refreshRequest(login.refreshToken));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Session reached maximum lifetime");
  });

  it("clamps renewal so expiry can never exceed loginAt + 90 days", async () => {
    const login = await createSessionWithRefresh(sessionPayload, true, "mobile", 30 * 24 * 60 * 60);
    const loginAt = Date.now() - 89 * DAY_MS;
    await db
      .update(userSessions)
      .set({ loginAt })
      .where(eq(userSessions.id, login.sid))
      .run();

    const res = await POST(refreshRequest(login.refreshToken));
    expect(res.status).toBe(200);

    const after = await readSessionRow(login.sid);
    // Renewal is capped at ~1 day remaining, NOT a fresh 30 days.
    expect(after!.expiresAt).toBeLessThanOrEqual(loginAt + 90 * DAY_MS);
    expect(after!.expiresAt).toBeLessThan(Date.now() + 2 * DAY_MS);
  });
  it("detects refresh token reuse, revoking the session immediately (RFC 6819)", async () => {
    const login = await createSessionWithRefresh(sessionPayload, true, "mobile", 30 * 24 * 60 * 60);

    // Legitimate first use: succeeds and rotates token
    const firstRes = await POST(refreshRequest(login.refreshToken));
    expect(firstRes.status).toBe(200);
    const firstBody = await firstRes.json();
    expect(firstBody.refreshToken).toBeTruthy();

    // Replay attack: presenting the already-used first refresh token again
    const replayRes = await POST(refreshRequest(login.refreshToken));
    expect(replayRes.status).toBe(401);
    const replayBody = await replayRes.json();
    expect(replayBody.error).toBe("Refresh token reuse detected; session revoked");

    // Verify session row is now marked revoked in the database
    const session = await readSessionRow(login.sid);
    expect(session!.status).toBe("revoked");
    expect(session!.logoutAt).toBeTruthy();

    // Subsequent refresh attempts even with the rotated token now fail because session was revoked
    const thirdRes = await POST(refreshRequest(firstBody.refreshToken));
    expect(thirdRes.status).toBe(401);
  });

  it("withholds tokens from response body for non-mobile clients (F-12 compliance)", async () => {
    const login = await createSessionWithRefresh(sessionPayload, true, "desktop", 30 * 24 * 60 * 60);

    const req = new Request("http://localhost/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken: login.refreshToken }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeUndefined();
    expect(body.refreshToken).toBeUndefined();
    expect(body.user.email).toBe(STAFF_EMAIL);
  });

  it("does NOT revoke the session on a transient (non-duplicate) nonce insert failure", async () => {
    const login = await createSessionWithRefresh(sessionPayload, true, "mobile", 30 * 24 * 60 * 60);

    const originalInsert = db.insert.bind(db) as unknown as (...args: unknown[]) => unknown;
    const spy = jest.spyOn(db, "insert");
    spy.mockImplementation(
      ((table: unknown, ...rest: unknown[]) => {
        if (table === usedNonces) {
          throw new Error("SQLITE_BUSY: database is locked");
        }
        return originalInsert(table, ...rest);
      }) as unknown as typeof db.insert
    );

    try {
      const res = await POST(refreshRequest(login.refreshToken));
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
    }

    // A flaky write must never be mistaken for replay.
    const row = await readSessionRow(login.sid);
    expect(row!.status).toBe("active");
    expect(row!.logoutAt).toBeNull();

    // Nothing was burned — the same token still works.
    const retry = await POST(refreshRequest(login.refreshToken));
    expect(retry.status).toBe(200);
  });

  it("releases the consumed jti when renewal fails, so a retry is not treated as replay", async () => {
    const login = await createSessionWithRefresh(sessionPayload, true, "mobile", 30 * 24 * 60 * 60);

    const spy = jest.spyOn(db, "update");
    spy.mockImplementation((() => {
      throw new Error("SQLITE_BUSY: database is locked");
    }) as unknown as typeof db.update);

    try {
      const res = await POST(refreshRequest(login.refreshToken));
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
    }

    // The jti was rolled back: retrying the SAME token must not revoke.
    const retry = await POST(refreshRequest(login.refreshToken));
    expect(retry.status).toBe(200);

    const row = await readSessionRow(login.sid);
    expect(row!.status).toBe("active");
  });
  it("revokes all descendant refresh tokens when an ancestor token is replayed (family tracking)", async () => {
    // 1. Initial login mints R0 (gen 0)
    const login = await createSessionWithRefresh(sessionPayload, true, "mobile", 30 * 24 * 60 * 60);
    const tokenR0 = login.refreshToken;

    // 2. Legitimate client rotates R0 -> gets R1 (gen 1)
    const res1 = await POST(refreshRequest(tokenR0));
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    const tokenR1 = body1.refreshToken;

    // 3. Legitimate client rotates R1 -> gets descendant R2 (gen 2)
    const res2 = await POST(refreshRequest(tokenR1));
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    const tokenR2 = body2.refreshToken;

    // 4. An attacker replays ancestor token R0!
    const replayRes = await POST(refreshRequest(tokenR0));
    expect(replayRes.status).toBe(401);
    const replayBody = await replayRes.json();
    expect(replayBody.error).toBe("Refresh token reuse detected; session revoked");

    // 5. Descendant token R2 (which was never used or replayed itself) is now dead!
    const descendantRes = await POST(refreshRequest(tokenR2));
    expect(descendantRes.status).toBe(401);
    const descendantBody = await descendantRes.json();
    expect(descendantBody.error).toBe("Refresh token family revoked due to previous reuse");
  });
});