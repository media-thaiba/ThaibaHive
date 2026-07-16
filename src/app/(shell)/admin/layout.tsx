import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1">
      <aside className="w-56 border-r bg-muted/30 p-4">
        <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Administration
        </h2>
        <nav className="space-y-1">
          <Link
            href="/admin/institutions"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Institutions
          </Link>
          <Link
            href="/admin/departments"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Departments
          </Link>
          <Link
            href="/admin/sub-departments"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Sub-departments
          </Link>
          <Link
            href="/admin/shifts"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Shifts
          </Link>
          <Link
            href="/admin/attendance-locations"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Attendance Locations
          </Link>
          <div className="my-3 border-t" />
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Leaves
          </p>
          <Link
            href="/admin/leave-types"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Leave Types
          </Link>
          <Link
            href="/admin/leave-approvals"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Leave Approvals
          </Link>
          <div className="my-3 border-t" />
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Checklists
          </p>
          <Link
            href="/admin/checklists"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Templates
          </Link>
          <Link
            href="/admin/checklists/assignments"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Assignments
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
