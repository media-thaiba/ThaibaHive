import { db } from "@/db";
import { performanceCycles, performanceReviews, performanceGoals, feedbackRequests, staff, institutions, departments, staffDepartments, staffInstitutions } from "@/db/schema";
import { POST as createCycle, GET as listCycles } from "@/app/api/performance/cycles/route";
import { POST as createReview, GET as listReviews } from "@/app/api/performance/reviews/route";
import { GET as getReview, PATCH as updateReview } from "@/app/api/performance/reviews/[id]/route";
import { POST as submitReview } from "@/app/api/performance/reviews/[id]/submit/route";
import { POST as createGoal, GET as listGoals } from "@/app/api/performance/goals/route";
import { PATCH as updateGoal } from "@/app/api/performance/goals/[id]/route";
import { POST as createFeedback, GET as listFeedback } from "@/app/api/performance/feedback/route";
import { verifySession, hasPermission } from "@thaiba/auth";
import { eq, sql } from "drizzle-orm";

jest.mock("@thaiba/auth", () => {
  const actual = jest.requireActual("@thaiba/auth");
  return {
    ...actual,
    verifySession: jest.fn(),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe("Enterprise Performance Reviews & Appraisal Engine", () => {
  const timestamp = Date.now();
  const instId = `inst-perf-${timestamp}`;
  const employeeId = `staff-emp-${timestamp}`;
  const managerId = `staff-mgr-${timestamp}`;
  const hrAdminId = `staff-hr-${timestamp}`;
  const peerId = `staff-peer-${timestamp}`;
  const deptId = `dept-perf-${timestamp}`;

  let cycleId: string;
  let reviewId: string;
  let goalId: string;

  beforeAll(async () => {
    // 0. Ensure performance tables exist
    await db.run(sql`CREATE TABLE IF NOT EXISTS performance_cycles (
      id text PRIMARY KEY NOT NULL,
      institution_id text NOT NULL,
      title text NOT NULL,
      cycle_type text DEFAULT 'quarterly' NOT NULL,
      start_date text NOT NULL,
      end_date text NOT NULL,
      self_assessment_deadline text NOT NULL,
      manager_review_deadline text NOT NULL,
      status text DEFAULT 'draft' NOT NULL,
      created_at text DEFAULT (current_timestamp) NOT NULL,
      updated_at text DEFAULT (current_timestamp) NOT NULL
    )`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS performance_reviews (
      id text PRIMARY KEY NOT NULL,
      institution_id text,
      cycle_id text,
      staff_id text NOT NULL,
      evaluator_staff_id text,
      reviewer_id text,
      form_template_id text,
      period text,
      rating real,
      self_score real,
      manager_score real,
      final_score real,
      grade text,
      status text DEFAULT 'self_assessment' NOT NULL,
      self_comments text,
      manager_comments text,
      hr_comments text,
      achievements text,
      areas_for_improvement text,
      goals text,
      ratings_json text,
      submitted_at text,
      approved_at text,
      completed_at text,
      created_at text DEFAULT (current_timestamp) NOT NULL,
      updated_at text DEFAULT (current_timestamp) NOT NULL
    )`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS performance_goals (
      id text PRIMARY KEY NOT NULL,
      institution_id text NOT NULL,
      staff_id text NOT NULL,
      review_id text,
      title text NOT NULL,
      description text,
      target_date text NOT NULL,
      progress_percentage integer DEFAULT 0 NOT NULL,
      status text DEFAULT 'in_progress' NOT NULL,
      created_at text DEFAULT (current_timestamp) NOT NULL,
      updated_at text DEFAULT (current_timestamp) NOT NULL
    )`);

    await db.run(sql`CREATE TABLE IF NOT EXISTS feedback_requests (
      id text PRIMARY KEY NOT NULL,
      institution_id text NOT NULL,
      review_id text NOT NULL,
      requester_staff_id text NOT NULL,
      peer_staff_id text NOT NULL,
      feedback_text text,
      rating real,
      status text DEFAULT 'pending' NOT NULL,
      submitted_at text,
      created_at text DEFAULT (current_timestamp) NOT NULL
    )`);

    const cols = [
      "institution_id text",
      "cycle_id text",
      "evaluator_staff_id text",
      "reviewer_id text",
      "form_template_id text",
      "period text",
      "rating real",
      "self_score real",
      "manager_score real",
      "final_score real",
      "grade text",
      "status text DEFAULT 'self_assessment'",
      "self_comments text",
      "manager_comments text",
      "hr_comments text",
      "achievements text",
      "areas_for_improvement text",
      "goals text",
      "ratings_json text",
      "submitted_at text",
      "approved_at text",
      "completed_at text",
    ];

    for (const col of cols) {
      try {
        await db.run(sql.raw(`ALTER TABLE performance_reviews ADD COLUMN ${col}`));
      } catch {
        // Column already exists
      }
    }

    // 1. Insert test institution
    await db.insert(institutions).values({
      id: instId,
      name: `Thaiba Campus ${timestamp}`,
      code: `TC${timestamp.toString().slice(-4)}`,
    }).run();

    // 2. Insert test staff members
    await db.insert(staff).values({
      id: employeeId,
      email: `emp-${timestamp}@thaibahive.local`,
      employeeId: `EMP-${timestamp}`,
      firstName: "Jane",
      lastName: "Developer",
      role: "staff",
    }).run();

    await db.insert(staff).values({
      id: managerId,
      email: `mgr-${timestamp}@thaibahive.local`,
      employeeId: `MGR-${timestamp}`,
      firstName: "Marcus",
      lastName: "Manager",
      role: "hod",
    }).run();

    await db.insert(staff).values({
      id: hrAdminId,
      email: `hr-${timestamp}@thaibahive.local`,
      employeeId: `HR-${timestamp}`,
      firstName: "Helen",
      lastName: "HRAdmin",
      role: "super_admin",
    }).run();

    await db.insert(staff).values({
      id: peerId,
      email: `peer-${timestamp}@thaibahive.local`,
      employeeId: `PEER-${timestamp}`,
      firstName: "Paul",
      lastName: "PeerColleague",
      role: "staff",
    }).run();

    // 3. Link staff to institution
    await db.insert(staffInstitutions).values({
      id: `si-e-${timestamp}`,
      staffId: employeeId,
      institutionId: instId,
    }).run();

    await db.insert(staffInstitutions).values({
      id: `si-m-${timestamp}`,
      staffId: managerId,
      institutionId: instId,
    }).run();

    await db.insert(staffInstitutions).values({
      id: `si-h-${timestamp}`,
      staffId: hrAdminId,
      institutionId: instId,
    }).run();

    await db.insert(staffInstitutions).values({
      id: `si-p-${timestamp}`,
      staffId: peerId,
      institutionId: instId,
    }).run();

    // 4. Insert department pointing headUserId to managerId
    await db.insert(departments).values({
      id: deptId,
      name: `Engineering ${timestamp}`,
      code: `ENG${timestamp.toString().slice(-4)}`,
      headUserId: managerId,
    }).run();

    await db.insert(staffDepartments).values({
      id: `sd-e-${timestamp}`,
      staffId: employeeId,
      departmentId: deptId,
    }).run();

    await db.insert(staffDepartments).values({
      id: `sd-m-${timestamp}`,
      staffId: managerId,
      departmentId: deptId,
    }).run();
  });

  afterAll(async () => {
    try {
      if (goalId) await db.delete(performanceGoals).where(eq(performanceGoals.id, goalId)).run();
      await db.delete(feedbackRequests).where(eq(feedbackRequests.requesterStaffId, employeeId)).run();
      if (reviewId) await db.delete(performanceReviews).where(eq(performanceReviews.id, reviewId)).run();
      if (cycleId) await db.delete(performanceCycles).where(eq(performanceCycles.id, cycleId)).run();
      await db.delete(staffDepartments).where(eq(staffDepartments.departmentId, deptId)).run();
      await db.delete(staffInstitutions).where(eq(staffInstitutions.institutionId, instId)).run();
      await db.delete(staff).where(eq(staff.id, employeeId)).run();
      await db.delete(staff).where(eq(staff.id, managerId)).run();
      await db.delete(staff).where(eq(staff.id, hrAdminId)).run();
      await db.delete(staff).where(eq(staff.id, peerId)).run();
      await db.delete(departments).where(eq(departments.id, deptId)).run();
      await db.delete(institutions).where(eq(institutions.id, instId)).run();
    } catch {
      // Cleanup fallback
    }
  });

  describe("1. Appraisal Cycle Management", () => {
    it("should create a new performance appraisal cycle", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: hrAdminId,
        role: "super_admin",
      });

      const req = new Request("http://localhost:3000/api/performance/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instId,
          title: `Q3 2026 Academic Performance Cycle ${timestamp}`,
          cycleType: "quarterly",
          startDate: "2026-07-01",
          endDate: "2026-09-30",
          selfAssessmentDeadline: "2026-08-15",
          managerReviewDeadline: "2026-08-31",
        }),
      });

      const res = await createCycle(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.cycle.id).toBeDefined();
      expect(data.cycle.status).toBe("active");
      cycleId = data.cycle.id;
    });

    it("should list performance cycles with institution filters", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: hrAdminId,
        role: "super_admin",
      });

      const req = new Request(`http://localhost:3000/api/performance/cycles?institutionId=${instId}`);
      const res = await listCycles(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.cycles.some((c: any) => c.id === cycleId)).toBe(true);
    });
  });

  describe("2. Review Initiation & Multi-Tier Appraisal State Machine", () => {
    it("should initiate a performance review for employee", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: hrAdminId,
        role: "super_admin",
      });

      const req = new Request("http://localhost:3000/api/performance/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instId,
          cycleId,
          staffId: employeeId,
          evaluatorStaffId: managerId,
          period: "Q3 2026",
        }),
      });

      const res = await createReview(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.review.id).toBeDefined();
      expect(data.review.status).toBe("self_assessment");
      reviewId = data.review.id;
    });

    it("Stage 1: Employee submits self-assessment and advances review to manager_review", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: employeeId,
        role: "staff",
      });

      const req = new Request(`http://localhost:3000/api/performance/reviews/${reviewId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "self_assessment",
          ratings: [
            { metricId: "tech_delivery", score: 4.5, comments: "Exceeded sprint velocity" },
            { metricId: "collaboration", score: 4.0, comments: "Mentored juniors" },
          ],
          selfComments: "Delivered core platform milestones ahead of schedule.",
        }),
      });

      const res = await submitReview(req, { params: Promise.resolve({ id: reviewId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.newStatus).toBe("manager_review");
      expect(data.computedFinalScore).toBe(4.25);
    });

    it("Security Guard: Employee CANNOT submit their own manager_review (Anti-Self-Approval)", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: employeeId,
        role: "staff",
      });

      const req = new Request(`http://localhost:3000/api/performance/reviews/${reviewId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "manager_review",
          ratings: [{ metricId: "tech_delivery", score: 5.0 }],
          comments: "Attempting self manager rating",
        }),
      });

      const res = await submitReview(req, { params: Promise.resolve({ id: reviewId }) });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("Anti-self-approval");
    });

    it("Stage 2: Manager reviews employee and advances review to hr_approval", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: managerId,
        role: "hod",
      });

      const req = new Request(`http://localhost:3000/api/performance/reviews/${reviewId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "manager_review",
          ratings: [
            { metricId: "tech_delivery", score: 4.8, comments: "Outstanding architecture" },
            { metricId: "collaboration", score: 4.2, comments: "Proactive team player" },
          ],
          comments: "Consistently top-tier engineering output.",
          recommendedGrade: "A+",
        }),
      });

      const res = await submitReview(req, { params: Promise.resolve({ id: reviewId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.newStatus).toBe("hr_approval");
      expect(data.grade).toBe("A+");
    });

    it("Stage 3: HR / Principal signs off and marks review completed", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: hrAdminId,
        role: "super_admin",
      });

      const req = new Request(`http://localhost:3000/api/performance/reviews/${reviewId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "hr_approval",
          comments: "Approved for annual promotion and merit increment.",
        }),
      });

      const res = await submitReview(req, { params: Promise.resolve({ id: reviewId }) });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.newStatus).toBe("completed");

      // Verify review state in DB
      const getReq = new Request(`http://localhost:3000/api/performance/reviews/${reviewId}`);
      const getRes = await getReview(getReq, { params: Promise.resolve({ id: reviewId }) });
      const rData = await getRes.json();
      expect(rData.review.status).toBe("completed");
      expect(rData.review.grade).toBe("A+");
    });
  });

  describe("3. SMART Goals & 360-Degree Feedback", () => {
    it("should create and track progress on SMART performance goals", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: employeeId,
        role: "staff",
      });

      const req = new Request("http://localhost:3000/api/performance/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instId,
          reviewId,
          title: "Complete Advanced Microservices Certification",
          description: "Earn AWS Certified Solutions Architect credential",
          targetDate: "2026-10-15",
          progressPercentage: 25,
        }),
      });

      const res = await createGoal(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.goal.id).toBeDefined();
      goalId = data.goal.id;

      // Update goal progress to 100%
      const patchReq = new Request(`http://localhost:3000/api/performance/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          progressPercentage: 100,
        }),
      });
      const patchRes = await updateGoal(patchReq, { params: Promise.resolve({ id: goalId }) });
      expect(patchRes.status).toBe(200);
      const patchData = await patchRes.json();
      expect(patchData.goal.progressPercentage).toBe(100);
      expect(patchData.goal.status).toBe("completed");
    });

    it("should request and submit 360-degree peer feedback", async () => {
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: employeeId,
        role: "staff",
      });

      // Request peer feedback from Paul
      const req = new Request("http://localhost:3000/api/performance/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: instId,
          reviewId,
          peerStaffId: peerId,
        }),
      });

      const res = await createFeedback(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.feedback.id).toBeDefined();
      const fbRequestId = data.feedback.id;

      // Peer submits feedback
      (verifySession as jest.Mock).mockResolvedValue({
        staffId: peerId,
        role: "staff",
      });

      const submitFbReq = new Request("http://localhost:3000/api/performance/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: fbRequestId,
          feedbackText: "Jane has been an extraordinary technical lead and collaborator.",
          rating: 5,
        }),
      });

      const submitRes = await createFeedback(submitFbReq);
      expect(submitRes.status).toBe(200);
      const submitData = await submitRes.json();
      expect(submitData.feedback.status).toBe("submitted");
      expect(submitData.feedback.rating).toBe(5);
    });
  });
});
