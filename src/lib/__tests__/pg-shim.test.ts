import { wrapPgDb } from "../../../packages/db/index";

describe("PostgreSQL Query Shim (wrapPgDb)", () => {
  it("shims .get() to return the first row object", async () => {
    const mockPgDb = {
      select: () => ({
        from: () => ({
          where: () => Promise.resolve([{ id: "1", name: "Thaiba Staff" }, { id: "2", name: "Admin" }]),
        }),
      }),
    };

    const wrapped = wrapPgDb(mockPgDb);
    const result = await wrapped.select().from().where().get();
    expect(result).toEqual({ id: "1", name: "Thaiba Staff" });
  });

  it("shims .get() to return undefined for empty result set", async () => {
    const mockPgDb = {
      select: () => ({
        from: () => Promise.resolve([]),
      }),
    };

    const wrapped = wrapPgDb(mockPgDb);
    const result = await wrapped.select().from().get();
    expect(result).toBeUndefined();
  });

  it("shims .all() to return full row array", async () => {
    const rows = [{ id: "1" }, { id: "2" }];
    const mockPgDb = {
      select: () => ({
        from: () => Promise.resolve(rows),
      }),
    };

    const wrapped = wrapPgDb(mockPgDb);
    const result = await wrapped.select().from().all();
    expect(result).toEqual(rows);
  });

  it("shims .run() to return { changes: rowCount }", async () => {
    const mockPgDb = {
      update: () => ({
        set: () => ({
          where: () => Promise.resolve({ rowCount: 3 }),
        }),
      }),
    };

    const wrapped = wrapPgDb(mockPgDb);
    const result = await wrapped.update().set().where().run();
    expect(result).toEqual({ changes: 3, lastInsertRowid: undefined });
  });

  it("wraps transaction execution context cleanly", async () => {
    const mockPgDb = {
      transaction: (cb: (tx: unknown) => Promise<unknown>) => {
        const mockTx = {
          insert: () => ({
            values: () => Promise.resolve({ rowCount: 1 }),
          }),
        };
        return cb(mockTx);
      },
    };

    const wrapped = wrapPgDb(mockPgDb);
    const res = await wrapped.transaction(async (tx: any) => {
      return await tx.insert().values().run();
    });

    expect(res).toEqual({ changes: 1, lastInsertRowid: undefined });
  });
});
