import { GET as getCampaigns, POST as createCampaign } from '@/app/api/engage/campaigns/route';
import { GET as getTemplates, POST as createTemplate } from '@/app/api/engage/templates/route';
import { GET as getWorkflows, POST as createWorkflow } from '@/app/api/engage/workflows/route';
import { GET as getConversations, POST as postConversation } from '@/app/api/engage/conversations/route';
import { GET as getPreferences, PATCH as patchPreferences } from '@/app/api/engage/preferences/route';
import { GET as getAnalytics } from '@/app/api/engage/analytics/route';
import { POST as postDispatch } from '@/app/api/engage/dispatch/route';
import { EngageDbStore } from '@/lib/db/engage-store';

describe('EngageOS REST API Suite Integration Tests', () => {
  beforeEach(() => {
    EngageDbStore.getInstance().clearMemoryStore();
  });

  it('should create and fetch campaigns via REST API', async () => {
    const postReq = new Request('http://localhost/api/engage/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        campaignId: 'camp_001',
        name: 'Fall Orientation Broadcast',
        channel: 'email',
        subject: 'Welcome to Campus',
        body: 'Welcome students and parents!',
      }),
    });

    const postRes = await createCampaign(postReq);
    expect(postRes.status).toBe(201);

    const getReq = new Request('http://localhost/api/engage/campaigns');
    const getRes = await getCampaigns(getReq);
    expect(getRes.status).toBe(200);
    const data = await getRes.json();
    expect(data.campaigns.length).toBeGreaterThan(0);
  });

  it('should create and fetch templates via REST API', async () => {
    const postReq = new Request('http://localhost/api/engage/templates', {
      method: 'POST',
      body: JSON.stringify({
        templateId: 'tmpl_001',
        name: 'Exam Alert Template',
        channel: 'sms',
        bodyTemplate: 'Exam notice: {{student.name}}, your test is tomorrow. Unsubscribe: optout.link',
      }),
    });

    const postRes = await createTemplate(postReq);
    expect(postRes.status).toBe(201);

    const getReq = new Request('http://localhost/api/engage/templates');
    const getRes = await getTemplates(getReq);
    expect(getRes.status).toBe(200);
  });

  it('should process conversations and return bot response via REST API', async () => {
    const postReq = new Request('http://localhost/api/engage/conversations', {
      method: 'POST',
      body: JSON.stringify({
        sessionId: 'sesh_api_1',
        stakeholderId: 'student_99',
        text: 'What is my current attendance percentage?',
      }),
    });

    const postRes = await postConversation(postReq);
    expect(postRes.status).toBe(200);
    const data = await postRes.json();
    expect(data.activeIntent).toBe('check_attendance');
    expect(data.botReplyText).toContain('attendance is 87.4%');
  });

  it('should update and fetch stakeholder preferences via REST API', async () => {
    const patchReq = new Request('http://localhost/api/engage/preferences', {
      method: 'PATCH',
      body: JSON.stringify({
        recipientId: 'parent_api_1',
        channelPreferences: { sms: true, email: true },
        quietHoursStart: '21:30',
      }),
    });

    const patchRes = await patchPreferences(patchReq);
    expect(patchRes.status).toBe(200);

    const getReq = new Request('http://localhost/api/engage/preferences?recipientId=parent_api_1');
    const getRes = await getPreferences(getReq);
    expect(getRes.status).toBe(200);
    const data = await getRes.json();
    expect(data.preferences.quietHoursStart).toBe('21:30');
  });

  it('should fetch engagement analytics overview via REST API', async () => {
    const getReq = new Request('http://localhost/api/engage/analytics');
    const getRes = await getAnalytics(getReq);
    expect(getRes.status).toBe(200);
    const data = await getRes.json();
    expect(data.overview.funnel).toBeDefined();
    expect(data.overview.channelBreakdown).toBeDefined();
  });

  it('should dispatch message with consent verification via REST API', async () => {
    const postReq = new Request('http://localhost/api/engage/dispatch', {
      method: 'POST',
      body: JSON.stringify({
        messageId: 'msg_api_dispatch_1',
        recipientId: 'user_api_1',
        recipientChannelAddress: 'student@example.com',
        channel: 'email',
        priority: 'high',
        body: 'Urgent schedule update',
      }),
    });

    const postRes = await postDispatch(postReq);
    expect(postRes.status).toBe(200);
    const data = await postRes.json();
    expect(data.result.success).toBe(true);
  });
});
