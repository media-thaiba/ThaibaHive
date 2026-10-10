import {
  FeeReceiptSchema,
  MedicalCertificateSchema,
  StudentIdCardSchema,
  CctvIncidentSchema,
  GeneralDocumentSchema,
} from "./schemas";

export interface ConfidenceEvaluation {
  score: number; // 0.0 to 1.0
  isApproved: boolean; // score >= 0.85 and no critical errors
  zodCompletenessScore: number;
  ruleConsistencyScore: number;
  ocrClarityScore: number;
  validationErrors: string[];
}

function getZodIssues(error: any): Array<{ path: (string | number)[]; message: string }> {
  if (!error) return [];
  if (Array.isArray(error.issues)) return error.issues;
  if (Array.isArray(error.errors)) return error.errors;
  return [];
}

export class ConfidenceEngine {
  evaluate(
    docType: string,
    extractedData: any,
    ocrClarity = 0.95
  ): ConfidenceEvaluation {
    const errors: string[] = [];
    let zodScore = 1.0;
    let ruleScore = 1.0;

    switch (docType) {
      case "fee_receipt": {
        const result = FeeReceiptSchema.safeParse(extractedData);
        if (!result.success) {
          const issues = getZodIssues(result.error);
          zodScore = Math.max(0.2, 1.0 - issues.length * 0.2);
          errors.push(...issues.map((e) => `${e.path.join(".")}: ${e.message}`));
        } else {
          // Rule consistency: Line items sum check
          const data = result.data;
          const itemsSum = data.lineItems.reduce((acc, item) => acc + item.amount, 0);
          if (Math.abs(itemsSum - data.totalAmount) > 0.01) {
            ruleScore -= 0.5;
            errors.push(`Line items sum (${itemsSum}) does not match total amount (${data.totalAmount})`);
          }
          if (!data.paymentDate || isNaN(Date.parse(data.paymentDate))) {
            ruleScore -= 0.3;
            errors.push("Invalid payment date format");
          }
        }
        break;
      }

      case "medical_certificate": {
        const result = MedicalCertificateSchema.safeParse(extractedData);
        if (!result.success) {
          const issues = getZodIssues(result.error);
          zodScore = Math.max(0.2, 1.0 - issues.length * 0.2);
          errors.push(...issues.map((e) => `${e.path.join(".")}: ${e.message}`));
        } else {
          const data = result.data;
          const start = Date.parse(data.startDate);
          const end = Date.parse(data.endDate);
          if (isNaN(start) || isNaN(end) || start > end) {
            ruleScore -= 0.6;
            errors.push(`Invalid medical leave date range: ${data.startDate} to ${data.endDate}`);
          }
          if (data.doctorRegistrationNumber.length < 4) {
            ruleScore -= 0.3;
            errors.push("Doctor registration number is too short or invalid");
          }
        }
        break;
      }

      case "identity_card": {
        const result = StudentIdCardSchema.safeParse(extractedData);
        if (!result.success) {
          const issues = getZodIssues(result.error);
          zodScore = Math.max(0.2, 1.0 - issues.length * 0.2);
          errors.push(...issues.map((e) => `${e.path.join(".")}: ${e.message}`));
        }
        break;
      }

      case "cctv_incident": {
        const result = CctvIncidentSchema.safeParse(extractedData);
        if (!result.success) {
          const issues = getZodIssues(result.error);
          zodScore = Math.max(0.2, 1.0 - issues.length * 0.2);
          errors.push(...issues.map((e) => `${e.path.join(".")}: ${e.message}`));
        }
        break;
      }

      case "general_document":
      default: {
        const result = GeneralDocumentSchema.safeParse(extractedData);
        if (!result.success) {
          const issues = getZodIssues(result.error);
          zodScore = 0.5;
          errors.push(...issues.map((e) => `${e.path.join(".")}: ${e.message}`));
        }
        break;
      }
    }

    ruleScore = Math.max(0, Math.min(1.0, ruleScore));
    zodScore = Math.max(0, Math.min(1.0, zodScore));
    const clarityScore = Math.max(0, Math.min(1.0, ocrClarity));

    // Weighted formula: 40% Zod completeness + 30% rule consistency + 30% OCR clarity
    const aggregateScore = 0.4 * zodScore + 0.3 * ruleScore + 0.3 * clarityScore;
    const finalScore = Math.round(aggregateScore * 100) / 100;

    return {
      score: finalScore,
      isApproved: finalScore >= 0.85 && errors.length === 0,
      zodCompletenessScore: zodScore,
      ruleConsistencyScore: ruleScore,
      ocrClarityScore: clarityScore,
      validationErrors: errors,
    };
  }
}

export const confidenceEngine = new ConfidenceEngine();
