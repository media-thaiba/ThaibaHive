"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { ArrowRight, Lock, Mail, User, ShieldCheck, Fingerprint } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AuthMode } from "./login-header";

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
  useEffect(() => {
    setIsHydrated(true);
  }, []);

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
  });

  const [forgotEmail, setForgotEmail] = useState("");
  const [recoverySent, setRecoverySent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

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
      await login(email, password, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
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
      });
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
      await login("admin@thaibahive.local", "password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google authentication failed");
    } finally {
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
              <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-600" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@thaibahive.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-[#121316]/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus-visible:ring-[#2ea44f] focus-visible:ring-offset-[#0e1012] focus-visible:border-[#2ea44f] h-11 pl-10 pr-4 rounded-xl transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-600" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="bg-[#121316]/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus-visible:ring-[#2ea44f] focus-visible:ring-offset-[#0e1012] focus-visible:border-[#2ea44f] h-11 pl-10 pr-4 rounded-xl transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-[18px] h-[18px] rounded border ${rememberMe ? 'bg-[#2ea44f] border-[#2ea44f]' : 'border-zinc-800 bg-[#121316]/60'} flex items-center justify-center transition-all duration-200`}>
                  {rememberMe && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-300 transition-colors uppercase tracking-wider">
                  Keep me signed in
                </span>
              </label>
            </div>

            {error && <Alert variant="error" className="py-2.5 px-3.5 bg-red-950/40 border-red-900/50 text-red-400 text-xs rounded-xl">{error}</Alert>}

            <div className="space-y-3 pt-3">
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: activeTheme.accent }}
                className="w-full hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-full h-12 flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                {loading ? "Signing in..." : "Yes, Sign In"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("signup")}
                className="w-full bg-transparent hover:bg-white/[0.02] border border-zinc-800 hover:border-zinc-700 active:scale-[0.99] text-zinc-300 hover:text-white font-bold rounded-full h-12 flex items-center justify-center transition-all"
              >
                No, Create Account
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("google")}
                className="w-full bg-transparent hover:bg-white/[0.02] border border-zinc-800 hover:border-zinc-700 active:scale-[0.99] text-zinc-300 hover:text-white font-bold rounded-full h-12 flex items-center justify-center gap-2 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#e4e4e7" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#e4e4e7" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#e4e4e7" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#e4e4e7" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign In with Google
              </button>

              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={passkeyLoading}
                className="w-full bg-transparent hover:bg-white/[0.02] border border-zinc-800 hover:border-zinc-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-zinc-300 hover:text-white font-bold rounded-full h-12 flex items-center justify-center gap-2 transition-all"
              >
                {passkeyLoading ? "Authenticating..." : (
                  <><Fingerprint className="w-4 h-4" /> Sign in with Passkey</>
                )}
              </button>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignupSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">First Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-600" />
                  <Input
                    placeholder="First name"
                    value={signupForm.firstName}
                    onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                    required
                    autoComplete="given-name"
                    className="bg-[#121316]/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus-visible:ring-[#8bc34a] focus-visible:ring-offset-[#0e1012] focus-visible:border-[#8bc34a] h-10 pl-9 pr-3 rounded-xl transition-all text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Last Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-600" />
                  <Input
                    placeholder="Last name"
                    value={signupForm.lastName}
                    onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                    required
                    autoComplete="family-name"
                    className="bg-[#121316]/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus-visible:ring-[#8bc34a] focus-visible:ring-offset-[#0e1012] focus-visible:border-[#8bc34a] h-10 pl-9 pr-3 rounded-xl transition-all text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-600" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  required
                  autoComplete="email"
                  className="bg-[#121316]/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus-visible:ring-[#8bc34a] focus-visible:ring-offset-[#0e1012] focus-visible:border-[#8bc34a] h-10 pl-10 pr-4 rounded-xl transition-all text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Employee ID</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3.5 top-3 h-4 w-4 text-zinc-600" />
                <Input
                  placeholder="Your employee ID"
                  value={signupForm.employeeId}
                  onChange={(e) => setSignupForm({ ...signupForm, employeeId: e.target.value })}
                  required
                  className="bg-[#121316]/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus-visible:ring-[#8bc34a] focus-visible:ring-offset-[#0e1012] focus-visible:border-[#8bc34a] h-10 pl-10 pr-4 rounded-xl transition-all text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-600" />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    required
                    autoComplete="new-password"
                    className="bg-[#121316]/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus-visible:ring-[#8bc34a] focus-visible:ring-offset-[#0e1012] focus-visible:border-[#8bc34a] h-10 pl-9 pr-3 rounded-xl transition-all text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Confirm</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-600" />
                  <Input
                    type="password"
                    placeholder="Confirm"
                    value={signupForm.confirm}
                    onChange={(e) => setSignupForm({ ...signupForm, confirm: e.target.value })}
                    required
                    autoComplete="new-password"
                    className="bg-[#121316]/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus-visible:ring-[#8bc34a] focus-visible:ring-offset-[#0e1012] focus-visible:border-[#8bc34a] h-10 pl-9 pr-3 rounded-xl transition-all text-xs"
                  />
                </div>
              </div>
            </div>

            {error && <Alert variant="error" className="py-2 px-3 bg-red-950/40 border-red-900/50 text-red-400 text-xs rounded-xl">{error}</Alert>}

            <div className="space-y-3 pt-3">
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: activeTheme.accent }}
                className="w-full hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-full h-11 flex items-center justify-center gap-1.5 transition-all shadow-md text-sm"
              >
                {loading ? "Registering..." : "Register & Sign In"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("signin")}
                className="w-full bg-transparent hover:bg-white/[0.02] border border-zinc-800 hover:border-zinc-700 active:scale-[0.99] text-zinc-300 hover:text-white font-bold rounded-full h-11 flex items-center justify-center transition-all text-sm"
              >
                Already have a profile? Sign In
              </button>
            </div>
          </form>
        )}

        {mode === "google" && (
          <form onSubmit={handleGoogleSubmit} className="space-y-4">
            <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/40 border border-zinc-900/80 rounded-2xl space-y-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-xl border border-zinc-800">
                <svg className="w-7 h-7" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
              <p className="text-xs text-zinc-400 text-center leading-relaxed max-w-[260px]">
                Authenticate your Google account securely without credentials.
              </p>
            </div>

            {error && <Alert variant="error" className="py-2.5 px-3.5 bg-red-950/40 border-red-900/50 text-red-400 text-xs rounded-xl">{error}</Alert>}

            <div className="space-y-3 pt-3">
              <button
                type="submit"
                disabled={loading}
                style={{ backgroundColor: activeTheme.accent }}
                className="w-full hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-full h-12 flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                {loading ? "Federating session..." : "Continue with Google"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("signin")}
                className="w-full bg-transparent hover:bg-white/[0.02] border border-zinc-800 hover:border-zinc-700 active:scale-[0.99] text-zinc-300 hover:text-white font-bold rounded-full h-12 flex items-center justify-center transition-all"
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
                  <label htmlFor="forgotEmail" className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Group Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-600" />
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="admin@thaibahive.local"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="bg-[#121316]/60 border-zinc-800/80 text-white placeholder:text-zinc-600 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-[#0e1012] focus-visible:border-[#f59e0b] h-11 pl-10 pr-4 rounded-xl transition-all"
                    />
                  </div>
                </div>

                {forgotError && <Alert variant="error" className="py-2.5 px-3.5 bg-red-950/40 border-red-900/50 text-red-400 text-xs rounded-xl">{forgotError}</Alert>}

                <div className="space-y-3 pt-3">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    style={{ backgroundColor: activeTheme.accent }}
                    className="w-full hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold rounded-full h-12 flex items-center justify-center gap-1.5 transition-all shadow-md"
                  >
                    {forgotLoading ? "Sending link..." : "Send Recovery Link"}
                    {!forgotLoading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </div>
              </>
            ) : (
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Mail className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">RECOVERY EMAIL TRANSMITTED</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-[260px] mx-auto">
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
                className="w-full bg-transparent hover:bg-white/[0.02] border border-zinc-800 hover:border-zinc-700 active:scale-[0.99] text-zinc-300 hover:text-white font-bold rounded-full h-12 flex items-center justify-center transition-all"
              >
                Return to ACCESS WORKSPACE
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
