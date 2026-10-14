"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { ensureArray } from "@/lib/utils";

interface SamlProvider {
  id: string;
  name: string;
  entityId: string;
  ssoUrl: string;
  x509Certificate?: string;
  isActive: boolean;
  createdAt: string;
}

interface OidcProvider {
  id: string;
  name: string;
  issuerUrl: string;
  clientId: string;
  scopes: string;
  usePkce: boolean;
  isActive: boolean;
  createdAt: string;
}

interface TestProbeResult {
  providerType: string;
  status: "reachable" | "unreachable" | "degraded";
  latencyMs: number;
  certExpiresAt?: string | null;
  certDaysRemaining?: number | null;
  message?: string;
}

export default function SsoAdminPage() {
  const [samlProviders, setSamlProviders] = useState<SamlProvider[]>([]);
  const [oidcProviders, setOidcProviders] = useState<OidcProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isSamlModalOpen, setIsSamlModalOpen] = useState(false);
  const [isOidcModalOpen, setIsOidcModalOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestProbeResult | null>(null);

  // Form states
  const [samlForm, setSamlForm] = useState({
    name: "",
    entityId: "",
    ssoUrl: "",
    x509Certificate: "",
  });

  const [oidcForm, setOidcForm] = useState({
    name: "",
    issuerUrl: "",
    clientId: "",
    clientSecret: "",
    scopes: "openid email profile",
  });

  const loadProviders = useCallback(() => {
    setLoading(true);
    fetch("/api/auth/sso/providers")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setSamlProviders(ensureArray(data.samlProviders));
        setOidcProviders(ensureArray(data.oidcProviders));
        setLoading(false);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load SSO providers");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleCreateSaml = async () => {
    try {
      const res = await fetch("/api/auth/sso/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SAML", ...samlForm }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create SAML provider");
      }
      setIsSamlModalOpen(false);
      setSamlForm({ name: "", entityId: "", ssoUrl: "", x509Certificate: "" });
      loadProviders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateOidc = async () => {
    try {
      const res = await fetch("/api/auth/sso/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "OIDC", ...oidcForm }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create OIDC provider");
      }
      setIsOidcModalOpen(false);
      setOidcForm({ name: "", issuerUrl: "", clientId: "", clientSecret: "", scopes: "openid email profile" });
      loadProviders();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const runTestProbe = async (providerType: "SAML" | "OIDC", providerId: string) => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/auth/sso/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerType, providerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Probe failed");
      setTestResult(data.diagnostic);
    } catch (err: any) {
      setTestResult({
        providerType,
        status: "unreachable",
        latencyMs: 0,
        message: err.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campus Identity & SSO Federation</h1>
          <p className="text-muted-foreground mt-1">
            Enterprise Single Sign-On (SAML 2.0 & OIDC) configuration, XML metadata export, and diagnostic probing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => window.open("/api/auth/saml/metadata", "_blank")}
          >
            Export SP Metadata XML
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <p>{error}</p>
        </Alert>
      )}

      {testResult && (
        <Card className="border-l-4 border-l-blue-600 bg-blue-50/20 dark:bg-blue-950/20">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-md font-semibold">Diagnostic Probe Result ({testResult.providerType})</CardTitle>
              <Badge variant={testResult.status === "reachable" ? "success" : "destructive"}>
                {testResult.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="py-2 text-sm space-y-1">
            <p><span className="font-medium">Latency:</span> {testResult.latencyMs}ms</p>
            {testResult.certExpiresAt && (
              <p>
                <span className="font-medium">Certificate Expiry:</span> {new Date(testResult.certExpiresAt).toLocaleDateString()} ({testResult.certDaysRemaining} days remaining)
              </p>
            )}
            {testResult.message && <p className="text-destructive font-medium">{testResult.message}</p>}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="saml" className="w-full">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="saml">SAML 2.0 Providers</TabsTrigger>
          <TabsTrigger value="oidc">OIDC / OAuth 2.0</TabsTrigger>
        </TabsList>

        {/* SAML Providers Tab */}
        <TabsContent value="saml" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">SAML 2.0 Identity Providers</h2>
              <p className="text-sm text-muted-foreground">Federate with Microsoft Entra ID, Google Workspace, Shibboleth, or Okta.</p>
            </div>
            <Button onClick={() => setIsSamlModalOpen(true)}>Add SAML Provider</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : samlProviders.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No SAML providers configured yet. Click &quot;Add SAML Provider&quot; to configure your first identity provider.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider Name</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>SSO URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {samlProviders.map((prov) => (
                      <TableRow key={prov.id}>
                        <TableCell className="font-medium">{prov.name}</TableCell>
                        <TableCell className="font-mono text-xs max-w-xs truncate">{prov.entityId}</TableCell>
                        <TableCell className="font-mono text-xs max-w-xs truncate">{prov.ssoUrl}</TableCell>
                        <TableCell>
                          <Badge variant={prov.isActive ? "success" : "secondary"}>
                            {prov.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isTesting}
                            onClick={() => runTestProbe("SAML", prov.id)}
                          >
                            Test Probe
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OIDC Providers Tab */}
        <TabsContent value="oidc" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">OIDC / OAuth 2.0 Providers</h2>
              <p className="text-sm text-muted-foreground">Configure RFC 7636 PKCE S256 protected OpenID Connect providers.</p>
            </div>
            <Button onClick={() => setIsOidcModalOpen(true)}>Add OIDC Provider</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : oidcProviders.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  No OIDC providers configured yet. Click &quot;Add OIDC Provider&quot; to connect Google, Apple, or Auth0.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Provider Name</TableHead>
                      <TableHead>Issuer URL</TableHead>
                      <TableHead>Client ID</TableHead>
                      <TableHead>PKCE S256</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {oidcProviders.map((prov) => (
                      <TableRow key={prov.id}>
                        <TableCell className="font-medium">{prov.name}</TableCell>
                        <TableCell className="font-mono text-xs max-w-xs truncate">{prov.issuerUrl}</TableCell>
                        <TableCell className="font-mono text-xs">{prov.clientId}</TableCell>
                        <TableCell>
                          <Badge variant="info">Enforced</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={prov.isActive ? "success" : "secondary"}>
                            {prov.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isTesting}
                            onClick={() => runTestProbe("OIDC", prov.id)}
                          >
                            Test Probe
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add SAML Modal */}
      <Dialog open={isSamlModalOpen} onOpenChange={setIsSamlModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register SAML 2.0 Identity Provider</DialogTitle>
            <DialogDescription>
              Configure an enterprise IdP. All assertions are canonicalized (Exclusive C14N) and verified against the provided X.509 certificate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="saml-name">Provider Name</Label>
              <Input
                id="saml-name"
                placeholder="e.g. Microsoft Entra ID"
                value={samlForm.name}
                onChange={(e) => setSamlForm({ ...samlForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="saml-entity">IdP Entity ID (Issuer)</Label>
              <Input
                id="saml-entity"
                placeholder="https://sts.windows.net/tenant-guid/"
                value={samlForm.entityId}
                onChange={(e) => setSamlForm({ ...samlForm, entityId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="saml-sso">Single Sign-On (SSO) URL</Label>
              <Input
                id="saml-sso"
                placeholder="https://login.microsoftonline.com/saml2"
                value={samlForm.ssoUrl}
                onChange={(e) => setSamlForm({ ...samlForm, ssoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="saml-cert">X.509 Public Certificate (Base64 / PEM)</Label>
              <Input
                id="saml-cert"
                placeholder="MIIDBTCCAe2gAwIBAgIQ..."
                value={samlForm.x509Certificate}
                onChange={(e) => setSamlForm({ ...samlForm, x509Certificate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSamlModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSaml} disabled={!samlForm.name || !samlForm.entityId || !samlForm.ssoUrl}>
              Register Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add OIDC Modal */}
      <Dialog open={isOidcModalOpen} onOpenChange={setIsOidcModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Register OpenID Connect Provider</DialogTitle>
            <DialogDescription>
              Configure an RFC 7636 PKCE S256 OIDC provider.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="oidc-name">Provider Name</Label>
              <Input
                id="oidc-name"
                placeholder="e.g. Google Workspace"
                value={oidcForm.name}
                onChange={(e) => setOidcForm({ ...oidcForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="oidc-issuer">Issuer URL (Discovery Endpoint)</Label>
              <Input
                id="oidc-issuer"
                placeholder="https://accounts.google.com"
                value={oidcForm.issuerUrl}
                onChange={(e) => setOidcForm({ ...oidcForm, issuerUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="oidc-client">Client ID</Label>
              <Input
                id="oidc-client"
                placeholder="client-id.apps.googleusercontent.com"
                value={oidcForm.clientId}
                onChange={(e) => setOidcForm({ ...oidcForm, clientId: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="oidc-secret">Client Secret (Optional if using Public PKCE)</Label>
              <Input
                id="oidc-secret"
                type="password"
                placeholder="••••••••••••"
                value={oidcForm.clientSecret}
                onChange={(e) => setOidcForm({ ...oidcForm, clientSecret: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOidcModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOidc} disabled={!oidcForm.name || !oidcForm.issuerUrl || !oidcForm.clientId}>
              Register Provider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
