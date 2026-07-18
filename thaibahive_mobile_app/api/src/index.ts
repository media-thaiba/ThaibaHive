import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/auth";
import { attendanceRouter } from "./routes/attendance";
import { tasksRouter } from "./routes/tasks";
import { leavesRouter } from "./routes/leaves";
import { staffRouter } from "./routes/staff";
import { dashboardRouter } from "./routes/dashboard";
import { announcementsRouter } from "./routes/announcements";
import { eventsRouter } from "./routes/events";
import { circularsRouter } from "./routes/circulars";
import { pollsRouter } from "./routes/polls";
import { bookingsRouter } from "./routes/bookings";
import { helpDeskRouter } from "./routes/help-desk";
import { notificationsRouter } from "./routes/notifications";
import { recognitionRouter } from "./routes/recognition";
import { assetsRouter } from "./routes/assets";
import { expensesRouter } from "./routes/expenses";
import { purchasesRouter } from "./routes/purchases";
import { visitorsRouter } from "./routes/visitors";
import { grievancesRouter } from "./routes/grievances";
import { reportsRouter } from "./routes/reports";
import { approvalsRouter } from "./routes/approvals";
import { vehiclesRouter } from "./routes/vehicles";
import { canteenRouter } from "./routes/canteen";
import { settingsRouter } from "./routes/settings";
import { checklistsRouter } from "./routes/checklists";
import { timelineRouter } from "./routes/timeline";
import { availabilityRouter } from "./routes/availability";
import { accountsRouter } from "./routes/accounts";
import { adminRouter } from "./routes/admin";
import { uploadRouter } from "./routes/upload";

const app = express();
const PORT = parseInt(process.env.PORT || "4000", 10);

app.set("trust proxy", true); // Support proxy headers (Cloudflare + Nginx/Caddy)

app.use(helmet());

const isProd = process.env.NODE_ENV === "production";
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
  : isProd
    ? ["https://yourdomain.com"]
    : ["http://localhost:3000", "http://10.0.2.2:3000", "http://localhost:4000"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Request from origin "${origin}" rejected. Allowed origins: ${allowedOrigins.join(", ")}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/leaves", leavesRouter);
app.use("/api/staff", staffRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/circulars", circularsRouter);
app.use("/api/polls", pollsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/help-desk", helpDeskRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/recognition", recognitionRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/purchases", purchasesRouter);
app.use("/api/visitors", visitorsRouter);
app.use("/api/grievances", grievancesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/approvals", approvalsRouter);
app.use("/api/vehicles", vehiclesRouter);
app.use("/api/canteen", canteenRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/checklists", checklistsRouter);
app.use("/api/timeline", timelineRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/upload", uploadRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  const isProd = process.env.NODE_ENV === "production";
  res.status(500).json({
    error: isProd ? "Internal server error" : (err.message || "Internal server error"),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ThaibaHive API server running on port ${PORT}`);
  const routes: string[] = [];
  app._router?.stack.forEach((layer: any) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
      routes.push(`${methods} ${layer.route.path}`);
    } else if (layer.name === "router" && layer.handle?.stack) {
      const basePath = layer.regexp?.source?.replace(/\\\//g, "/")?.replace(/\^/g, "")?.replace(/\$/g, "")?.replace(/\(\?:\/\)\?/g, "") || "";
      layer.handle.stack.forEach((inner: any) => {
        if (inner.route) {
          const methods = Object.keys(inner.route.methods).join(",").toUpperCase();
          routes.push(`${methods} ${basePath}${inner.route.path}`);
        }
      });
    }
  });
  routes.sort().forEach((r) => console.log(`  ${r}`));
});
