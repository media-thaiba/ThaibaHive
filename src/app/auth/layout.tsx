import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/query-provider";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark contents">
      <QueryProvider>
        <AuthProvider>{children}</AuthProvider>
      </QueryProvider>
    </div>
  );
}
