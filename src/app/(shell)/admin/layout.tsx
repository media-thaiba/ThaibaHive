import Link from "next/link";
import { Settings, Building2, Layers, Clock, MapPin, Calendar, ClipboardCheck } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="w-56 border-r bg-card/50 p-4 hidden md:block">
        <div className="flex items-center gap-2 mb-5 px-2">
          <Settings className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Administration
          </h2>
        </div>
        <nav className="space-y-0.5">
          <AdminLink href="/admin/institutions" icon={<Building2 className="h-4 w-4" />}>
            Institutions
          </AdminLink>
          <AdminLink href="/admin/departments" icon={<Layers className="h-4 w-4" />}>
            Departments
          </AdminLink>
          <AdminLink href="/admin/sub-departments" icon={<Layers className="h-4 w-4" />}>
            Sub-departments
          </AdminLink>
          <AdminLink href="/admin/shifts" icon={<Clock className="h-4 w-4" />}>
            Shifts
          </AdminLink>
          <AdminLink href="/admin/attendance-locations" icon={<MapPin className="h-4 w-4" />}>
            Attendance Locations
          </AdminLink>

          <div className="my-3 border-t" />
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Leaves
          </p>
          <AdminLink href="/admin/leave-types" icon={<Calendar className="h-4 w-4" />}>
            Leave Types
          </AdminLink>
          <AdminLink href="/admin/leave-approvals" icon={<ClipboardCheck className="h-4 w-4" />}>
            Leave Approvals
          </AdminLink>

          <div className="my-3 border-t" />
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Checklists
          </p>
          <AdminLink href="/admin/checklists" icon={<ClipboardCheck className="h-4 w-4" />}>
            Templates
          </AdminLink>
          <AdminLink href="/admin/checklists/assignments" icon={<ClipboardCheck className="h-4 w-4" />}>
            Assignments
          </AdminLink>
        </nav>
      </aside>
      <main className="flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}

function AdminLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-150"
    >
      {icon}
      {children}
    </Link>
  );
}
