import {  } from "next/server";
import { db } from "@/db";
import { vehicles,  } from "@/db/schema";
import { requireAuth } from "@/lib/api/auth-guard";
import { csvFormatter } from "@/lib/export/csv-formatter";
import { excelFormatter } from "@/lib/export/excel-formatter";
import { pdfFormatter } from "@/lib/export/pdf-formatter";
import { ExportColumn } from "@/lib/export/types";

export const GET = requireAuth(async (request: Request) => {
  const url = new URL(request.url);
  const format = (url.searchParams.get("format") || "csv").toLowerCase();

  const data = await db
    .select({
      id: vehicles.id,
      registrationNumber: vehicles.registrationNumber,
      model: vehicles.model,
      type: vehicles.type,
      capacity: vehicles.capacity,
      fuelType: vehicles.fuelType,
      isActive: vehicles.isActive,
    })
    .from(vehicles)
    .all();

  const columns: ExportColumn[] = [
    { key: "registrationNumber", header: "Registration No." },
    { key: "model", header: "Vehicle Model" },
    { key: "type", header: "Type" },
    { key: "capacity", header: "Capacity" },
    { key: "fuelType", header: "Fuel Type" },
  ];

  if (format === "xlsx" || format === "excel") {
    const result = await excelFormatter.generate({ type: "fleet", format: "xlsx", title: "Campus Fleet Inventory Report", columns, data });
    return new Response(result.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="fleet-report.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const result = await pdfFormatter.generate({ type: "fleet", format: "pdf", title: "Campus Fleet Inventory Report", columns, data });
    return new Response(result.content as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="fleet-report.pdf"`,
      },
    });
  }

  const result = csvFormatter.generate({ type: "fleet", format: "csv", title: "Campus Fleet Inventory Report", columns, data });
  return new Response(result.content as string, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fleet-report.csv"`,
    },
  });

}, "vehicles:read");
