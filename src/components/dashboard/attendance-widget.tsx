import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

type AttendanceWidgetProps = {
  checkedIn: boolean;
  onClockOut: () => void;
  clockingOut: boolean;
};

export function AttendanceWidget({ checkedIn, onClockOut, clockingOut }: AttendanceWidgetProps) {
  return (
    <Card id="tour-attendance" className="border-muted shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/20 bg-muted/20">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <span>Shift Status</span>
          <span className={`h-2 w-2 rounded-full ${checkedIn ? "bg-success animate-pulse-subtle" : "bg-warning"}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Today&apos;s Attendance</p>
            <p className="text-sm font-semibold mt-0.5">
              {checkedIn ? "Checked In" : "Not Logged"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">General Shift</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">09:00 AM - 05:00 PM</p>
          </div>
        </div>

        {checkedIn ? (
          <Button
            onClick={onClockOut}
            disabled={clockingOut}
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2 font-medium py-5 rounded-lg"
          >
            <LogOut className="h-4 w-4" /> {clockingOut ? "Processing..." : "Clock Out"}
          </Button>
        ) : (
          <Link href="/attendance" className="block w-full">
            <Button className="w-full bg-success text-success-foreground hover:bg-success/90 gap-2 font-medium py-5 rounded-lg">
              <Clock className="h-4 w-4" /> Check In / Punch
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
