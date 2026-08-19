'use client';

import React from 'react';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <div className="workspace-layout-root">{children}</div>;
}
