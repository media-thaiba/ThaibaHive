'use client';

import React, { useState } from 'react';
import { AlumniDonationCampaignItem } from '@/lib/operations/alumni/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DonationCheckoutCardProps {
  campaign: AlumniDonationCampaignItem;
  onDonationSuccess?: () => void;
}

export function DonationCheckoutCard({ campaign, onDonationSuccess }: DonationCheckoutCardProps) {
  const [amount, setAmount] = useState<number>(5000);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPan, setDonorPan] = useState('');
  const [processing, setProcessing] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const handleDonate = async () => {
    try {
      setProcessing(true);
      const res = await fetch('/api/alumni/endowments/donate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId: campaign.institutionId || 'global',
          campaignId: campaign.id,
          donorName: donorName || 'Alumni Patron',
          donorEmail: donorEmail || 'donor@thaiba.edu',
          donorPanTaxId: donorPan || undefined,
          amount,
          currency: 'INR',
          paymentGateway: 'razorpay',
        }),
      });
      const data = await res.json();
      if (data.receipt?.pdfUrl) {
        setReceiptUrl(data.receipt.pdfUrl);
      }
      if (onDonationSuccess) onDonationSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{campaign.title}</CardTitle>
        <p className="text-xs text-slate-500">{campaign.category.replace('_', ' ')}</p>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <p className="text-xs text-slate-600 line-clamp-2">{campaign.description}</p>
        <div className="flex gap-2">
          {[1000, 5000, 25000, 100000].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(preset)}
              className={`px-3 py-1 rounded text-xs font-semibold border ${
                amount === preset
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              ₹{preset.toLocaleString()}
            </button>
          ))}
        </div>
        <Input
          type="number"
          placeholder="Custom Amount"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Full Name"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
          />
          <Input
            placeholder="Email"
            value={donorEmail}
            onChange={(e) => setDonorEmail(e.target.value)}
          />
        </div>
        <Input
          placeholder="PAN / Tax ID (for 80G Tax Exemption Certificate)"
          value={donorPan}
          onChange={(e) => setDonorPan(e.target.value)}
        />
        <Button className="w-full" onClick={handleDonate} disabled={processing}>
          {processing ? 'Processing Secure Donation...' : `Donate ₹${amount.toLocaleString()} (80G Tax Exempt)`}
        </Button>
        {receiptUrl && (
          <div className="p-2 bg-emerald-50 text-emerald-800 text-xs rounded border border-emerald-200 text-center font-medium">
            ✓ 80G Receipt Issued & GL Balanced!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
