"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type StaffUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  employeeId: string;
  phone: string | null;
  designation: string | null;
  avatarUrl: string | null;
};

type AuthContextType = {
  staff: StaffUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
};

type SignupData = {
  email: string;
  password: string;
  employeeId: string;
  firstName: string;
  lastName: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // fetch initial auth state - runs once on mount
  useState(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStaff(data?.staff ?? null))
      .catch(() => setStaff(null))
      .finally(() => setIsLoading(false));
  });

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      const data = await res.json();
      setStaff(data.staff);
      router.push("/");
    },
    [router]
  );

  const signup = useCallback(
    async (data: SignupData) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Signup failed");
      }

      const result = await res.json();
      setStaff(result.staff);
      router.push("/");
    },
    [router]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setStaff(null);
    router.push("/auth/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ staff, isLoading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
