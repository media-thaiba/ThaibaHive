import { ChatPubSubBroker, ChatSubscriber, ChatEvent } from "../pubsub-broker";

describe("ChatPubSubBroker", () => {
  let broker: ChatPubSubBroker;

  beforeEach(() => {
    broker = ChatPubSubBroker.getInstance();
    broker.reset();
  });

  it("should deliver published events to subscribers of the same channel and tenant", () => {
    const receivedEvents: ChatEvent[] = [];
    const subscriber: ChatSubscriber = {
      staffId: "staff-1",
      institutionId: "inst-1",
      isAlive: true,
      send: (e) => receivedEvents.push(e),
    };

    broker.subscribeChannel("chan-1", subscriber);

    const event: ChatEvent = {
      type: "message:new",
      channelId: "chan-1",
      senderId: "staff-2",
      institutionId: "inst-1",
      payload: { content: "Hello world" },
      timestamp: new Date().toISOString(),
    };

    broker.publishToChannel("chan-1", event);

    expect(receivedEvents).toHaveLength(1);
    expect(receivedEvents[0].payload).toEqual({ content: "Hello world" });
  });

  it("should enforce tenant boundary and drop cross-tenant events", () => {
    const receivedEvents: ChatEvent[] = [];
    const subscriberInTenant1: ChatSubscriber = {
      staffId: "staff-1",
      institutionId: "inst-1",
      isAlive: true,
      send: (e) => receivedEvents.push(e),
    };

    broker.subscribeChannel("chan-shared", subscriberInTenant1);

    const eventFromTenant2: ChatEvent = {
      type: "message:new",
      channelId: "chan-shared",
      senderId: "staff-rogue",
      institutionId: "inst-2", // Different tenant
      payload: { content: "Cross-tenant attempt" },
      timestamp: new Date().toISOString(),
    };

    broker.publishToChannel("chan-shared", eventFromTenant2);

    expect(receivedEvents).toHaveLength(0);
  });

  it("should stop delivering events after unsubscription", () => {
    const receivedEvents: ChatEvent[] = [];
    const subscriber: ChatSubscriber = {
      staffId: "staff-1",
      institutionId: "inst-1",
      isAlive: true,
      send: (e) => receivedEvents.push(e),
    };

    broker.subscribeChannel("chan-1", subscriber);
    broker.unsubscribeChannel("chan-1", subscriber);

    broker.publishToChannel("chan-1", {
      type: "message:new",
      channelId: "chan-1",
      senderId: "staff-2",
      institutionId: "inst-1",
      payload: { content: "After unsubscribe" },
      timestamp: new Date().toISOString(),
    });

    expect(receivedEvents).toHaveLength(0);
  });

  it("should accurately track online status", () => {
    const subscriber: ChatSubscriber = {
      staffId: "staff-100",
      institutionId: "inst-1",
      isAlive: true,
      send: jest.fn(),
    };

    expect(broker.isUserOnline("staff-100")).toBe(false);

    broker.registerUserConnection(subscriber);
    expect(broker.isUserOnline("staff-100")).toBe(true);

    broker.unregisterUserConnection(subscriber);
    expect(broker.isUserOnline("staff-100")).toBe(false);
  });
});
