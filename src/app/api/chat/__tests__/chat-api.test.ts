import { db } from "@/db";
import {
  institutions,
  staff,
  staffInstitutions,
  chatChannels,
  chatMembers,
  chatChannelMessages,
  chatReceipts,
} from "@thaiba/db/schema";
import { GET as getChannels, POST as createChannel } from "../channels/route";
import { GET as getChannelDetails, PATCH as updateChannel, DELETE as deleteChannel } from "../channels/[id]/route";
import { POST as addMembers, DELETE as removeMember } from "../channels/[id]/members/route";
import { GET as getMessages, POST as sendMessage } from "../channels/[id]/messages/route";
import { PATCH as editMessage, DELETE as deleteMessage } from "../messages/[id]/route";
import { POST as markRead } from "../messages/[id]/read/route";
import { GET as getPresence } from "../presence/route";
import { randomUUID } from "crypto";

const mockInstId = "inst_test_chat_001";
const mockOtherInstId = "inst_other_chat_002";
const mockStaff1 = "staff_1_chat_001";
const mockStaff2 = "staff_2_chat_002";
const mockStaffOther = "staff_other_chat_003";

const mockSession = {
  staffId: mockStaff1,
  email: "staff1_chat@thaiba.dev",
  role: "staff",
  employeeId: "EMP-001",
  name: "Staff One",
  tokenVersion: 0,
  institutionId: mockInstId,
};

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn().mockImplementation(() => Promise.resolve({
      staffId: "staff_1_chat_001",
      email: "staff1_chat@thaiba.dev",
      role: "staff",
      employeeId: "EMP-001",
      name: "Staff One",
      tokenVersion: 0,
      institutionId: "inst_test_chat_001",
    })),
    resolveScopedInstitutionId: jest.fn().mockReturnValue("inst_test_chat_001"),
  };
});

describe("Real-Time Chat & Messaging Mesh API Integration Tests", () => {
  const instId = mockInstId;
  const otherInstId = mockOtherInstId;
  const staff1 = mockStaff1;
  const staff2 = mockStaff2;
  const staffOther = mockStaffOther;
  const session1 = mockSession;

  const sessionAdmin = {
    staffId: staff1,
    email: "admin@thaiba.dev",
    role: "admin",
    employeeId: "EMP-001",
    name: "Admin User",
    tokenVersion: 0,
    institutionId: instId,
  };

  beforeAll(async () => {
    // Cleanup prior test data
    await db.delete(chatReceipts);
    await db.delete(chatChannelMessages);
    await db.delete(chatMembers);
    await db.delete(chatChannels);

    // Setup institutions
    await db
      .insert(institutions)
      .values([
        { id: instId, name: "Test Institution", code: `TEST_${Date.now()}` },
        { id: otherInstId, name: "Other Institution", code: `OTHER_${Date.now()}` },
      ])
      .onConflictDoNothing();

    // Setup staff
    await db
      .insert(staff)
      .values([
        {
          id: staff1,
          email: `staff1_${Date.now()}@thaiba.dev`,
          employeeId: `EMP1_${Date.now()}`,
          firstName: "Staff",
          lastName: "One",
          role: "staff",
        },
        {
          id: staff2,
          email: `staff2_${Date.now()}@thaiba.dev`,
          employeeId: `EMP2_${Date.now()}`,
          firstName: "Staff",
          lastName: "Two",
          role: "staff",
        },
        {
          id: staffOther,
          email: `other_${Date.now()}@thaiba.dev`,
          employeeId: `EMPO_${Date.now()}`,
          firstName: "Other",
          lastName: "Staff",
          role: "staff",
        },
      ])
      .onConflictDoNothing();

    // Setup staff-institution links
    await db
      .insert(staffInstitutions)
      .values([
        { id: randomUUID(), staffId: staff1, institutionId: instId },
        { id: randomUUID(), staffId: staff2, institutionId: instId },
        { id: randomUUID(), staffId: staffOther, institutionId: otherInstId },
      ])
      .onConflictDoNothing();
  });

  let createdChannelId: string;
  let createdMessageId: string;

  it("should create a group chat channel with affiliated members", async () => {
    const req = new Request("http://localhost/api/chat/channels", {
      method: "POST",
      body: JSON.stringify({
        name: "General Discussion",
        type: "group",
        memberIds: [staff2],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createChannel(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.channel).toBeDefined();
    expect(data.channel.name).toBe("General Discussion");
    expect(data.members).toHaveLength(2);

    createdChannelId = data.channel.id;
  });

  it("should reject channel creation with unaffiliated members (cross-tenant block)", async () => {
    const req = new Request("http://localhost/api/chat/channels", {
      method: "POST",
      body: JSON.stringify({
        name: "Cross Tenant Attack",
        type: "group",
        memberIds: [staffOther],
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createChannel(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("do not belong to the active institution");
  });

  it("should list joined channels with unread count and latest message preview", async () => {
    const req = new Request("http://localhost/api/chat/channels");
    const res = await getChannels(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.channels).toHaveLength(1);
    expect(data.channels[0].id).toBe(createdChannelId);
  });

  it("should send a message in the channel and retrieve it", async () => {
    const sendReq = new Request(`http://localhost/api/chat/channels/${createdChannelId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: "Hello everyone in the group!",
        type: "text",
        clientMessageId: "client-msg-123",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const sendRes = await sendMessage(sendReq, {
      params: Promise.resolve({ id: createdChannelId }),
    });
    expect(sendRes.status).toBe(201);
    const sendData = await sendRes.json();
    expect(sendData.message.content).toBe("Hello everyone in the group!");
    createdMessageId = sendData.message.id;

    // Retrieve messages
    const getReq = new Request(`http://localhost/api/chat/channels/${createdChannelId}/messages`);
    const getRes = await getMessages(getReq, {
      params: Promise.resolve({ id: createdChannelId }),
    });
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.messages).toHaveLength(1);
    expect(getData.messages[0].id).toBe(createdMessageId);
  });

  it("should edit own message within the allowed window", async () => {
    const req = new Request(`http://localhost/api/chat/messages/${createdMessageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content: "Hello everyone in the group! (Edited)" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await editMessage(req, {
      params: Promise.resolve({ id: createdMessageId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message.content).toBe("Hello everyone in the group! (Edited)");
    expect(data.message.editedAt).not.toBeNull();
  });

  it("should mark message as read and create read receipts", async () => {
    const req = new Request(`http://localhost/api/chat/messages/${createdMessageId}/read`, {
      method: "POST",
    });

    const res = await markRead(req, {
      params: Promise.resolve({ id: createdMessageId }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.markedCount).toBe(1);
  });

  it("should soft-delete message and redact content", async () => {
    const req = new Request(`http://localhost/api/chat/messages/${createdMessageId}`, {
      method: "DELETE",
    });

    const res = await deleteMessage(req, {
      params: Promise.resolve({ id: createdMessageId }),
    });
    expect(res.status).toBe(200);

    // Verify content is redacted on subsequent get
    const getReq = new Request(`http://localhost/api/chat/channels/${createdChannelId}/messages`);
    const getRes = await getMessages(getReq, {
      params: Promise.resolve({ id: createdChannelId }),
    });
    const getData = await getRes.json();
    expect(getData.messages[0].content).toBe("[Message deleted]");
  });

  it("should get presence dictionary for mutual channel members", async () => {
    const req = new Request("http://localhost/api/chat/presence");
    const res = await getPresence(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.presence).toBeDefined();
  });
});
