/**
 * NFC anti-replay (v3.42.0) — two-tier nonce enforcement.
 *
 * Tier 1 (live):      client nonce, single-use via `usedNonces`,
 *                     5-minute freshness window, flag-gated fail-closed.
 * Tier 2 (offline):   outbox flush carries no live nonce; replay is blocked
 *                     by a content-hash key (staff|tag|tapAt|deviceSequence)
 *                     plus age (48h) + shift-window bounds when strict.
 *
 * Ordering invariant under test: freshness prechecks run first (pure), tag
 * validation next, and nonce consumption LAST so a failed validation never
 * burns the nonce.
 *
 * TZ: jest.global-setup.ts pins TZ=UTC for all workers — all local-time
 * shift-window math below is deterministic.
 */
import { validateNfcCheckIn, AttendanceValidationError } from "../validation";
import { db } from "@/db";
import { usedNonces } from "@/db/schema";
import { resolveShift } from "@/lib/attendance/shifts";

jest.mock("@/db", () => ({
  db: { select: jest.fn(), insert: jest.fn() },
}));

jest.mock("@/lib/attendance/shifts", () => ({
  resolveShift: jest.fn(),
  DEFAULT_SHIFT: {
    id: "default",
    name: "Default General Shift",
    startTime: "09:00",
    endTime: "17:00",
    gracePeriodMinutes: 15,
  },
}));

const PERSONAL_USER = { id: "s1", nfcTagId: "card_1" };
const NO_TAG_USER = { id: "s1", nfcTagId: null };
const OPEN_LOCATION = {
  id: "loc1",
  nfcTagId: "door_1",
  isActive: true,
  deletedAt: null,
  accuracy: null,
  wifiSsids: null,
  latitude: null,
  longitude: null,
  radius: null,
};

let selectQueue: unknown[] = [];
let insertRunError: Error | null = null;

function makeChain(): Record<string, jest.Mock> {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["from", "where", "values", "orderBy", "limit"]) {
    chain[key] = jest.fn(() => chain);
  }
  chain.get = jest.fn(async () => selectQueue.shift());
  chain.run = jest.fn(async () => {
    if (insertRunError) {
      const err = insertRunError;
      insertRunError = null;
      throw err;
    }
    return undefined;
  });
  return chain;
}

async function capture(p: Promise<unknown>): Promise<AttendanceValidationError> {
  try {
    await p;
  } catch (e) {
    return e as AttendanceValidationError;
  }
  throw new Error("expected validation to reject, but it resolved");
}

function lastInsertValues(): Record<string, unknown> {
  const insertMock = db.insert as jest.Mock;
  const valuesMock = (insertMock.mock.results[insertMock.mock.results.length - 1].value as Record<string, jest.Mock>)
    .values;
  return valuesMock.mock.calls[valuesMock.mock.calls.length - 1][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  selectQueue = [];
  insertRunError = null;
  (db.select as jest.Mock).mockImplementation(() => makeChain());
  (db.insert as jest.Mock).mockImplementation(() => makeChain());
  (resolveShift as jest.Mock).mockResolvedValue({
    startTime: "09:00",
    endTime: "17:00",
    gracePeriodMinutes: 15,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("live tier (nonce, 5-min freshness)", () => {
  it("rejects a strict live tap with no nonce before touching the DB", async () => {
    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
        requireAntiReplay: true,
      })
    );
    expect(err).toBeInstanceOf(AttendanceValidationError);
    expect(err.status).toBe(403);
    expect(err.message).toContain("nonce is required");
    expect(db.select).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("rejects a strict live tap older than the 5-minute freshness window", async () => {
    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
        nonce: "nonce-12345678",
        tapAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        requireAntiReplay: true,
      })
    );
    expect(err.status).toBe(403);
    expect(err.message).toContain("freshness window");
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects a future-dated live tap", async () => {
    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
        nonce: "nonce-12345678",
        tapAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
        requireAntiReplay: true,
      })
    );
    expect(err.status).toBe(403);
    expect(err.message).toContain("future-dated");
    expect(db.select).not.toHaveBeenCalled();
  });

  it("consumes a fresh nonce on the personal-card path", async () => {
    const tapAt = new Date(Date.now() - 60 * 1000).toISOString();
    selectQueue = [PERSONAL_USER, undefined]; // staff, usedNonces miss

    await validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
      nonce: "nonce-abc12345",
      tapAt,
      requireAntiReplay: true,
    });

    expect(db.insert).toHaveBeenCalledWith(usedNonces);
    const values = lastInsertValues();
    expect(values.jti).toBe("nfc:s1:nonce-abc12345");
    expect(values.expiresAt).toBe(new Date(Date.parse(tapAt) + 5 * 60 * 1000).toISOString());
  });

  it("rejects a replayed nonce (row already present)", async () => {
    const tapAt = new Date(Date.now() - 60 * 1000).toISOString();
    selectQueue = [PERSONAL_USER, { jti: "nfc:s1:nonce-abc12345" }];

    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
        nonce: "nonce-abc12345",
        tapAt,
        requireAntiReplay: true,
      })
    );
    expect(err.status).toBe(400);
    expect(err.message).toContain("replay detected");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("maps a UNIQUE constraint race on consumption to a replay error", async () => {
    const tapAt = new Date(Date.now() - 60 * 1000).toISOString();
    selectQueue = [PERSONAL_USER, undefined];
    insertRunError = new Error("UNIQUE constraint failed: used_nonces.jti");

    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
        nonce: "nonce-abc12345",
        tapAt,
        requireAntiReplay: true,
      })
    );
    expect(err.status).toBe(400);
    expect(err.message).toContain("replay detected");
  });

  it("keeps legacy behavior when the flag is off and no nonce is sent", async () => {
    selectQueue = [PERSONAL_USER];

    await validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined);

    expect(db.insert).not.toHaveBeenCalled();
  });

  it("still consumes a nonce when supplied even if the flag is off", async () => {
    const tapAt = new Date(Date.now() - 60 * 1000).toISOString();
    selectQueue = [PERSONAL_USER, undefined];

    await validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
      nonce: "nonce-abc12345",
      tapAt,
    });

    expect(lastInsertValues().jti).toBe("nfc:s1:nonce-abc12345");
  });

  it("does not burn the nonce when location validation fails", async () => {
    const tapAt = new Date(Date.now() - 60 * 1000).toISOString();
    selectQueue = [NO_TAG_USER, { ...OPEN_LOCATION, accuracy: 30 }];

    const err = await capture(
      validateNfcCheckIn("s1", "door_1", 1.1, 2.2, 100, undefined, {
        nonce: "nonce-abc12345",
        tapAt,
        requireAntiReplay: true,
      })
    );
    expect(err.status).toBe(403);
    expect(err.message).toContain("accuracy");
    expect(db.insert).not.toHaveBeenCalled();
    // staff + location only; usedNonces was never selected
    expect(db.select).toHaveBeenCalledTimes(2);
  });

  it("consumes the nonce only after location validation passes", async () => {
    const tapAt = new Date(Date.now() - 60 * 1000).toISOString();
    selectQueue = [NO_TAG_USER, OPEN_LOCATION, undefined]; // staff, location, usedNonces miss

    await validateNfcCheckIn("s1", "door_1", undefined, undefined, undefined, undefined, {
      nonce: "nonce-abc12345",
      tapAt,
      requireAntiReplay: true,
    });

    expect(lastInsertValues().jti).toBe("nfc:s1:nonce-abc12345");
  });
});

describe("offline tier (content key + age + shift window)", () => {
  const NOW = "2026-10-15T12:00:00.000Z";

  function freezeAt(iso: string) {
    jest.useFakeTimers({ now: new Date(iso), doNotFake: ["nextTick", "queueMicrotask"] });
  }

  it("requires a timestamp when strict", async () => {
    freezeAt(NOW);
    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
        offline: true,
        requireAntiReplay: true,
      })
    );
    expect(err.status).toBe(403);
    expect(err.message).toContain("timestamp is required");
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects a future-dated offline tap", async () => {
    freezeAt(NOW);
    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
        tapAt: "2026-10-15T12:02:00.000Z",
        offline: true,
        requireAntiReplay: true,
      })
    );
    expect(err.status).toBe(403);
    expect(err.message).toContain("future-dated");
  });

  it("rejects an offline tap older than 48 hours", async () => {
    freezeAt(NOW);
    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
        tapAt: "2026-10-13T11:00:00.000Z",
        offline: true,
        requireAntiReplay: true,
      })
    );
    expect(err.status).toBe(403);
    expect(err.message).toContain("older than 48 hours");
  });

  it("rejects an offline tap that precedes the shift window", async () => {
    freezeAt(NOW);
    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
        tapAt: "2026-10-15T01:00:00.000Z",
        offline: true,
        requireAntiReplay: true,
      })
    );
    expect(err.status).toBe(403);
    expect(err.message).toContain("precedes the shift window");
    expect(resolveShift).toHaveBeenCalledWith("s1", "2026-10-15");
    expect(db.select).not.toHaveBeenCalled();
  });

  it("rejects an offline tap that follows the shift window (late backfill)", async () => {
    // Overnight shift (ends 04:00): close = dayStart + 4h + 12h = 16:00 local.
    // Under the pinned UTC timezone a 17:00 tap on the same date sits past the
    // close boundary while still being non-future and < 48h old.
    (resolveShift as jest.Mock).mockResolvedValue({
      startTime: "20:00",
      endTime: "04:00",
      gracePeriodMinutes: 15,
    });
    freezeAt("2026-10-15T20:00:00.000Z");
    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
        tapAt: "2026-10-15T17:00:00.000Z",
        offline: true,
        requireAntiReplay: true,
      })
    );
    expect(err.status).toBe(403);
    expect(err.message).toContain("follows the shift window");
  });

  it("accepts an in-window offline tap and records a content-hash key", async () => {
    freezeAt(NOW);
    selectQueue = [PERSONAL_USER, undefined]; // staff, usedNonces miss

    await validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
      tapAt: "2026-10-15T10:00:00.000Z",
      offline: true,
      deviceSequence: 42,
      requireAntiReplay: true,
    });

    const values = lastInsertValues();
    expect(values.jti).toMatch(/^nfc-offline:[a-f0-9]{64}$/);
    // expiresAt = max(tapAt, now) + 48h
    expect(values.expiresAt).toBe("2026-10-17T12:00:00.000Z");
  });

  it("rejects a double flush of the same outbox entry", async () => {
    freezeAt(NOW);
    const payload = {
      tapAt: "2026-10-15T10:00:00.000Z",
      offline: true as const,
      deviceSequence: 42,
      requireAntiReplay: true,
    };

    selectQueue = [PERSONAL_USER, undefined];
    await validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, payload);

    selectQueue = [PERSONAL_USER, { jti: "nfc-offline:already-used" }];
    const err = await capture(
      validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, payload)
    );
    expect(err.status).toBe(400);
    expect(err.message).toContain("replay detected");
  });

  it("gives distinct outbox entries distinct keys via deviceSequence", async () => {
    freezeAt(NOW);
    selectQueue = [PERSONAL_USER, undefined, PERSONAL_USER, undefined];

    await validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
      tapAt: "2026-10-15T10:00:00.000Z",
      offline: true,
      deviceSequence: 1,
    });
    await validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
      tapAt: "2026-10-15T10:00:00.000Z",
      offline: true,
      deviceSequence: 2,
    });

    const insertMock = db.insert as jest.Mock;
    expect(insertMock).toHaveBeenCalledTimes(2);
    const jtiOf = (call: number): unknown =>
      (
        insertMock.mock.results[call].value as Record<string, jest.Mock>
      ).values.mock.calls[0][0].jti;
    expect(jtiOf(0)).toMatch(/^nfc-offline:/);
    expect(jtiOf(1)).toMatch(/^nfc-offline:/);
    expect(jtiOf(0)).not.toBe(jtiOf(1));
  });

  it("applies the content-hash key even when the flag is off (double-flush guard)", async () => {
    freezeAt(NOW);
    selectQueue = [PERSONAL_USER, undefined];

    await validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
      offline: true,
    });

    expect(lastInsertValues().jti).toMatch(/^nfc-offline:/);
  });

  it("stays permissive offline when the flag is off (no window checks)", async () => {
    freezeAt(NOW);
    selectQueue = [PERSONAL_USER, undefined];

    // 49-hour-old tap would be rejected in strict mode but passes when off.
    await validateNfcCheckIn("s1", "card_1", undefined, undefined, undefined, undefined, {
      tapAt: "2026-10-13T11:00:00.000Z",
      offline: true,
      deviceSequence: 7,
    });

    expect(db.insert).toHaveBeenCalledWith(usedNonces);
  });
});
