/* Global Search API Route - P4-101 - Main Entry Point */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth-guard";
import { globalSearchSchema } from "@/lib/validation/schemas";
import { globalSearch } from "@/lib/api/global-search/service";

export const GET = requireAuth(async (request: Request, session) => {
try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q");
    const entityTypesParam = searchParams.get("entityTypes");
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");

    const parsedData = globalSearchSchema.parse({
      q: query,
      entityTypes: entityTypesParam ? entityTypesParam.split(",") : undefined,
      page,
      limit,
    });

    const results = await globalSearch(
      parsedData.q,
      parsedData.entityTypes,
      parsedData.page,
      parsedData.limit
    );

    return NextResponse.json({
      success: true,
      data: results,
      pagination: {
        page: parsedData.page,
        limit: parsedData.limit,
        totalResults: results.totalResults,
        hasMore: results.totalResults > parsedData.page * parsedData.limit,
      },
    });
  } catch (error) {
    console.error("Global search API error:", error);

    if (error instanceof Error && "name" in error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Invalid search parameters" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});

export const OPTIONS = requireAuth(async () => {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
});

// Global search distribution route for specific entity types
const tasks = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const { globalSearch } = await import("@/lib/api/global-search/service");
  const results = await globalSearch(query, ["tasks"], 1, 20);

  return NextResponse.json({
    success: true,
    data: results.tasks,
    pagination: {
      page: 1,
      limit: 20,
      totalResults: results.tasks.length,
    },
  });
});

const staff = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const { globalSearch } = await import("@/lib/api/global-search/service");
  const results = await globalSearch(query, ["staff"], 1, 20);

  return NextResponse.json({
    success: true,
    data: results.staff,
    pagination: {
      page: 1,
      limit: 20,
      totalResults: results.staff.length,
    },
  });
});

const students = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const { globalSearch } = await import("@/lib/api/global-search/service");
  const results = await globalSearch(query, ["students"], 1, 20);

  return NextResponse.json({
    success: true,
    data: results.students,
    pagination: {
      page: 1,
      limit: 20,
      totalResults: results.students.length,
    },
  });
});

const events = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const { globalSearch } = await import("@/lib/api/global-search/service");
  const results = await globalSearch(query, ["events"], 1, 20);

  return NextResponse.json({
    success: true,
    data: results.events,
    pagination: {
      page: 1,
      limit: 20,
      totalResults: results.events.length,
    },
  });
});

const announcements = requireAuth(async (request: Request, session) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  const { globalSearch } = await import("@/lib/api/global-search/service");
  const results = await globalSearch(query, ["announcements"], 1, 20);

  return NextResponse.json({
    success: true,
    data: results.announcements,
    pagination: {
      page: 1,
      limit: 20,
      totalResults: results.announcements.length,
    },
  });
});