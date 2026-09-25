'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface AgentBadgeProps {
  domain: string;
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({ domain }) => {
  switch (domain) {
    case 'degree_planner':
      return <Badge variant="default">🎓 Degree Planner Agent</Badge>;
    case 'career_alignment':
      return <Badge variant="info">💼 Career Alignment Agent</Badge>;
    case 'transfer_articulation':
      return <Badge variant="warning">🔄 Transfer Articulation Agent</Badge>;
    case 'financial_aid_load':
      return <Badge variant="secondary">💰 Financial Aid & Load Agent</Badge>;
    case 'academic_recovery':
      return <Badge variant="destructive">🛡️ Academic Recovery Agent</Badge>;
    default:
      return <Badge variant="default">🤖 AI Academic Advisor</Badge>;
  }
};
