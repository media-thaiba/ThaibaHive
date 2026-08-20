import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import KnowledgeMeshRadarPage from '@/app/(shell)/admin/operations/knowledge-mesh/page';
import StudentCopilotPage from '@/app/(shell)/portal/copilot/page';
import AdvisingDeskPage from '@/app/(shell)/admin/academics/advising-desk/page';

describe('KM & Copilot UI Component Tests (KM-022, KM-023, KM-024)', () => {
  it('should render KnowledgeMeshRadarPage with all 5 tab options', () => {
    render(<KnowledgeMeshRadarPage />);
    expect(screen.getByText('Knowledge Mesh & Campus Copilot Radar')).toBeInTheDocument();
    expect(screen.getByText('Graph Explorer')).toBeInTheDocument();
    expect(screen.getByText('Hybrid RAG')).toBeInTheDocument();
    expect(screen.getByText('Ingestion Studio')).toBeInTheDocument();
    expect(screen.getByText('Degree Rules')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('should render StudentCopilotPage chat interface', () => {
    render(<StudentCopilotPage />);
    expect(screen.getByText('Campus AI Copilot')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask a question about your courses, prerequisites, or policies...')).toBeInTheDocument();
    expect(screen.getByText('Run My Real-Time Degree Audit')).toBeInTheDocument();
  });

  it('should render AdvisingDeskPage workbench with pending intervention metrics', () => {
    render(<AdvisingDeskPage />);
    expect(screen.getByText('Academic Advisor Review Workbench')).toBeInTheDocument();
    expect(screen.getByText('Critical Interventions Pending')).toBeInTheDocument();
    expect(screen.getByText('Sarah Khan')).toBeInTheDocument();
  });
});
