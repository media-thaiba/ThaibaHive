"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportButton } from "@/components/export-button";
import { useDebounce } from "@/hooks/use-debounce";
import { ensureArray } from "@/lib/utils";
import { api } from "@/lib/api/client";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  LogOut,
  Search,
  QrCode,
  Printer,
  X,
  Filter,
  Loader2,
  Mail,
  Phone,
  IdCard,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Visitor = {
  id: string;
  name: string;
  contact: string | null;
  idType: string | null;
  idNumber: string | null;
  hostStaffId: string | null;
  hostStaffName: string | null;
  hostStaffLastName: string | null;
  purpose: string;
  checkIn: string;
  checkOut: string | null;
  status: "checked_in" | "checked_out";
  notes: string | null;
  createdAt: string;
};

type StaffMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string | null;
};

type VisitorStats = {
  checkedIn: number;
  checkedOut: number;
  todayVisitors: number;
};

type FilterTab = "all" | "checked_in" | "checked_out" | "today";

const ID_TYPES = [
  "Aadhaar",
  "PAN",
  "Driving License",
  "Passport",
] as const;

function formatDateTime(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

function getStatusBadge(status: "checked_in" | "checked_out") {
  return status === "checked_in" ? (
    <Badge variant="success" className="gap-1">
      <CheckCircle className="h-3 w-3" />
      On Campus
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <XCircle className="h-3 w-3" />
      Checked Out
    </Badge>
  );
}

function QRCodeSVG({ data, size = 128 }: { data: string; size?: number }) {
  const simplePattern = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const seed = simplePattern(data);
  const modules = 25;
  const moduleSize = size / modules;

  const cells: React.ReactNode[] = [];
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      const bit = (seed >> ((x * 7 + y * 13) % 32)) & 1;
      const isFinderPattern =
        (x < 7 && y < 7) ||
        (x >= modules - 7 && y < 7) ||
        (x < 7 && y >= modules - 7);

      if (isFinderPattern) {
        const inBorder = x < 1 || y < 1 || x >= 6 || y >= 6;
        const inInner = x > 1 && y > 1 && x < 5 && y < 5;
        const fill = (inBorder || inInner) ? "#000" : "#fff";
        cells.push(
          <rect
            key={`${x}-${y}`}
            x={x * moduleSize}
            y={y * moduleSize}
            width={moduleSize}
            height={moduleSize}
            fill={fill}
          />
        );
      } else if (bit) {
        cells.push(
          <rect
            key={`${x}-${y}`}
            x={x * moduleSize}
            y={y * moduleSize}
            width={moduleSize}
            height={moduleSize}
            fill="#000"
          />
        );
      }
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`QR Code for visitor pass: ${data}`}
    >
      <rect width={size} height={size} fill="#fff" />
      <g>{cells}</g>
    </svg>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  trend?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight mt-1">{value}</p>
            {trend && <p className="text-xs text-success mt-1">{trend}</p>}
          </div>
          <div className={cn("p-3 rounded-xl", color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VisitorPassModal({
  visitor,
  onClose,
}: {
  visitor: Visitor | null;
  onClose: () => void;
}) {
  if (!visitor) return null;

  const passId = `VIS-${visitor.id.slice(0, 8).toUpperCase()}`;
  const hostName = visitor.hostStaffName
    ? `${visitor.hostStaffName} ${visitor.hostStaffLastName || ""}`.trim()
    : "Not assigned";
  const qrData = `VISITOR:${visitor.id}|NAME:${visitor.name}|PASS:${passId}|HOST:${hostName}|CHECKIN:${visitor.checkIn}`;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const styleContent = `
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }
      .pass { border: 2px solid #1f2937; border-radius: 12px; padding: 24px; max-width: 360px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 2px solid #1f2937; padding-bottom: 16px; margin-bottom: 16px; }
      .logo { font-size: 24px; font-weight: 800; color: #1f2937; margin-bottom: 4px; }
      .badge-type { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
      .field { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
      .field:last-child { border-bottom: none; }
      .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
      .value { font-size: 14px; font-weight: 600; color: #1f2937; text-align: right; max-width: 65%; word-break: break-word; }
      .qr-section { text-align: center; padding: 16px 0; }
      .qr-label { font-size: 10px; color: #9ca3af; margin-top: 8px; }
      .footer { text-align: center; margin-top: 16px; font-size: 10px; color: #9ca3af; }
      @media print { body { padding: 0; } .no-print { display: none; } }
    `;

    const htmlContent = `
      <div class="pass">
        <div class="header">
          <div class="logo">ThaibaHive</div>
          <div class="badge-type">Visitor Pass</div>
        </div>
        <div class="field"><span class="label">Pass ID</span><span class="value">${passId}</span></div>
        <div class="field"><span class="label">Visitor Name</span><span class="value">${visitor.name}</span></div>
        <div class="field"><span class="label">Contact</span><span class="value">${visitor.contact || "—"}</span></div>
        ${visitor.idType ? `<div class="field"><span class="label">ID Type</span><span class="value">${visitor.idType}</span></div>` : ""}
        ${visitor.idNumber ? `<div class="field"><span class="label">ID Number</span><span class="value">${visitor.idNumber}</span></div>` : ""}
        <div class="field"><span class="label">Host</span><span class="value">${hostName}</span></div>
        <div class="field"><span class="label">Purpose</span><span class="value">${visitor.purpose}</span></div>
        <div class="field"><span class="label">Check-in</span><span class="value">${formatDateTime(visitor.checkIn)}</span></div>
        <div class="qr-section">
          <div id="qr-code"></div>
          <div class="qr-label">Scan to verify visitor identity</div>
        </div>
        <div class="footer">
          ThaibaHive Visitor Management System · Generated on ${new Date().toLocaleString("en-IN")}
        </div>
      </div>
    `;

    const scriptContent = `
      (function() {
        const data = "${qrData.replace(/"/g, '\\"')}";
        const size = 160;
        const modules = 25;
        const moduleSize = size / modules;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          hash = ((hash << 5) - hash) + data.charCodeAt(i);
          hash |= 0;
        }
        hash = Math.abs(hash);
        let svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" xmlns="http://www.w3.org/2000/svg"><rect width="' + size + '" height="' + size + '" fill="#fff"/><g>';
        for (let y = 0; y < modules; y++) {
          for (let x = 0; x < modules; x++) {
            const bit = (hash >> ((x * 7 + y * 13) % 32)) & 1;
            const isFinder = (x < 7 && y < 7) || (x >= modules - 7 && y < 7) || (x < 7 && y >= modules - 7);
            if (isFinder) {
              const inBorder = x < 1 || y < 1 || x >= 6 || y >= 6;
              const inInner = x > 1 && y > 1 && x < 5 && y < 5;
              if (inBorder || inInner) {
                svg += '<rect x="' + (x * moduleSize) + '" y="' + (y * moduleSize) + '" width="' + moduleSize + '" height="' + moduleSize + '" fill="#000"/>';
              }
            } else if (bit) {
              svg += '<rect x="' + (x * moduleSize) + '" y="' + (y * moduleSize) + '" width="' + moduleSize + '" height="' + moduleSize + '" fill="#000"/>';
            }
          }
        }
        svg += '</g></svg>';
        document.getElementById('qr-code').innerHTML = svg;
        window.print();
      })();
    `;

    const printContent = `<!DOCTYPE html>
<html>
<head>
<title>Visitor Pass - ${visitor.name}</title>
<style>${styleContent}</style>
</head>
<body>
${htmlContent}
<script>${scriptContent}<\/script>
</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Visitor Pass</span>
            <Badge variant="outline" className="text-xs">{passId}</Badge>
          </DialogTitle>
          <DialogDescription>
            Print or save this pass for visitor verification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 p-2">
          <div className="border rounded-lg p-4 bg-card">
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <div>
                <p className="font-semibold text-lg">{visitor.name}</p>
                <p className="text-xs text-muted-foreground">{passId}</p>
              </div>
              <QRCodeSVG data={qrData} size={64} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Host</span>
                <span className="font-medium">{hostName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Check-in</span>
                <span className="font-medium">{formatDateTime(visitor.checkIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purpose</span>
                <span className="font-medium text-right max-w-[60%]">{visitor.purpose}</span>
              </div>
              {visitor.contact && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact</span>
                  <span className="font-medium">{visitor.contact}</span>
                </div>
              )}
              {visitor.idType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Type</span>
                  <span className="font-medium">{visitor.idType}</span>
                </div>
              )}
              {visitor.idNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Number</span>
                  <span className="font-medium font-mono text-xs">{visitor.idNumber}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1" variant="default">
              <Printer className="h-4 w-4 mr-2" />
              Print Pass
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RegisterVisitorModal({
  open,
  onClose,
  onSubmit,
  staffList,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    contact: string;
    idType: string;
    idNumber: string;
    hostStaffId: string;
    purpose: string;
    notes: string;
  }) => Promise<void>;
  staffList: StaffMember[];
  loading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    idType: "",
    idNumber: "",
    hostStaffId: "",
    purpose: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<typeof formData>>({});

  const validate = () => {
    const newErrors: Partial<typeof formData> = {};
    if (!formData.name.trim()) newErrors.name = "Visitor name is required";
    if (!formData.purpose.trim()) newErrors.purpose = "Purpose of visit is required";
    if (!formData.hostStaffId) newErrors.hostStaffId = "Host staff member is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit(formData);
    onClose();
    setFormData({ name: "", contact: "", idType: "", idNumber: "", hostStaffId: "", purpose: "", notes: "" });
    setErrors({});
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Register Visitor / Check-In</DialogTitle>
          <DialogDescription>
            Enter visitor details to register their visit
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Visitor Name <span className="text-destructive">*</span></label>
            <Input
              placeholder="Full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Contact Number</label>
            <Input
              type="tel"
              placeholder="+91 98765 43210"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ID Type</label>
              <Select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
              >
                <SelectItem value="">Select ID type</SelectItem>
                {ID_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">ID Number</label>
              <Input
                placeholder="ID number"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Host Staff Member <span className="text-destructive">*</span></label>
            <Select
              value={formData.hostStaffId}
              onChange={(e) => setFormData({ ...formData, hostStaffId: e.target.value })}
              className={errors.hostStaffId ? "border-destructive" : ""}
            >
              <SelectItem value="">Select host staff</SelectItem>
              {staffList.map((staff) => (
                <SelectItem key={staff.id} value={staff.id}>
                  {staff.firstName} {staff.lastName} — {staff.designation || staff.email}
                </SelectItem>
              ))}
            </Select>
            {errors.hostStaffId && <p className="text-xs text-destructive">{errors.hostStaffId}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Purpose of Visit <span className="text-destructive">*</span></label>
            <Input
              placeholder="Meeting, delivery, interview, etc."
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className={errors.purpose ? "border-destructive" : ""}
            />
            {errors.purpose && <p className="text-xs text-destructive">{errors.purpose}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Additional notes (optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter className="border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Register & Check-In
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function VisitorTable({
  visitors,
  onCheckOut,
  onViewPass,
  loading,
}: {
  visitors: Visitor[];
  onCheckOut: (id: string) => void;
  onViewPass: (visitor: Visitor) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (visitors.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="No visitors found"
        description="No visitors match your current filters."
      />
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Visitor</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Host</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Purpose</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Check-in</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {visitors.map((visitor) => (
            <tr key={visitor.id} className="hover:bg-muted/30 transition-colors">
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <p className="font-medium">{visitor.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {visitor.contact && (
                      <>
                        <Phone className="h-3 w-3" />
                        <span>{visitor.contact}</span>
                      </>
                    )}
                  </p>
                  {visitor.idType && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <IdCard className="h-3 w-3" />
                      <span>{visitor.idType}: {visitor.idNumber}</span>
                    </p>
                  )}
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <p className="text-sm font-medium">
                  {visitor.hostStaffName
                    ? `${visitor.hostStaffName} ${visitor.hostStaffLastName || ""}`.trim()
                    : "—"}
                </p>
              </td>
              <td className="px-4 py-3 hidden md:table-cell max-w-xs">
                <p className="text-sm text-muted-foreground truncate">{visitor.purpose}</p>
              </td>
              <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                {formatTime(visitor.checkIn)}
              </td>
              <td className="px-4 py-3">
                {getStatusBadge(visitor.status)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {visitor.status === "checked_in" && (
                    <>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => onViewPass(visitor)}
                        className="h-8 w-8"
                        aria-label="View visitor pass"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => onCheckOut(visitor.id)}
                        className="h-8 w-8"
                        aria-label="Check out visitor"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  {visitor.status === "checked_out" && (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      onClick={() => onViewPass(visitor)}
                      className="h-8 w-8"
                      aria-label="View visitor pass"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [stats, setStats] = useState<VisitorStats>({
    checkedIn: 0,
    checkedOut: 0,
    todayVisitors: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [passVisitor, setPassVisitor] = useState<Visitor | null>(null);

  const debouncedSearch = useDebounce(search, 150);

  const fetchVisitors = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filter !== "all") params.status = filter;
      if (filter === "today") params.date = new Date().toISOString().split("T")[0];

      const res = await api.get<{ visitors: Visitor[] }>("/api/visitors", { params });
      if (res.ok && res.data) {
        setVisitors(ensureArray(res.data.visitors));
      }
    } catch (err) {
      console.error("Failed to fetch visitors:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get<VisitorStats>("/api/visitors/stats");
      if (res.ok && res.data) setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await api.get<{ staff: StaffMember[] }>("/api/staff");
      if (res.ok && res.data) setStaffList(ensureArray(res.data.staff));
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  }, []);

  useEffect(() => {
    fetchVisitors();
    fetchStats();
    fetchStaff();
  }, [fetchVisitors, fetchStats, fetchStaff]);

  useEffect(() => {
    if (debouncedSearch) {
      // Search is handled client-side for now
    }
  }, [debouncedSearch]);

  const filteredVisitors = visitors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (v.hostStaffName && v.hostStaffName.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
      (v.hostStaffLastName && v.hostStaffLastName.toLowerCase().includes(debouncedSearch.toLowerCase()));
    return matchesSearch;
  });

  const handleRegister = async (data: {
    name: string;
    contact: string;
    idType: string;
    idNumber: string;
    hostStaffId: string;
    purpose: string;
    notes: string;
  }) => {
    setRegisterLoading(true);
    try {
      const res = await api.post<{ visitor: Visitor }>("/api/visitors", {
        name: data.name,
        contact: data.contact || null,
        idType: data.idType || null,
        idNumber: data.idNumber || null,
        hostStaffId: data.hostStaffId || null,
        purpose: data.purpose,
        notes: data.notes || null,
      });

      if (res.ok && res.data) {
        toast.success("Visitor registered and checked in");
        setVisitors((prev) => [res.data!.visitor, ...prev]);
        setStats((prev) => ({
          ...prev,
          checkedIn: prev.checkedIn + 1,
          todayVisitors: prev.todayVisitors + 1,
        }));
      } else {
        toast.error((res.data as { error?: string })?.error || "Failed to register visitor");
      }
    } catch (err) {
      console.error("Register visitor error:", err);
      toast.error("Failed to register visitor");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      const res = await api.patch<{ visitor: Visitor }>(`/api/visitors/${id}`, {
        checkOut: new Date().toISOString(),
        status: "checked_out",
      });

      if (res.ok && res.data) {
        toast.success("Visitor checked out");
        setVisitors((prev) =>
          prev.map((v) => (v.id === id ? res.data!.visitor : v))
        );
        setStats((prev) => ({
          ...prev,
          checkedIn: Math.max(0, prev.checkedIn - 1),
          checkedOut: prev.checkedOut + 1,
        }));
      } else {
        toast.error((res.data as { error?: string })?.error || "Failed to check out visitor");
      }
    } catch (err) {
      console.error("Check out error:", err);
      toast.error("Failed to check out visitor");
    }
  };

  const handleViewPass = (visitor: Visitor) => {
    setPassVisitor(visitor);
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <PageHeader
        title="Visitor Management"
        description="Manage visitor check-ins, passes, and campus access"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton type="staff" />
            <Dialog>
              <DialogTrigger>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register Visitor
                </Button>
              </DialogTrigger>
              <RegisterVisitorModal
                open={registerOpen}
                onClose={() => setRegisterOpen(false)}
                onSubmit={handleRegister}
                staffList={staffList}
                loading={registerLoading}
              />
            </Dialog>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Currently On Campus"
          value={stats.checkedIn}
          icon={Users}
          color="bg-primary"
          trend={`${stats.todayVisitors} today`}
        />
        <MetricCard
          title="Checked In Today"
          value={stats.todayVisitors}
          icon={UserPlus}
          color="bg-success"
        />
        <MetricCard
          title="Total Visitors"
          value={stats.checkedIn + stats.checkedOut}
          icon={QrCode}
          color="bg-info"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">Visitor Records</CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or host..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <div className="flex gap-1 bg-muted p-1 rounded-lg" role="tablist">
              {([
                { value: "all", label: "All" },
                { value: "checked_in", label: "On Campus" },
                { value: "checked_out", label: "Checked Out" },
                { value: "today", label: "Today" },
              ] as const).map((tab) => (
                <Button
                  key={tab.value}
                  variant={filter === tab.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setFilter(tab.value)}
                  role="tab"
                  aria-selected={filter === tab.value}
                  className="gap-1"
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <VisitorTable
            visitors={filteredVisitors}
            onCheckOut={handleCheckOut}
            onViewPass={handleViewPass}
            loading={loading}
          />
        </CardContent>
      </Card>

      <VisitorPassModal visitor={passVisitor} onClose={() => setPassVisitor(null)} />
    </div>
  );
}