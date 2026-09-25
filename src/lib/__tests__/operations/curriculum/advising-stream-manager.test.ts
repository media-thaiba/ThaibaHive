import { advisingStream, AdvisingStreamMessage } from '../../../operations/curriculum/streaming/advising-stream-manager';

describe('Curricular & Advising Telemetry Stream Manager (ADVISE-012)', () => {
  it('should broadcast and receive token chunks and domain handoffs across subscribers', () => {
    const receivedMessages: AdvisingStreamMessage[] = [];
    const unsubscribe = advisingStream.subscribeSession('sess_100', (msg) => {
      receivedMessages.push(msg);
    });

    advisingStream.broadcastToSession('sess_100', 'token_chunk', { token: 'Hello! ' }, 'inst_1');
    advisingStream.broadcastToSession('sess_100', 'domain_handoff', { newDomain: 'career_alignment' }, 'inst_1');

    expect(receivedMessages).toHaveLength(2);
    expect(receivedMessages[0].eventType).toBe('token_chunk');
    expect(receivedMessages[1].eventType).toBe('domain_handoff');

    unsubscribe();
    expect(advisingStream.getActiveSubscribersCount('sess_100')).toBe(0);
  });
});
