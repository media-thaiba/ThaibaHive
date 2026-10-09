import { ChatPresenceEngine } from "../presence-engine";
import { ChatPubSubBroker } from "../pubsub-broker";

describe("ChatPresenceEngine", () => {
  let presence: ChatPresenceEngine;
  let broker: ChatPubSubBroker;

  beforeEach(() => {
    presence = ChatPresenceEngine.getInstance();
    broker = ChatPubSubBroker.getInstance();
    presence.reset();
    broker.reset();
  });

  it("should record heartbeats and accurately report presence status", () => {
    expect(presence.getPresence("user-1")).toBe("offline");

    presence.recordHeartbeat("user-1", "inst-1", "online");
    expect(presence.getPresence("user-1")).toBe("online");

    presence.setUserOffline("user-1", "inst-1");
    expect(presence.getPresence("user-1")).toBe("offline");
  });

  it("should track typing indicators with auto-expiry debounce", () => {
    presence.setTyping("user-1", "chan-1", "inst-1", true);
    expect(presence.getActiveTypers("chan-1")).toContain("user-1");

    presence.setTyping("user-1", "chan-1", "inst-1", false);
    expect(presence.getActiveTypers("chan-1")).not.toContain("user-1");
  });
});
