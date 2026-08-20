'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RoomBookingModal } from './room-booking-modal';
import { IndoorNavigationSheet } from './indoor-navigation-sheet';
import { Search, Navigation, Calendar, Users, Thermometer, Wind, Volume2, CheckCircle2 } from 'lucide-react';

export function SpaceDiscoveryCanvas() {
  const [searchQuery, setSearchQuery] = useState('');
  const [bookingSpace, setBookingSpace] = useState<any>(null);
  const [navSpace, setNavSpace] = useState<any>(null);
  const [bookedCodes, setBookedCodes] = useState<Set<string>>(new Set());

  const spaces = [
    {
      id: 'SPC-SEC-101',
      code: 'SEC-101',
      name: 'Robotics & AI Studio',
      facility: 'Science Complex',
      floorLevel: 1,
      capacity: 35,
      currentOccupancy: 12,
      comfortScore: 95,
      tempC: 22.1,
      co2Ppm: 460,
      noiseDb: 38,
      isAvailable: true,
      tags: ['Projector', 'Power Outlets', '3D Printers', 'Quiet'],
    },
    {
      id: 'SPC-SEC-102',
      code: 'SEC-102',
      name: 'Biotech Collaboration Pod',
      facility: 'Science Complex',
      floorLevel: 1,
      capacity: 15,
      currentOccupancy: 4,
      comfortScore: 92,
      tempC: 22.8,
      co2Ppm: 510,
      noiseDb: 42,
      isAvailable: true,
      tags: ['Whiteboard', 'Monitor Display', 'Fast WiFi'],
    },
    {
      id: 'SPC-SEC-202',
      code: 'SEC-202',
      name: 'Collaborative Seminar Lounge',
      facility: 'Science Complex',
      floorLevel: 2,
      capacity: 40,
      currentOccupancy: 28,
      comfortScore: 86,
      tempC: 23.4,
      co2Ppm: 680,
      noiseDb: 52,
      isAvailable: true,
      tags: ['Lounge Seating', 'Coffee Machine', 'Wheelchair Accessible'],
    },
  ];

  const filteredSpaces = spaces.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleBookingConfirm = (details: any) => {
    setBookedCodes((prev) => new Set([...prev, details.spaceCode]));
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search study spaces, labs, quiet rooms..."
            className="pl-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">Quiet Zones</Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">Labs & Equipment</Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-slate-200">Available Now</Badge>
        </div>
      </div>

      {/* Space Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredSpaces.map((space) => {
          const isReserved = bookedCodes.has(space.code);
          return (
            <Card key={space.id} className="border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">{space.name}</CardTitle>
                    <div className="text-xs text-slate-500 mt-0.5">{space.facility} • Floor {space.floorLevel}</div>
                  </div>
                  <Badge variant={isReserved ? 'info' : (space.isAvailable ? 'success' : 'warning')}>
                    {isReserved ? 'Reserved by You' : 'Available'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 text-xs pt-1">
                {/* Environmental Comfort Indicators */}
                <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Thermometer className="h-3 w-3 text-amber-500" /> {space.tempC}°C
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Wind className="h-3 w-3 text-teal-500" /> {space.co2Ppm} ppm
                  </div>
                  <div className="flex items-center gap-1 text-slate-600">
                    <Volume2 className="h-3 w-3 text-sky-500" /> {space.noiseDb} dB
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Occupancy: {space.currentOccupancy} / {space.capacity} seats
                  </span>
                  <span className="font-bold text-emerald-600">Score: {space.comfortScore}/100</span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {space.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs gap-1 h-8"
                    onClick={() => setNavSpace(space)}
                  >
                    <Navigation className="h-3 w-3" /> Navigate
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 text-xs gap-1 h-8"
                    disabled={isReserved}
                    onClick={() => setBookingSpace(space)}
                  >
                    {isReserved ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Booked
                      </>
                    ) : (
                      <>
                        <Calendar className="h-3 w-3" /> Book Room
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Booking Modal */}
      {bookingSpace && (
        <RoomBookingModal
          isOpen={!!bookingSpace}
          onClose={() => setBookingSpace(null)}
          spaceName={bookingSpace.name}
          spaceCode={bookingSpace.code}
          onConfirm={handleBookingConfirm}
        />
      )}

      {/* Indoor Navigation Sheet */}
      {navSpace && (
        <IndoorNavigationSheet
          isOpen={!!navSpace}
          onClose={() => setNavSpace(null)}
          targetSpaceName={navSpace.name}
          targetSpaceCode={navSpace.code}
        />
      )}
    </div>
  );
}
