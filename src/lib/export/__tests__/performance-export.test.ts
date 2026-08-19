import { csvFormatter } from "../csv-formatter";

describe("Performance Review Export Engine Integration", () => {
  it("formats performance review export CSV cleanly", () => {
    const data = [
      { staffId: "stf_101", selfScore: 4.5, managerScore: 4.5, finalScore: 4.5, grade: "A+", status: "signed_off" },
    ];
    const columns = [
      { key: "staffId", header: "Staff ID" },
      { key: "finalScore", header: "Final Score" },
      { key: "grade", header: "Grade" },
    ];

    const result = csvFormatter.generate({
      data,
      columns: columns as any,
      type: "performance",
      format: "csv",
      title: "Performance Appraisal Ledger",
    });

    expect(typeof result.content).toBe("string");
    const content = result.content as string;
    expect(content).toContain("Staff ID,Final Score,Grade");
    expect(content).toContain("stf_101,4.5,A+");
  });
});
