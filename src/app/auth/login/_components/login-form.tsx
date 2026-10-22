"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ArrowRight, Lock, Mail, User, ShieldCheck, Fingerprint, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AuthMode } from "./login-header";
import { DeviceFingerprintCollector } from "@/components/auth/device-fingerprint-collector";
import { StepUpChallengeDialog } from "@/components/auth/stepup-challenge-dialog";
import { useDPoP } from "@/lib/hooks/use-dpop";
import type { DeviceFingerprint } from "@/lib/identity/device-fingerprint";

type LoginFormProps = {
  mode: AuthMode;
  handleModeChange: (mode: AuthMode) => void;
  activeTheme: {
    accent: string;
    borderClass: string;
    shadowClass: string;
    subtitle: string;
  };
};

export function LoginForm({ mode, handleModeChange, activeTheme }: LoginFormProps) {
  const { login, signup } = useAuth();
  const router = useRouter();

  const [isHydrated, setIsHydrated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [signupForm, setSignupForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    employeeId: "",
    password: "",
    confirm: "",
    invitationToken: "",
  });

  useEffect(() => {
    setIsHydrated(true);
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token") || params.get("invite");
    if (tokenParam) {
      setSignupForm((prev) => ({ ...prev, invitationToken: tokenParam }));
    }
  }, []);

  const [forgotEmail, setForgotEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);

  useEffect(() => {
    setError("");
    setForgotError("");
    setEmailNotVerified(false);
  }, [mode]);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [resendError, setResendError] = useState("");
  const [signupSent, setSignupSent] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
  const [stepUpState, setStepUpState] = useState<{
    isOpen: boolean;
    riskLevel: "low" | "medium" | "high" | "critical";
    challengeId?: string;
    challenge?: string;
    stepUpToken?: string;
    staffId?: string;
  }>({
    isOpen: false,
    riskLevel: "high",
  });
  const { attachDPoP } = useDPoP();

  const googleConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_IDS);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_IDS?.split(",")[0]?.trim() || "";
  const [googleInitialized, setGoogleInitialized] = useState(false);

  const handleCredentialResponse = useCallback(async (response: { credential: string }) => {
    const idToken = response.credential;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (res.ok) {
        router.push("/");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Google authentication failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google authentication failed");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!googleClientId || googleInitialized || typeof window === "undefined") return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if ((window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleCredentialResponse,
        });
        setGoogleInitialized(true);
      }
    };
    document.head.appendChild(script);
  }, [googleClientId, googleInitialized, handleCredentialResponse]);

  useEffect(() => {
    if (mode === "google" && googleInitialized && typeof window !== "undefined" && (window as any).google?.accounts?.id) {
      const container = document.getElementById("google-signin-btn");
      if (container) {
        container.innerHTML = "";
        (window as any).google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          width: 280,
          shape: "pill",
          text: "continue_with",
        });
      }
    }
  }, [mode, googleInitialized]);

  async function handlePasskeyLogin() {
    setPasskeyLoading(true);
    setError("");
    try {
      const beginRes = await fetch("/api/auth/webauthn/login/begin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!beginRes.ok) throw new Error("Failed to initiate passkey login");
      const options = await beginRes.json();
      options.challenge = Uint8Array.from(atob(options.challenge), (c) => c.charCodeAt(0)).buffer;
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials.map((cred: { id: string; type: string }) => ({
          ...cred,
          id: Uint8Array.from(atob(cred.id), (c) => c.charCodeAt(0)),
        }));
      }
      const assertion = await navigator.credentials.get({ publicKey: options }) as PublicKeyCredential | null;
      if (!assertion) throw new Error("No assertion returned");
      const response = assertion.response as AuthenticatorAssertionResponse;
      const completeRes = await fetch("/api/auth/webauthn/login/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: assertion.id,
          rawId: arrayBufferToBase64(assertion.rawId),
          response: {
            authenticatorData: arrayBufferToBase64(response.authenticatorData),
            signature: arrayBufferToBase64(response.signature),
            userHandle: response.userHandle
              ? arrayBufferToBase64(response.userHandle)
              : null,
            clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
          },
          type: "public-key",
        }),
      });
      if (!completeRes.ok) {
        const data = await completeRes.json();
        throw new Error(data.error || "Passkey verification failed");
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Passkey login failed");
    } finally {
      setPasskeyLoading(false);
    }
  }

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const dpopProof = await attachDPoP("/api/auth/login", "POST");
      const res = await login(email, password, rememberMe, {
        deviceFingerprint: fingerprint,
        dpopProof: dpopProof || undefined,
      });

      if (res?.stepUpRequired) {
        setStepUpState({
          isOpen: true,
          riskLevel: res.riskLevel || "high",
          challengeId: res.challengeId,
          challenge: res.challenge,
          stepUpToken: res.stepUpToken,
          staffId: res.staffId,
        });
      }
    } catch (err) {
      if (err instanceof Error && (err as Error & { code?: string }).code === "EMAIL_NOT_VERIFIED") {
        setEmailNotVerified(true);
      }
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    setResendError("");
    setResendState("sending");
    try {
      const res = await fetch("/api/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResendError(data.error || "Failed to resend verification email");
        return;
      }
      setResendState("sent");
    } catch {
      setResendError("An unexpected error occurred");
    } finally {
      setResendState((prev) => (prev === "sending" ? "idle" : prev));
    }
  }

  async function handleSignupSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (signupForm.password !== signupForm.confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await signup({
        firstName: signupForm.firstName,
        lastName: signupForm.lastName,
        email: signupForm.email,
        employeeId: signupForm.employeeId,
        password: signupForm.password,
        invitationToken: signupForm.invitationToken || undefined,
      });
      setSignupSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (!(window as any)?.google?.accounts?.id) {
        throw new Error("Google Identity Services not loaded");
      }
      (window as any).google.accounts.id.prompt();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google authentication failed");
      setLoading(false);
    }
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setForgotError(data.error || "Failed to send reset email");
        return;
      }
      setRecoverySent(true);
    } catch {
      setForgotError("An unexpected error occurred");
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        className="space-y-4 pt-1"
      >
        {mode === "signin" && (
          <form onSubmit={handleLoginSubmit} className="space-y-4" data-hydrated={isHydrated}>
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@thaibahive.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-11 pl-10 pr-4 rounded-xl transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-11 pl-10 pr-4 rounded-xl transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer group">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  aria-label="Keep me signed in"
                  className="sr-only"
                />
                <div aria-hidden="true" className={`w-[18px] h-[18px] rounded border ${rememberMe ? 'bg-primary border-primary' : 'border-border bg-background/80'} flex items-center justify-center transition-all duration-200`}>
                  {rememberMe && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Keep me signed in
                </span>
              </label>
            </div>

            {error && (
              <div aria-live="polite">
                <Alert variant="error" className="py-2.5 px-3.5 text-xs rounded-xl">{error}</Alert>
              </div>
            )}

            <div className="space-y-3 pt-3">
              <button
                type="submit"
                disabled={loading}
                aria-label="Sign in to your account"
                style={{ backgroundColor: activeTheme.accent }}
                className="w-full hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-full h-12 flex items-center justify-center gap-1.5 transition-all shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
              >
                {loading ? "Signing in..." : "Yes, Sign In"}
                {!loading && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("signup")}
                aria-label="Switch to account creation mode"
                className="w-full bg-transparent hover:bg-muted/60 border border-border hover:border-foreground/20 active:scale-[0.99] text-foreground hover:text-foreground font-bold rounded-full h-12 flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
              >
                No, Create Account
              </button>

              {googleConfigured && (
                <button
                  type="button"
                  onClick={() => handleModeChange("google")}
                  aria-label="Sign in with Google identity provider"
                  className="w-full bg-transparent hover:bg-muted/60 border border-border hover:border-foreground/20 active:scale-[0.99] text-foreground hover:text-foreground font-bold rounded-full h-12 flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign In with Google
                </button>
              )}

              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={passkeyLoading}
                aria-label="Sign in with WebAuthn Passkey"
                className="w-full bg-transparent hover:bg-muted/60 border border-border hover:border-foreground/20 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-foreground hover:text-foreground font-bold rounded-full h-12 flex items-center justify-center gap-2 transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
              >
                {passkeyLoading ? "Authenticating..." : (
                  <><Fingerprint className="w-4 h-4" aria-hidden="true" /> Sign in with Passkey</>
                )}
              </button>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <div className="space-y-3">
            {signupSent ? (
              <div role="status" aria-live="polite" className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                  <Mail className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">VERIFY YOUR EMAIL</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[280px] mx-auto">
                    Account created. We sent a verification link to{" "}
                    <span className="font-semibold text-foreground">{signupForm.email}</span>.
                    Click the link to activate your account, then sign in.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSignupSent(false);
                    handleModeChange("signin");
                  }}
                  aria-label="Return to sign in"
                  className="w-full bg-transparent hover:bg-muted/60 border border-border hover:border-foreground/20 active:scale-[0.99] text-foreground hover:text-foreground font-bold rounded-full h-11 flex items-center justify-center transition-all text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
          <form onSubmit={handleSignupSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="signup-firstName" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
                  <Input
                    id="signup-firstName"
                    placeholder="First name"
                    value={signupForm.firstName}
                    onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                    required
                    autoComplete="given-name"
                    className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-10 pl-9 pr-3 rounded-xl transition-all text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signup-lastName" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Last Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
                  <Input
                    id="signup-lastName"
                    placeholder="Last name"
                    value={signupForm.lastName}
                    onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                    required
                    autoComplete="family-name"
                    className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-10 pl-9 pr-3 rounded-xl transition-all text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  required
                  autoComplete="email"
                  className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-10 pl-10 pr-4 rounded-xl transition-all text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="signup-employeeId" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Employee ID
              </label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
                <Input
                  id="signup-employeeId"
                  placeholder="Your employee ID"
                  value={signupForm.employeeId}
                  onChange={(e) => setSignupForm({ ...signupForm, employeeId: e.target.value })}
                  required
                  className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-10 pl-10 pr-4 rounded-xl transition-all text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="signup-invitationToken" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Invitation Code / Token
                </label>
                <span className="text-[11px] text-muted-foreground">Institutional Access</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
                <Input
                  id="signup-invitationToken"
                  placeholder="Invitation code provided by admin"
                  value={signupForm.invitationToken}
                  onChange={(e) => setSignupForm({ ...signupForm, invitationToken: e.target.value })}
                  className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-10 pl-10 pr-4 rounded-xl transition-all text-xs"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Account creation requires an invitation code issued by your campus administrator.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                    autoComplete="new-password"
                    className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-10 pl-9 pr-3 rounded-xl transition-all text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signup-confirm" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="Confirm"
                    value={signupForm.confirm}
                    onChange={(e) => setSignupForm({ ...signupForm, confirm: e.target.value })}
                    required
                    autoComplete="new-password"
                    className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-10 pl-9 pr-3 rounded-xl transition-all text-xs"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div aria-live="polite">
                <Alert variant="error" className="py-2.5 px-3.5 text-xs rounded-xl">{error}</Alert>
              </div>
            )}

            {emailNotVerified && !error && (
              <div aria-live="polite">
                <Alert variant="warning" className="py-2.5 px-3.5 text-xs rounded-xl space-y-2">
                  <p>Email not verified. Check your inbox for the verification link.</p>
                  {resendState === "sent" ? (
                    <p className="font-semibold">Verification email sent. Check your inbox (and spam folder).</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendState === "sending" || !email}
                      className="font-semibold underline underline-offset-2 hover:opacity-80 disabled:opacity-50"
                    >
                      {resendState === "sending" ? "Sending..." : "Resend verification email"}
                    </button>
                  )}
                  {resendError && <p className="text-destructive">{resendError}</p>}
                </Alert>
              </div>
            )}

            <div className="space-y-3 pt-3">
              <button
                type="submit"
                disabled={loading}
                aria-label="Register account and sign in"
                style={{ backgroundColor: activeTheme.accent }}
                className="w-full hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-full h-11 flex items-center justify-center gap-1.5 transition-all shadow-md text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
              >
                {loading ? "Registering..." : "Register & Sign In"}
                {!loading && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("signin")}
                aria-label="Return to Sign In"
                className="w-full bg-transparent hover:bg-muted/60 border border-border hover:border-foreground/20 active:scale-[0.99] text-muted-foreground hover:text-foreground font-bold rounded-full h-11 flex items-center justify-center transition-all text-sm focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
              >
                Already have a profile? Sign In
              </button>
            </div>
          </form>
            )}
          </div>
        )}

        {mode === "google" && (
          <form onSubmit={handleGoogleSubmit} className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 bg-muted/40 border border-border rounded-2xl space-y-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-border">
                <svg className="w-7 h-7" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[260px]">
                Authenticate your Google account securely without credentials.
              </p>
              <div id="google-signin-btn" className="flex justify-center min-h-[44px] w-full" />
            </div>

            {error && (
              <div aria-live="polite">
                <Alert variant="error" className="py-2.5 px-3.5 text-xs rounded-xl">{error}</Alert>
              </div>
            )}

            <div className="space-y-3 pt-3">
              <button
                type="submit"
                disabled={loading}
                aria-label="Authenticate with Google federated credentials"
                style={{ backgroundColor: activeTheme.accent }}
                className="w-full hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-full h-12 flex items-center justify-center gap-1.5 transition-all shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
              >
                {loading ? "Federating session..." : "Continue with Google"}
                {!loading && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("signin")}
                aria-label="Back to local credentials login"
                className="w-full bg-transparent hover:bg-muted/60 border border-border hover:border-foreground/20 active:scale-[0.99] text-muted-foreground hover:text-foreground font-bold rounded-full h-12 flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
              >
                Back to local credentials
              </button>
            </div>
          </form>
        )}

        {mode === "forgot" && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            {!recoverySent ? (
              <>
                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Group Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" aria-hidden="true" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="admin@thaibahive.local"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="bg-background/80 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary h-11 pl-10 pr-4 rounded-xl transition-all"
                    />
                  </div>
                </div>

                {forgotError && (
                  <div aria-live="polite">
                    <Alert variant="error" className="py-2.5 px-3.5 text-xs rounded-xl">{forgotError}</Alert>
                  </div>
                )}

                <div className="space-y-3 pt-3">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    aria-label="Send password recovery reset link"
                    style={{ backgroundColor: activeTheme.accent }}
                    className="w-full hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-full h-12 flex items-center justify-center gap-1.5 transition-all shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
                  >
                    {forgotLoading ? "Sending link..." : "Send Recovery Link"}
                    {!forgotLoading && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
                  </button>
                </div>
              </>
            ) : (
              <div role="status" aria-live="polite" className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Mail className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">RECOVERY EMAIL TRANSMITTED</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px] mx-auto">
                    A secure node reset token has been dispatched. Please review your group inbox.
                  </p>
                </div>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setRecoverySent(false);
                  setForgotError("");
                  handleModeChange("signin");
                }}
                aria-label="Return to access workspace sign in"
                className="w-full bg-transparent hover:bg-muted/60 border border-border hover:border-foreground/20 active:scale-[0.99] text-muted-foreground hover:text-foreground font-bold rounded-full h-12 flex items-center justify-center transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
              >
                Return to ACCESS WORKSPACE
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </AnimatePresence>

    <DeviceFingerprintCollector onFingerprint={setFingerprint} />
    <StepUpChallengeDialog
      isOpen={stepUpState.isOpen}
      riskLevel={stepUpState.riskLevel}
      challengeId={stepUpState.challengeId}
      challenge={stepUpState.challenge}
      stepUpToken={stepUpState.stepUpToken}
      staffId={stepUpState.staffId}
      onSuccess={() => {
        setStepUpState((prev) => ({ ...prev, isOpen: false }));
        // Hard reload after login so every cached client state is rebuilt for the new session.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intentional full reload across the auth boundary
        window.location.href = "/";
      }}
      onFailure={() => {
        setStepUpState((prev) => ({ ...prev, isOpen: false }));
        setError("Step-up authentication failed. Please try again.");
      }}
    />
  </>
);
}
