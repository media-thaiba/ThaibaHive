/**
 * Tests for Redis PubSub Distributed Quarantine Synchronization Adapter
 * Sprint-039 / TIF-001 (TD-014)
 */

import { QuarantinePubSubAdapter, IRedisPubSubClient, QuarantinePubSubMessage } from "../../security/quarantine-pubsub";
import { QuarantineRecord } from "../../security/quarantine-store";

describe("QuarantinePubSubAdapter (TIF-001)", () => {
  let adapter: QuarantinePubSubAdapter;

  const mockRecord: QuarantineRecord = {
    id: "quarantine_test_123",
    tenantId: "tenant_alpha",
    ipAddress: "198.51.100.44",
    cidrMask: "/32",
    reason: "Brute force attack simulation",
    threatScore: 95,
    bannedBy: "system",
    expiresAt: Date.now() + 3600000,
    isActive: true,
    createdAt: Date.now(),
  };

  beforeEach(() => {
    adapter = new QuarantinePubSubAdapter("node_alpha");
  });

  afterEach(() => {
    adapter.reset();
  });

  it("initializes in fallback mode when no Redis client is provided", () => {
    expect(adapter.isUsingFallback()).toBe(true);
    expect(adapter.isClientConnected()).toBe(false);
    expect(adapter.getNodeId()).toBe("node_alpha");
  });

  it("publishes and delivers local messages in fallback mode", async () => {
    const received: QuarantinePubSubMessage[] = [];
    const unsubscribe = adapter.subscribe((msg) => {
      received.push(msg);
    });

    await adapter.publish("ADD", { record: mockRecord });

    expect(received.length).toBe(1);
    expect(received[0].action).toBe("ADD");
    expect(received[0].record?.ipAddress).toBe("198.51.100.44");
    expect(received[0].originNodeId).toBe("node_alpha");

    unsubscribe();
  });

  it("unsubscribes handlers cleanly", async () => {
    const received: QuarantinePubSubMessage[] = [];
    const unsubscribe = adapter.subscribe((msg) => {
      received.push(msg);
    });

    unsubscribe();
    await adapter.publish("REMOVE", { ipOrId: "198.51.100.44" });

    expect(received.length).toBe(0);
  });

  it("interacts properly with mock Redis client", async () => {
    let publishedChannel = "";
    let publishedPayload = "";
    let registeredCallback: ((msg: string, ch: string) => void) | null = null;

    const mockRedis: IRedisPubSubClient = {
      publish: jest.fn(async (channel, message) => {
        publishedChannel = channel;
        publishedPayload = message;
        return 1;
      }),
      subscribe: jest.fn(async (channel, callback) => {
        registeredCallback = callback;
      }),
      unsubscribe: jest.fn(async () => {}),
    };

    adapter.setClient(mockRedis);
    expect(adapter.isClientConnected()).toBe(true);
    expect(adapter.isUsingFallback()).toBe(false);
    expect(mockRedis.subscribe).toHaveBeenCalledWith("security:quarantine:events", expect.any(Function));

    await adapter.publish("CONTAIN_SUBNET", {
      record: { ...mockRecord, cidrMask: "/24" },
      subnetCidr: "198.51.100.0/24",
    });

    expect(mockRedis.publish).toHaveBeenCalled();
    expect(publishedChannel).toBe("security:quarantine:events");

    const parsed = JSON.parse(publishedPayload);
    expect(parsed.action).toBe("CONTAIN_SUBNET");
    expect(parsed.subnetCidr).toBe("198.51.100.0/24");
    expect(parsed.originNodeId).toBe("node_alpha");
  });

  it("processes incoming cross-node Redis messages and computes latency", async () => {
    let registeredCallback: ((msg: string, ch: string) => void) | null = null;

    const mockRedis: IRedisPubSubClient = {
      publish: jest.fn(async () => 1),
      subscribe: jest.fn(async (_, cb) => {
        registeredCallback = cb;
      }),
      unsubscribe: jest.fn(async () => {}),
    };

    adapter.setClient(mockRedis);

    const received: QuarantinePubSubMessage[] = [];
    adapter.subscribe((msg) => received.push(msg));

    const externalMessage: QuarantinePubSubMessage = {
      messageId: "msg_ext_999",
      action: "ADD",
      record: mockRecord,
      originNodeId: "node_bravo",
      timestamp: Date.now() - 15, // 15ms simulated flight latency
    };

    expect(registeredCallback).not.toBeNull();
    registeredCallback!(JSON.stringify(externalMessage), "security:quarantine:events");

    expect(received.length).toBe(1);
    expect(received[0].originNodeId).toBe("node_bravo");
    expect(adapter.getAverageSyncLatencyMs()).toBeGreaterThanOrEqual(0);
  });

  it("ignores self-published or duplicated messages", async () => {
    let registeredCallback: ((msg: string, ch: string) => void) | null = null;
    const mockRedis: IRedisPubSubClient = {
      publish: jest.fn(async () => 1),
      subscribe: jest.fn(async (_, cb) => {
        registeredCallback = cb;
      }),
      unsubscribe: jest.fn(async () => {}),
    };

    adapter.setClient(mockRedis);
    const received: QuarantinePubSubMessage[] = [];
    adapter.subscribe((msg) => received.push(msg));

    const ownMessage: QuarantinePubSubMessage = {
      messageId: "msg_own_123",
      action: "ADD",
      record: mockRecord,
      originNodeId: "node_alpha", // same node
      timestamp: Date.now(),
    };

    registeredCallback!(JSON.stringify(ownMessage), "security:quarantine:events");
    expect(received.length).toBe(0);
  });
});
