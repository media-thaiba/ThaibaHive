"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Award, Clock, FileCheck2, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export interface VendorPortalContract {
  id: string;
  contractCode: string;
  title: string;
  totalValueUsd: number;
  effectiveEndDate: string;
  status: string;
  milestones: {
    id: string;
    milestoneNumber: number;
    title: string;
    amountUsd: number;
    dueDate: string;
    status: string;
    evidenceUrl?: string;
  }[];
}

export function VendorPortalView({
  vendorName,
  vendorCode,
  esgRating,
  riskTier,
  contracts,
}: {
  vendorName: string;
  vendorCode: string;
  esgRating: string;
  riskTier: string;
  contracts: VendorPortalContract[];
}) {
  const [activeContracts, setActiveContracts] = useState(contracts);

  const handleSubmitDeliverable = (contractId: string, milestoneId: string) => {
    toast.success("Deliverable evidence uploaded and submitted for institution sign-off!");
  };

  return (
    <div className="space-y-6">
      {/* Vendor Profile Header Banner */}
      <Card className="border border-border/60 bg-gradient-to-r from-background via-card to-background">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold">{vendorName}</h2>
                <Badge variant="outline" className="font-mono">{vendorCode}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Authorized Institution Supplier • Verified Sanctions & Compliance Clean
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">ESG Rating</div>
                <Badge variant="success" className="font-bold text-sm">
                  {esgRating}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Risk Tier</div>
                <Badge variant="secondary" className="font-semibold text-xs capitalize">
                  {riskTier} Risk
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Contracts & Milestones */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-emerald-500" />
          Active Contracts & Milestone Deliverables
        </h3>

        {activeContracts.map((contract) => (
          <Card key={contract.id} className="border border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    {contract.title}
                    <span className="font-mono text-xs font-normal text-muted-foreground">({contract.contractCode})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Contract Value: ${contract.totalValueUsd.toLocaleString()} • Expires: {contract.effectiveEndDate}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="capitalize">{contract.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Milestone Deliverable</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.milestones.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.milestoneNumber}</TableCell>
                      <TableCell className="font-medium text-xs">{m.title}</TableCell>
                      <TableCell className="text-right font-mono text-xs">${m.amountUsd.toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.dueDate}</TableCell>
                      <TableCell>
                        {m.status === "approved" || m.status === "paid" ? (
                          <Badge variant="success" className="text-[10px]">Approved</Badge>
                        ) : m.status === "submitted" ? (
                          <Badge variant="info" className="text-[10px]">Under Review</Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs flex items-center gap-1"
                            onClick={() => handleSubmitDeliverable(contract.id, m.id)}
                          >
                            <Upload className="h-3 w-3" /> Submit Evidence
                          </Button>
                        )}
                        {m.evidenceUrl && (
                          <a
                            href={m.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
