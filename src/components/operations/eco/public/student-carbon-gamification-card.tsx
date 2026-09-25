'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Leaf, Flame, CheckCircle, Trophy, Sparkles } from 'lucide-react';

export function StudentCarbonGamificationCard() {
  const [points, setPoints] = useState(380);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>(['ch_01']);

  const challenges = [
    {
      id: 'ch_01',
      title: 'Green Commuter',
      description: 'Take the Campus Electric Shuttle or bike 3 times this week',
      rewardPoints: 100,
      carbonSavedKg: 4.5,
    },
    {
      id: 'ch_02',
      title: 'Off-Peak Study Hero',
      description: 'Book study rooms during peak solar generation hours (11:00 - 15:00)',
      rewardPoints: 120,
      carbonSavedKg: 6.2,
    },
    {
      id: 'ch_03',
      title: 'Zero Waste Champion',
      description: 'Log 5 reusable mug/container uses at campus dining halls',
      rewardPoints: 80,
      carbonSavedKg: 2.1,
    },
  ];

  const handleComplete = (id: string, reward: number) => {
    if (completedChallenges.includes(id)) return;
    setCompletedChallenges([...completedChallenges, id]);
    setPoints(points + reward);
  };

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900">Student Eco-Passport &amp; Carbon Wallet</CardTitle>
            <p className="text-xs text-slate-500">Earn Green Points for sustainable campus lifestyle choices</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-100/80 text-emerald-800 font-bold px-3 py-1.5 rounded-full text-xs">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          {points} Green Points
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Challenges */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Weekly Green Challenges</h4>
          <div className="space-y-2">
            {challenges.map((c) => {
              const isDone = completedChallenges.includes(c.id);
              return (
                <div
                  key={c.id}
                  className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                    isDone ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      {isDone && <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />}
                      {c.title}
                      <span className="text-[10px] text-emerald-700 font-medium">(-{c.carbonSavedKg} kg CO2e)</span>
                    </div>
                    <p className="text-[11px] text-slate-500">{c.description}</p>
                  </div>
                  <div>
                    {isDone ? (
                      <Badge variant="success">Completed</Badge>
                    ) : (
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleComplete(c.id, c.rewardPoints)}>
                        Claim +{c.rewardPoints}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earned Badges Showcase */}
        <div>
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Unlocked Eco-Badges</h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 bg-white border border-emerald-200 rounded-lg">
              <Leaf className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-800">Solar Pioneer</div>
              <div className="text-[9px] text-slate-400">Level 2</div>
            </div>
            <div className="p-2.5 bg-white border border-blue-200 rounded-lg">
              <Award className="h-6 w-6 text-blue-600 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-800">Clean Commuter</div>
              <div className="text-[9px] text-slate-400">50 km logged</div>
            </div>
            <div className="p-2.5 bg-white border border-amber-200 rounded-lg">
              <Flame className="h-6 w-6 text-amber-500 mx-auto mb-1" />
              <div className="text-[11px] font-bold text-slate-800">7-Day Streak</div>
              <div className="text-[9px] text-slate-400">Net-Zero Hero</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
