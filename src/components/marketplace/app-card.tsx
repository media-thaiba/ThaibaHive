"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User, Clock, Calendar, CheckSquare, FileText, ThumbsUp, Bell, Users,
  HelpCircle, Coffee, DollarSign, Truck, Briefcase, ShoppingCart,
  Lock, Check, Loader2, Store,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  User, Clock, Calendar, CheckSquare, FileText, ThumbsUp, Bell, Users,
  HelpCircle, Coffee, DollarSign, Truck, Briefcase, ShoppingCart,
};

type AppCardProps = {
  app: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    category: string;
    status: "not_installed" | "installed" | "pending_request";
  };
  onInstall: (appId: string) => void;
  onRequestAccess: (appId: string) => void;
  isInstalling?: boolean;
};

export function AppCard({ app, onInstall, onRequestAccess, isInstalling }: AppCardProps) {
  const Icon = app.icon ? (iconMap[app.icon] ?? Store) : Store;
  const isRestricted = app.category === "restricted";

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      app.status === "installed" ? "border-success/20 bg-success/5" : ""
    }`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
            app.status === "installed"
              ? "bg-success/10 text-success"
              : isRestricted
                ? "bg-warning/10 text-warning"
                : "bg-primary/10 text-primary"
          }`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{app.name}</h3>
              {app.status === "installed" && (
                <Badge variant="outline" className="border-success/30 text-success text-xs">
                  <Check className="h-3 w-3 mr-1" /> Installed
                </Badge>
              )}
              {app.status === "pending_request" && (
                <Badge variant="outline" className="border-warning/30 text-warning text-xs">
                  Pending
                </Badge>
              )}
              {isRestricted && app.status === "not_installed" && (
                <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-xs">
                  <Lock className="h-3 w-3 mr-1" /> Restricted
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {app.description || `${app.name} module`}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          {app.status === "installed" ? (
            <Button variant="ghost" size="sm" disabled>
              <Check className="h-4 w-4 mr-1" /> Active
            </Button>
          ) : app.status === "pending_request" ? (
            <Button variant="ghost" size="sm" disabled>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Request Sent
            </Button>
          ) : isRestricted ? (
            <Button variant="outline" size="sm" onClick={() => onRequestAccess(app.id)}>
              <Lock className="h-4 w-4 mr-1" /> Request Access
            </Button>
          ) : (
            <Button size="sm" onClick={() => onInstall(app.id)} disabled={isInstalling}>
              {isInstalling ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : null}
              Install
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
