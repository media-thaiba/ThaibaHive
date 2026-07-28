import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { primaryNav } from "@/config/navigation";

export function QuickLinks() {
  return (
    <Card id="tour-shortcuts" className="border-muted shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold">Quick Links</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-1">
        {primaryNav.filter((item) => item.href !== "/").slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between p-2 rounded-lg text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-medium text-xs truncate">{item.label}</span>
              </div>
              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
