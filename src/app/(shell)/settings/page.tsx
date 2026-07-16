"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { LogOut, Camera, Loader2, User, Shield, Bell } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { staff, logout } = useAuth();
  const [profile, setProfile] = useState({
    firstName: staff?.firstName || "",
    lastName: staff?.lastName || "",
    phone: staff?.phone || "",
    designation: staff?.designation || "",
  });
  const [passwords, setPasswords] = useState({ current: "", newPass: "", confirm: "" });
  const [profileMsg, setProfileMsg] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(staff?.avatarUrl || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");

  const [notifPrefs, setNotifPrefs] = useState({
    announcements: true,
    events: true,
    polls: true,
    circulars: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem("notification_preferences");
    if (saved) {
      try {
        setNotifPrefs(JSON.parse(saved));
      } catch {
        // Fallback
      }
    }
  }, []);

  const togglePreference = (key: keyof typeof notifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    localStorage.setItem("notification_preferences", JSON.stringify(updated));
    toast.success("Preferences updated");
  };

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(""); setSavingProfile(true);
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (res.ok) {
      setProfileMsg("Profile updated successfully.");
      setTimeout(() => window.location.reload(), 1500);
    } else {
      const d = await res.json();
      setProfileMsg(d.error || "Failed to update profile. Please try again.");
    }
    setSavingProfile(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPassMsg(""); setChangingPass(true);
    if (passwords.newPass !== passwords.confirm) {
      setPassMsg("Passwords do not match. Please check your new password.");
      setChangingPass(false);
      return;
    }
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.newPass }),
    });
    if (res.ok) {
      setPassMsg("Password changed successfully.");
      setPasswords({ current: "", newPass: "", confirm: "" });
    } else {
      const d = await res.json();
      setPassMsg(d.error || "Failed to change password. Please check your current password.");
    }
    setChangingPass(false);
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarMsg(""); setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload/avatar", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setAvatarUrl(data.url);
      setAvatarMsg("Avatar updated successfully.");
      setTimeout(() => window.location.reload(), 1500);
    } else {
      const d = await res.json();
      setAvatarMsg(d.error || "Failed to upload avatar.");
    }
    setUploadingAvatar(false);
    e.target.value = "";
  }

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-3xl">
      <div className="space-y-1 animate-slide-up">
        <h1 className="text-2xl font-bold tracking-tight">Profile & Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Picture */}
      <Card className="animate-slide-up">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-semibold ring-2 ring-primary/10">
                  {staff?.firstName?.[0]}{staff?.lastName?.[0]}
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg border-2 border-background"
              >
                <Camera className="h-4 w-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  className="sr-only"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Profile Picture</p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG up to 2MB. Recommended 256x256px.
              </p>
              {uploadingAvatar && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Uploading...
                </div>
              )}
              {avatarMsg && (
                <Alert variant={avatarMsg.includes("successfully") ? "success" : "error"} onDismiss={() => setAvatarMsg("")} className="text-xs">
                  {avatarMsg}
                </Alert>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Profile Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">First Name</label>
                <Input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Last Name</label>
                <Input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Designation</label>
                <Input value={profile.designation} onChange={(e) => setProfile({ ...profile, designation: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input value={staff?.email || ""} disabled className="text-muted-foreground bg-muted/50" />
            </div>
            {profileMsg && (
              <Alert variant={profileMsg.includes("successfully") ? "success" : "error"} onDismiss={() => setProfileMsg("")}>
                {profileMsg}
              </Alert>
            )}
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Change Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Current Password</label>
              <Input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} required autoComplete="current-password" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">New Password</label>
                <Input type="password" value={passwords.newPass} onChange={(e) => setPasswords({ ...passwords, newPass: e.target.value })} required autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Confirm New Password</label>
                <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required autoComplete="new-password" />
              </div>
            </div>
            {passMsg && (
              <Alert variant={passMsg.includes("successfully") ? "success" : "error"} onDismiss={() => setPassMsg("")}>
                {passMsg}
              </Alert>
            )}
            <Button type="submit" disabled={changingPass}>
              {changingPass ? "Changing..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="animate-slide-up">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Notification Preferences</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">Choose which notifications you wish to see in-app.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "announcements", label: "Announcements", desc: "Receive targeted official announcements." },
            { key: "events", label: "Events & Calendars", desc: "Receive alerts for department/institution events." },
            { key: "polls", label: "Surveys & Polls", desc: "Receive notifications to participate in voting." },
            { key: "circulars", label: "Circulars & Documents", desc: "Receive alerts when new files are shared." },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
              <div className="space-y-0.5 pr-3">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={notifPrefs[item.key as keyof typeof notifPrefs]}
                onClick={() => togglePreference(item.key as keyof typeof notifPrefs)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  notifPrefs[item.key as keyof typeof notifPrefs] ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform duration-200 ${
                    notifPrefs[item.key as keyof typeof notifPrefs] ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="animate-slide-up">
        <CardHeader>
          <CardTitle className="text-base">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between py-1">
            <span>Employee ID</span>
            <span className="font-medium text-foreground">{staff?.employeeId}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span>Role</span>
            <span className="font-medium text-foreground capitalize">{staff?.role?.replace("_", " ")}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span>Account ID</span>
            <span className="font-medium text-foreground font-mono text-xs">{staff?.id}</span>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <div className="animate-slide-up">
        <Button variant="outline" onClick={logout} className="text-destructive hover:text-destructive hover:bg-destructive/5 hover:border-destructive/20">
          <LogOut className="h-4 w-4 mr-1.5" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
