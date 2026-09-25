import React from 'react';
import { GreenCampusPortal } from '@/components/operations/eco/public/green-campus-portal';

export const metadata = {
  title: 'Sustainability & Net-Zero Campus | ThaibaHive',
  description: 'Real-time campus clean energy generation, microgrid power balance, and Scope 1/2/3 carbon reduction progress.',
};

export default function SustainabilityPublicPage() {
  return <GreenCampusPortal />;
}
