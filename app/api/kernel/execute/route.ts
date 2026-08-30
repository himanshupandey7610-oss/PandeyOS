import { NextRequest, NextResponse } from "next/server";
import { executionEngine } from "@/lib/kernel/execution-engine";

export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------------
    // Read raw request body
    // ---------------------------------------------

    const rawBody = await request.text();

    console.log("");
    console.log("=================================");
    console.log("PandeyOS Task Execution API");
    console.log("=================================");
    console.log("Raw request body:", rawBody);
    console.log("=================================");
    console.log("");

    if (!rawBody.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Request body is empty.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // Parse JSON
    // ---------------------------------------------

    let body: {
      missionId?: unknown;
      taskId?: unknown;
    };

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Request body must contain valid JSON.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // Extract IDs
    // ---------------------------------------------

    const missionId =
      typeof body?.missionId === "string"
        ? body.missionId.trim()
        : "";

    const taskId =
      typeof body?.taskId === "string"
        ? body.taskId.trim()
        : "";

    console.log("Parsed missionId:", missionId);
    console.log("Parsed taskId:", taskId);
    console.log("");

    // ---------------------------------------------
    // Validate missionId
    // ---------------------------------------------

    if (!missionId) {
      return NextResponse.json(
        {
          success: false,
          error: "missionId is required.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // Validate taskId
    // ---------------------------------------------

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: "taskId is required.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // Execute task
    // ---------------------------------------------

    console.log("Starting execution...");
    console.log("Mission ID:", missionId);
    console.log("Task ID:", taskId);
    console.log("");

    const result =
      await executionEngine.executeTask(
        missionId,
        taskId
      );

    // ---------------------------------------------
    // Log result
    // ---------------------------------------------

    console.log("");
    console.log("=================================");
    console.log("Execution Result");
    console.log("=================================");
    console.log(result);
    console.log("=================================");
    console.log("");

    // ---------------------------------------------
    // Return result
    // ---------------------------------------------

    return NextResponse.json(
      result,
      {
        status: result.success ? 200 : 400,
      }
    );
  } catch (error) {
    console.error("");
    console.error("=================================");
    console.error("EXECUTION API ERROR");
    console.error("=================================");
    console.error(error);
    console.error("");

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to execute task.",
      },
      { status: 500 }
    );
  }
}npx tsc --noEmit
