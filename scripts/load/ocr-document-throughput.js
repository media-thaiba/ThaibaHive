import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const ocrRequests = new Counter('ocr_requests_total');
const ocrProcessingLatency = new Trend('ocr_processing_latency');
const ocrErrors = new Rate('ocr_errors');
const extractionConfidence = new Trend('ocr_extraction_confidence');

export const options = {
  scenarios: {
    document_ocr_throughput: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 docs per second
      timeUnit: '1s',
      duration: '4m',
      preAllocatedVUs: 30,
      maxVUs: 100,
    },
  },
  thresholds: {
    'ocr_processing_latency': ['p(95)<800', 'p(99)<1500'],
    'ocr_errors': ['rate<0.02'],
    'ocr_extraction_confidence': ['avg>0.80'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const JWT_TOKEN = __ENV.JWT_TOKEN || '';

const SAMPLE_DOCUMENT_PAYLOADS = [
  {
    documentType: 'receipt',
    fileName: 'science_lab_supplies_invoice_2026.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 245120,
    extractedText: 'INVOICE #98231 - Apex Chemical Supplies. Total Amount: $4,520.00. Date: 2026-10-04. Tax ID: 99-1234567. Authorized signature present.',
  },
  {
    documentType: 'medical_certificate',
    fileName: 'medical_fitness_student_9021.png',
    mimeType: 'image/png',
    fileSizeBytes: 512400,
    extractedText: 'MEDICAL CLEARANCE CERTIFICATE: Student John Doe (Roll: 1024) is fit to resume sports activities following full recovery. Dr. Sarah Connor, MD.',
  },
  {
    documentType: 'id_card',
    fileName: 'faculty_identity_card_2026.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 184300,
    extractedText: 'STAFF IDENTIFICATION: Prof. Robert Vance. Department: Computer Science. ID: STF-90812. Blood Group: O+ve. Valid Thru: 2028.',
  },
  {
    documentType: 'generic',
    fileName: 'campus_renovation_quotation.pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 890400,
    extractedText: 'QUOTATION: Central Library Acoustic Ceiling Renovation. Estimated Cost: $12,800. Vendor: Skyline Interiors. Aadhaar: 1234 5678 9012.',
  },
];

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Cookie': `thaibahive_session=${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

export default function runOcrDocumentThroughput() {
  const headers = getAuthHeaders();
  const sample = SAMPLE_DOCUMENT_PAYLOADS[Math.floor(Math.random() * SAMPLE_DOCUMENT_PAYLOADS.length)];

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/ai/documents/process`, JSON.stringify(sample), {
    headers,
    timeout: '15s',
  });
  const latency = Date.now() - start;

  ocrProcessingLatency.add(latency);
  ocrRequests.add(1);

  const success = check(res, {
    'OCR process status 200': (r) => r.status === 200,
    'OCR response has document ID': (r) => {
      try {
        const data = JSON.parse(r.body);
        return typeof data.id === 'string' && data.id.length > 0;
      } catch {
        return false;
      }
    },
    'OCR extracted data returned': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.extractedData !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (success) {
    try {
      const data = JSON.parse(res.body);
      if (typeof data.confidenceScore === 'number') {
        extractionConfidence.add(data.confidenceScore);
      }
    } catch {}
  } else {
    ocrErrors.add(1);
  }

  sleep(Math.random() * 0.4 + 0.2);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'ocr-load-summary.json': JSON.stringify(data),
  };
}

function textSummary(data) {
  return `Document Intelligence OCR Throughput Test Summary\n${JSON.stringify(data.metrics, null, 2)}`;
}
