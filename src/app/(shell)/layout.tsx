import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/query-provider";
import { ShellNav } from "@/components/layout/shell-nav";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <div className="flex min-h-screen flex-col">
          <header className="border-b">
            <div className="flex h-14 items-center gap-6 px-4">
              <span className="font-semibold">ThaibaHive</span>
              <ShellNav />
            </div>
          </header>
          <main className="flex flex-1">{children}</main>
        </div>
      </AuthProvider>
    </QueryProvider>
  );
}
