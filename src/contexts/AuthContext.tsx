"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { useRevocationListener } from "@/hooks/use-revocation-listener";

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
  isFirstLogin: boolean;
};

type AuthContextType = {
  staff: StaffUser | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
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

  // Listen for revocation events (auto-logout when session invalidated)
  useRevocationListener(staff?.id ?? null, () => {
    window.location.href = "/auth/login";
  });

  // fetch initial auth state - runs once on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStaff(data?.staff ?? null))
      .catch(() => setStaff(null))
      .finally(() => setIsLoading(false));
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setStaff((prev) => prev ? { ...prev, isFirstLogin: false } : null);
  }, []);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      window.location.href = "/";
    },
    []
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

      window.location.href = "/";
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/auth/login";
  }, []);

  return (
    <AuthContext.Provider
      value={{ staff, isLoading, login, signup, logout }}
    >
      {children}
      {staff?.isFirstLogin && (
        <OnboardingModal open={true} onComplete={handleOnboardingComplete} />
      )}
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
