import { ExportDatasetRequest, ExportStreamResult, ColumnDefinition } from './export-types';
import { StreamTransformers } from './stream-transformers';

export class UniversalExportEngine {
  private static instance: UniversalExportEngine;

  public static getInstance(): UniversalExportEngine {
    if (!UniversalExportEngine.instance) {
      UniversalExportEngine.instance = new UniversalExportEngine();
    }
    return UniversalExportEngine.instance;
  }

  public getDefaultColumns(jobType: string): ColumnDefinition[] {
    switch (jobType) {
      case 'students':
        return [
          { key: 'rollNumber', label: 'Roll Number' },
          { key: 'name', label: 'Full Name' },
          { key: 'className', label: 'Class / Grade' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone', transform: 'mask' },
          { key: 'guardianName', label: 'Guardian' },
          { key: 'status', label: 'Status', transform: 'uppercase' },
        ];
      case 'timetables':
        return [
          { key: 'dayOfWeek', label: 'Day' },
          { key: 'slotName', label: 'Slot' },
          { key: 'startTime', label: 'Start Time' },
          { key: 'endTime', label: 'End Time' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'teacherName', label: 'Teacher' },
          { key: 'roomNumber', label: 'Room' },
        ];
      case 'attendance':
        return [
          { key: 'date', label: 'Date', transform: 'date' },
          { key: 'studentName', label: 'Student Name' },
          { key: 'rollNumber', label: 'Roll Number' },
          { key: 'className', label: 'Class' },
          { key: 'status', label: 'Status', transform: 'uppercase' },
          { key: 'remarks', label: 'Remarks' },
        ];
      case 'grades':
        return [
          { key: 'rollNumber', label: 'Roll Number' },
          { key: 'studentName', label: 'Student Name' },
          { key: 'examName', label: 'Exam' },
          { key: 'subjectName', label: 'Subject' },
          { key: 'maxMarks', label: 'Max Marks', transform: 'number' },
          { key: 'marksObtained', label: 'Marks Obtained', transform: 'number' },
          { key: 'gradeLetter', label: 'Grade' },
        ];
      case 'finances':
        return [
          { key: 'receiptNumber', label: 'Receipt No' },
          { key: 'studentName', label: 'Student Name' },
          { key: 'feeCategory', label: 'Category' },
          { key: 'amount', label: 'Amount (USD)', transform: 'currency' },
          { key: 'paymentMethod', label: 'Payment Method', transform: 'uppercase' },
          { key: 'date', label: 'Payment Date', transform: 'date' },
          { key: 'status', label: 'Status', transform: 'uppercase' },
        ];
      default:
        return [
          { key: 'id', label: 'ID' },
          { key: 'title', label: 'Title' },
          { key: 'createdAt', label: 'Created At', transform: 'date' },
        ];
    }
  }

  public async exportDataset(request: ExportDatasetRequest): Promise<ExportStreamResult> {
    const rows = request.data || [];
    const columns = request.columns && request.columns.length > 0
      ? request.columns
      : this.getDefaultColumns(request.jobType);

    const baseName = request.fileName || `${request.jobType}_export_${Date.now()}`;

    switch (request.format) {
      case 'csv': {
        const csvContent = StreamTransformers.toCsv(rows, columns);
        return {
          mimeType: 'text/csv; charset=utf-8',
          fileName: `${baseName}.csv`,
          content: csvContent,
          recordCount: rows.length,
          fileSizeBytes: Buffer.byteLength(csvContent, 'utf8'),
        };
      }
      case 'json': {
        const jsonContent = StreamTransformers.toJson(rows, columns);
        return {
          mimeType: 'application/json; charset=utf-8',
          fileName: `${baseName}.json`,
          content: jsonContent,
          recordCount: rows.length,
          fileSizeBytes: Buffer.byteLength(jsonContent, 'utf8'),
        };
      }
      case 'xlsx': {
        // Generates CSV representation with excel mime type for clean spreadsheet compatibility
        const csvContent = StreamTransformers.toCsv(rows, columns);
        return {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileName: `${baseName}.xlsx`,
          content: Buffer.from(csvContent, 'utf8'),
          recordCount: rows.length,
          fileSizeBytes: Buffer.byteLength(csvContent, 'utf8'),
        };
      }
      case 'pdf':
      default: {
        const htmlContent = StreamTransformers.toTabularHtml(rows, columns, `${request.jobType.toUpperCase()} Export`);
        return {
          mimeType: 'text/html; charset=utf-8',
          fileName: `${baseName}.html`,
          content: htmlContent,
          recordCount: rows.length,
          fileSizeBytes: Buffer.byteLength(htmlContent, 'utf8'),
        };
      }
    }
  }
}
