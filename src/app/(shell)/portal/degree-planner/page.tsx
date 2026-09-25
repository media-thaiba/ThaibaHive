'use client';

import React from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { DegreeProgressRadar } from '@/components/curriculum/portal/degree-progress-radar';
import { GpaProjectionCalculator } from '@/components/curriculum/portal/gpa-projection-calculator';
import { MilestoneTracker } from '@/components/curriculum/portal/milestone-tracker';
import { AdvisorBookingCard } from '@/components/curriculum/portal/advisor-booking-card';
import { DegreePlannerCanvas } from '@/components/curriculum/planner/degree-planner-canvas';
import { AdvisingChatDrawer } from '@/components/curriculum/advising/advising-chat-drawer';

export default function StudentDegreePlannerPage() {
  const handleSendMessage = async (prompt: string) => {
    try {
      const res = await fetch('/api/curriculum/advising', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'sess_portal_student',
          studentId: 'stud_portal_1',
          prompt,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          id: data.message.id,
          senderType: 'agent' as const,
          agentDomain: data.agentResponse.agentDomain,
          messageContent: data.agentResponse.replyText,
          citations: data.agentResponse.citations,
          roadmapAction: data.agentResponse.proposedRoadmapAction,
          sentAt: data.message.sentAt,
        };
      }
    } catch {}

    return {
      id: `m_${Date.now()}`,
      senderType: 'agent' as const,
      agentDomain: 'degree_planner',
      messageContent: 'I have reviewed your inquiry. Please ensure major prerequisite sequences are respected in your term planner.',
      sentAt: new Date().toISOString(),
    };
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Student Degree Planner & Academic Success Portal"
        description="Personalized 4-Year Graduation Roadmap, Milestone Tracking & Autonomous AI Advising"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DegreeProgressRadar
            earnedCredits={64}
            totalCredits={120}
            cumulativeGpa={3.42}
            completionPercentage={53.3}
          />

          <DegreePlannerCanvas />
        </div>

        <div className="space-y-6">
          <AdvisingChatDrawer
            sessionId="sess_portal_student"
            studentId="stud_portal_1"
            onSendMessage={handleSendMessage}
          />

          <GpaProjectionCalculator currentGpa={3.42} currentCredits={64} />

          <MilestoneTracker />

          <AdvisorBookingCard />
        </div>
      </div>
    </div>
  );
}
