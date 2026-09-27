import { ReviewWorkflowService } from "../review-workflow-service";
import { db } from "@/db";

jest.mock("@/db", () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
  },
}));

type FixtureReview = {
  id: string;
  staffId: string;
  institutionId: string | null;
  status: string;
};

let existingReview: FixtureReview | null = null;

function chainable(terminal: Record<string, jest.Mock>) {
  const chain: Record<string, jest.Mock> = {};
  for (const key of ["select", "from", "where", "update", "set"]) {
    chain[key] = jest.fn().mockReturnValue(chain);
  }
  Object.assign(chain, terminal);
  return chain;
}

const selectChain = chainable({ get: jest.fn(async () => existingReview) });
const updateChain = chainable({ run: jest.fn(async () => undefined) });

describe("Review Workflow Engine Logic", () => {
  it("calculates final score average accurately", () => {
    const ratings = [
      { metricId: "m1", score: 4.0 },
      { metricId: "m2", score: 5.0 },
      { metricId: "m3", score: 4.5 },
    ];
    const score = ReviewWorkflowService.calculateFinalScore(ratings);
    expect(score).toBe(4.5);
  });

  it("assigns appropriate letter grades based on scores", () => {
    expect(ReviewWorkflowService.calculateGrade(4.8)).toBe("A+");
    expect(ReviewWorkflowService.calculateGrade(4.2)).toBe("A");
    expect(ReviewWorkflowService.calculateGrade(3.5)).toBe("B");
    expect(ReviewWorkflowService.calculateGrade(2.5)).toBe("C");
    expect(ReviewWorkflowService.calculateGrade(1.5)).toBe("D");
  });

  it("handles empty ratings array gracefully", () => {
    expect(ReviewWorkflowService.calculateFinalScore([])).toBe(0);
  });
});

describe("ReviewWorkflowService.submitReviewStage authorization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    existingReview = {
      id: "rev_1",
      staffId: "reviewee_1",
      institutionId: null,
      status: "self",
    };
    (db.select as jest.Mock).mockReturnValue(selectChain);
    (db.update as jest.Mock).mockReturnValue(updateChain);
  });

  it("allows the reviewee (staff) to submit their own self-assessment", async () => {
    const result = await ReviewWorkflowService.submitReviewStage({
      reviewId: "rev_1",
      stage: "self_assessment",
      ratings: [{ metricId: "m1", score: 4 }],
      submittingStaffId: "reviewee_1",
      userRole: "staff",
    });

    expect(result.newStatus).toBe("manager_review");
  });

  it("blocks a peer from submitting someone else's self-assessment", async () => {
    await expect(
      ReviewWorkflowService.submitReviewStage({
        reviewId: "rev_1",
        stage: "self_assessment",
        ratings: [{ metricId: "m1", score: 5 }],
        submittingStaffId: "peer_staff",
        userRole: "staff",
      })
    ).rejects.toThrow("Forbidden: only the reviewee can submit a self-assessment");
  });

  it("blocks staff without evaluate permission from manager_review", async () => {
    await expect(
      ReviewWorkflowService.submitReviewStage({
        reviewId: "rev_1",
        stage: "manager_review",
        ratings: [{ metricId: "m1", score: 5 }],
        submittingStaffId: "peer_staff",
        userRole: "staff",
      })
    ).rejects.toThrow("Forbidden: this review stage requires performance:evaluate permission");
  });

  it("blocks the reviewee from manager-reviewing their own review", async () => {
    await expect(
      ReviewWorkflowService.submitReviewStage({
        reviewId: "rev_1",
        stage: "manager_review",
        ratings: [{ metricId: "m1", score: 5 }],
        submittingStaffId: "reviewee_1",
        userRole: "hod",
      })
    ).rejects.toThrow("Anti-self-approval");
  });

  it("allows a hod to submit manager_review for a report", async () => {
    const result = await ReviewWorkflowService.submitReviewStage({
      reviewId: "rev_1",
      stage: "manager_review",
      ratings: [{ metricId: "m1", score: 4 }],
      submittingStaffId: "hod_1",
      userRole: "hod",
    });

    expect(result.newStatus).toBe("hr_approval");
  });

  it("blocks staff from hr_approval and signed_off stages", async () => {
    await expect(
      ReviewWorkflowService.submitReviewStage({
        reviewId: "rev_1",
        stage: "hr_approval",
        submittingStaffId: "peer_staff",
        userRole: "staff",
      })
    ).rejects.toThrow("Forbidden: this review stage requires performance:evaluate permission");

    await expect(
      ReviewWorkflowService.submitReviewStage({
        reviewId: "rev_1",
        stage: "signed_off",
        submittingStaffId: "peer_staff",
        userRole: "staff",
      })
    ).rejects.toThrow("Forbidden: this review stage requires performance:evaluate permission");
  });
});
