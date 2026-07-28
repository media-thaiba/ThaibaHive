import Link from "next/link";
import { HelpCircle, Clock } from "lucide-react";

export function FocusLinks() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
      <Link href="/help-desk" className="group p-5 border rounded-xl bg-card hover:border-primary/20 shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info/10 text-info group-hover:bg-info group-hover:text-white transition-all duration-200 shrink-0">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">Help Desk</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Open a ticket for IT hardware, network, facilities or admin support.</p>
        </div>
      </Link>
      <Link href="/attendance" className="group p-5 border rounded-xl bg-card hover:border-primary/20 shadow-xs transition-all duration-200 hover:-translate-y-0.5 flex gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success group-hover:bg-success group-hover:text-white transition-all duration-200 shrink-0">
          <Clock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">Attendance Logs</h3>
          <p className="text-xs text-muted-foreground mt-0.5">View your direct punch timings, daily history, and monthly reports.</p>
        </div>
      </Link>
    </div>
  );
}
