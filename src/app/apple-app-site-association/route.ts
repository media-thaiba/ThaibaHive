import { NextResponse } from "next/server";

export async function GET() {
  const appleAssociation = {
    applinks: {
      apps: [],
      details: [
        {
          appID: "TEAMID1234.com.thaiba.thaibahive",
          paths: [
            "/my-work/*",
            "/operations/*",
            "/school/*",
            "/admin/*",
            "/portal/*",
            "/sync-status",
            "/share/*",
            "/verify/*",
            "/"
          ]
        }
      ]
    },
    webcredentials: {
      apps: ["TEAMID1234.com.thaiba.thaibahive"]
    }
  };

  return new NextResponse(JSON.stringify(appleAssociation, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
