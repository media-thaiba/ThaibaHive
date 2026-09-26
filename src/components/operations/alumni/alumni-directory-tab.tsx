'use client';

import React, { useState } from 'react';
import { AlumniProfileItem } from '@/lib/operations/alumni/types';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface AlumniDirectoryTabProps {
  profiles: AlumniProfileItem[];
  onRefresh?: () => void;
}

export function AlumniDirectoryTab({ profiles, onRefresh: _onRefresh }: AlumniDirectoryTabProps) {
  const [search, setSearch] = useState('');

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.currentCompany && p.currentCompany.toLowerCase().includes(q)) ||
      (p.currentDesignation && p.currentDesignation.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center justify-between gap-4">
        <Input
          placeholder="Search by name, company, designation, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="text-sm text-slate-500">
          Showing {filtered.length} of {profiles.length} alumni profiles
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((profile) => (
          <Card key={profile.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {profile.firstName} {profile.lastName}
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Batch of {profile.graduationBatchYear} • {profile.primaryDepartment}
                  </p>
                </div>
                <div className="flex gap-1">
                  {profile.isVerified && <Badge variant="success">Verified</Badge>}
                  {profile.isMentor && <Badge variant="info">Mentor</Badge>}
                  {profile.isHiring && <Badge variant="warning">Hiring</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <span className="font-medium text-slate-700">Role: </span>
                <span className="text-slate-600">
                  {profile.currentDesignation || 'Not specified'} {profile.currentCompany ? `@ ${profile.currentCompany}` : ''}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Location: </span>
                <span className="text-slate-600">{profile.currentCity || 'Global'}</span>
              </div>
              <div className="pt-2 flex justify-between items-center text-xs text-slate-400 border-t border-slate-100">
                <span>Privacy: {profile.privacyConsentLevel}</span>
                <span>Claimed: {profile.status}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          No alumni profiles match the current filter criteria.
        </div>
      )}
    </div>
  );
}
