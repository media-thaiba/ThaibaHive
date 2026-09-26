import PDFDocument from "pdfkit";

export interface ReportCardStudentData {
  studentId: string;
  studentName: string;
  rollNumber: string;
  academicYear: string;
  term: string;
  institutionName?: string;
  examTitle: string;
  subjects: Array<{
    subjectName: string;
    marksObtained: number | null;
    maxMarks: number;
    passMarks: number;
    letterGrade: string;
    gpa: number;
    isAbsent?: boolean;
  }>;
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  gpa: number;
  letterGrade: string;
  resultStatus: string;
  rank?: number;
  password?: string;
}

export async function generateStudentReportCardPDF(
  data: ReportCardStudentData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: "A4",
        bufferPages: true,
        userPassword: data.password || undefined,
      });



      const buffers: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on("error", (err) => reject(err));

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // 1. Header Banner
      doc.rect(doc.page.margins.left, doc.page.margins.top, pageWidth, 50).fill("#0F172A");

      doc
        .fillColor("#FFFFFF")
        .fontSize(16)
        .font("Helvetica-Bold")
        .text((data.institutionName || "THAIBAHIVE ACADEMIC INSTITUTION").toUpperCase(), doc.page.margins.left + 12, doc.page.margins.top + 10, {
          width: pageWidth - 24,
          align: "center",
        });

      doc
        .fontSize(10)
        .font("Helvetica")
        .text("OFFICIAL ACADEMIC EVALUATION & REPORT CARD", doc.page.margins.left + 12, doc.page.margins.top + 30, {
          width: pageWidth - 24,
          align: "center",
        });

      doc.y = doc.page.margins.top + 60;

      // 2. Student Info Box
      doc.rect(doc.page.margins.left, doc.y, pageWidth, 55).strokeColor("#CBD5E1").stroke();
      const infoY = doc.y + 8;

      doc.fillColor("#0F172A").fontSize(10).font("Helvetica-Bold").text(`Candidate Name: ${data.studentName}`, doc.page.margins.left + 10, infoY);
      doc.fontSize(9).font("Helvetica").text(`Roll Number: ${data.rollNumber}`, doc.page.margins.left + 10, infoY + 16);
      doc.text(`Student ID: ${data.studentId}`, doc.page.margins.left + 10, infoY + 30);

      doc.fontSize(9).font("Helvetica-Bold").text(`Exam Session: ${data.examTitle}`, doc.page.margins.left + 300, infoY);
      doc.font("Helvetica").text(`Term / Year: ${data.term} (${data.academicYear})`, doc.page.margins.left + 300, infoY + 16);
      if (data.rank) {
        doc.text(`Class Rank: #${data.rank}`, doc.page.margins.left + 300, infoY + 30);
      }

      doc.y = infoY + 55;

      // 3. Subject Marks Table Header
      const tableY = doc.y;
      doc.rect(doc.page.margins.left, tableY, pageWidth, 20).fill("#F1F5F9");

      doc.fillColor("#334155").fontSize(9).font("Helvetica-Bold");
      doc.text("SUBJECT NAME", doc.page.margins.left + 8, tableY + 5, { width: 200 });
      doc.text("MARKS OBTAINED", doc.page.margins.left + 210, tableY + 5, { width: 90, align: "center" });
      doc.text("MAX MARKS", doc.page.margins.left + 300, tableY + 5, { width: 80, align: "center" });
      doc.text("GRADE", doc.page.margins.left + 385, tableY + 5, { width: 60, align: "center" });
      doc.text("GPA POINT", doc.page.margins.left + 450, tableY + 5, { width: 65, align: "center" });

      let currY = tableY + 22;

      // Rows
      doc.font("Helvetica").fontSize(9).fillColor("#0F172A");
      data.subjects.forEach((sub, idx) => {
        if (idx % 2 === 1) {
          doc.rect(doc.page.margins.left, currY - 2, pageWidth, 18).fill("#F8FAFC");
          doc.fillColor("#0F172A");
        }

        doc.text(sub.subjectName, doc.page.margins.left + 8, currY, { width: 200 });
        doc.text(sub.isAbsent ? "ABSENT" : `${sub.marksObtained ?? "-"}`, doc.page.margins.left + 210, currY, { width: 90, align: "center" });
        doc.text(`${sub.maxMarks}`, doc.page.margins.left + 300, currY, { width: 80, align: "center" });
        doc.text(sub.letterGrade, doc.page.margins.left + 385, currY, { width: 60, align: "center" });
        doc.text(`${sub.gpa.toFixed(1)}`, doc.page.margins.left + 450, currY, { width: 65, align: "center" });

        currY += 20;
      });

      // 4. Performance Summary Footer Box
      doc.y = currY + 15;
      doc.rect(doc.page.margins.left, doc.y, pageWidth, 50).fill("#F1F5F9");

      const sumY = doc.y + 10;
      doc.fillColor("#0F172A").fontSize(10).font("Helvetica-Bold");
      doc.text(`Grand Total: ${data.totalMarks} / ${data.totalMaxMarks}`, doc.page.margins.left + 15, sumY);
      doc.text(`Percentage Score: ${data.percentage.toFixed(1)}%`, doc.page.margins.left + 15, sumY + 18);

      doc.text(`Cumulative SGPA: ${data.gpa.toFixed(2)}`, doc.page.margins.left + 220, sumY);
      doc.text(`Overall Letter Grade: ${data.letterGrade}`, doc.page.margins.left + 220, sumY + 18);

      doc.fontSize(12).fillColor(data.resultStatus === "pass" ? "#16A34A" : "#DC2626");
      doc.text(`RESULT: ${data.resultStatus.toUpperCase()}`, doc.page.margins.left + 380, sumY + 8);

      // Signatures
      doc.y = sumY + 60;
      doc.fillColor("#64748B").fontSize(8).font("Helvetica");
      doc.text("_________________________", doc.page.margins.left + 20, doc.y);
      doc.text("Class Teacher Signature", doc.page.margins.left + 20, doc.y + 12);

      doc.text("_________________________", doc.page.margins.left + 380, doc.y);
      doc.text("Principal / Controller Seal", doc.page.margins.left + 380, doc.y + 12);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Streams batch report card PDF generation in chunks (max 50 students per chunk) to optimize memory.
 */
export async function batchGenerateReportCards(
  studentsData: ReportCardStudentData[],
  batchChunkSize: number = 50
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  for (let i = 0; i < studentsData.length; i += batchChunkSize) {
    const chunk = studentsData.slice(i, i + batchChunkSize);
    for (const student of chunk) {
      const pdfBuf = await generateStudentReportCardPDF(student);
      buffers.push(pdfBuf);
    }
  }
  return buffers;
}
