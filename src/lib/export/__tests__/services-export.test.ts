import { csvFormatter, sanitizeCsvValue } from "../csv-formatter";

describe("Services Module Export Engine Integration", () => {
  it("formats fleet vehicle export CSV cleanly", () => {
    const fleetData = [
      { registrationNumber: "KA-01-AB-1234", model: "Volvo B11R", type: "bus", capacity: 50, fuelType: "diesel" },
    ];
    const columns = [
      { key: "registrationNumber", header: "Registration No." },
      { key: "model", header: "Model" },
      { key: "capacity", header: "Capacity" },
    ];

    const result = csvFormatter.generate({
      data: fleetData,
      columns: columns as any,
      type: "fleet",
      format: "csv",
      title: "Fleet Inventory",
    });


    expect(typeof result.content).toBe("string");
    const content = result.content as string;
    expect(content).toContain("Registration No.,Model,Capacity");
    expect(content).toContain("KA-01-AB-1234,Volvo B11R,50");
  });

  it("applies formula injection sanitization to visitor names starting with = or +", () => {
    const sanitized = sanitizeCsvValue("=CMD|' /C calc'!A0");
    expect(sanitized).not.toBe("=CMD|' /C calc'!A0");
    expect(sanitized).toContain("'=CMD");
  });
});
