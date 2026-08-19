import { db } from "@/db";
import { reportHistory } from "@thaiba/db/schema";
import { AnalyticsService } from "./analytics";
import { pdfFormatter } from "@/lib/export/pdf-formatter";
import { excelFormatter } from "@/lib/export/excel-formatter";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

export class ReportGeneratorService {
  static async generateReport(
    institutionId: string,
    type: "attendance" | "finance" | "academics",
    format: "pdf" | "excel",
    options: { startDate?: string; endDate?: string; classId?: string; scheduleId?: string } = {}
  ) {
    const today = new Date().toISOString().split("T")[0];
    const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = options.endDate || today;
    const classId = options.classId;

    let columns: any[] = [];
    const data: any[] = [];
    let title = "";

    // 1. Fetch data & define layout based on type
    if (type === "attendance") {
      title = "Attendance Analytics Report";
      const analytics = await AnalyticsService.getAttendance(institutionId, startDate, endDate);
      
      columns = [
        { header: "Department / Peak Date", key: "name", width: 30 },
        { header: "Value / Presence Rate (%)", key: "value", width: 20, align: "right" },
        { header: "Type", key: "type", width: 15 }
      ];

      // Format peaks & departments into rows
      data.push({ name: "Overall Student Presence Rate", value: `${analytics.rate}%`, type: "Metric Summary" });
      analytics.absenteeismPeaks.forEach(p => {
        data.push({ name: `Peak Absence: ${p.date}`, value: p.count, type: "Absenteeism Peak" });
      });
      analytics.departmentVariations.forEach(d => {
        data.push({ name: d.departmentName, value: `${d.rate}%`, type: "Department Variation" });
      });

    } else if (type === "finance") {
      title = "Financial Performance Report";
      const analytics = await AnalyticsService.getFinance(institutionId, startDate, endDate);

      columns = [
        { header: "Metric / Date", key: "name", width: 30 },
        { header: "Amount / Rate", key: "value", width: 20, align: "right" },
        { header: "Type", key: "type", width: 20 }
      ];

      data.push({ name: "Total Collections (Credit)", value: `INR ${analytics.collectionTotal.toFixed(2)}`, type: "Financial Summary" });
      data.push({ name: "Total Expenses (Debit)", value: `INR ${analytics.expenseTotal.toFixed(2)}`, type: "Financial Summary" });
      data.push({ name: "Realization Efficiency", value: `${analytics.collectionEfficiency}%`, type: "Financial Summary" });
      
      analytics.dailyCollections.forEach(c => {
        data.push({ name: c.date, value: `INR ${c.amount.toFixed(2)}`, type: "Daily Collection" });
      });

    } else if (type === "academics") {
      title = "Academic Grades & Performance Report";
      const analytics = await AnalyticsService.getAcademics(institutionId, classId);

      columns = [
        { header: "Subject / Class Name", key: "name", width: 35 },
        { header: "Average Score / GPA", key: "value", width: 20, align: "right" },
        { header: "Pass Rate", key: "passRate", width: 15, align: "right" },
        { header: "Type", key: "type", width: 20 }
      ];

      data.push({ name: "Overall Exam Pass Rate", value: `${analytics.passRate}%`, passRate: "", type: "Academics Summary" });
      
      analytics.subjectAverages.forEach(s => {
        data.push({ name: s.subjectName, value: `${s.averageMarks} / 100`, passRate: "", type: "Subject Average" });
      });

      analytics.classPerformance.forEach(c => {
        data.push({ name: c.className, value: `GPA ${c.averageGpa}`, passRate: `${c.passRate}%`, type: "Class Performance" });
      });
    }

    // 2. Format & Compile Document
    let exportType: any = type;
    if (type === "finance") exportType = "accounts";
    if (type === "academics") exportType = "tabulation";

    const exportOptions = {
      columns,
      data,
      type: exportType,
      format: (format === "excel" ? "xlsx" : "pdf") as any,
      title,
      institutionName: "Thaiba OS",
      dateFrom: startDate,
      dateTo: endDate,
    };

    let result;
    if (format === "pdf") {
      result = await pdfFormatter.generate(exportOptions);
    } else {
      result = await excelFormatter.generate(exportOptions);
    }

    // 3. Save buffer to exports directory
    const exportsDir = path.join(process.cwd(), "public", "exports");
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const uniqueFilename = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${format}`;
    const filePath = path.join(exportsDir, uniqueFilename);
    
    fs.writeFileSync(filePath, result.content);

    // Relative web-facing URL path
    const webPath = `/exports/${uniqueFilename}`;

    // 4. Save report history record
    const historyId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db
      .insert(reportHistory)
      .values({
        id: historyId,
        scheduleId: options.scheduleId || null,
        institutionId,
        filePath: webPath,
        format,
        status: "success",
        generatedAt: new Date().toISOString(),
        sizeBytes: result.content.length,
      })
      .run();

    const record = await db
      .select()
      .from(reportHistory)
      .where(eq(reportHistory.id, historyId))
      .get();

    return {
      record,
      filePath,
      webPath,
      buffer: result.content
    };
  }
}
