import { NextRequest, NextResponse } from "next/server";
import { executionEngine } from "@/lib/kernel/execution-engine";

export async function POST(request: NextRequest) {
  try {
    // ---------------------------------------------
    // READ REQUEST BODY
    // ---------------------------------------------

    const body = await request.json();

    const missionId =
      typeof body?.missionId === "string"
        ? body.missionId.trim()
        : "";

    const taskId =
      typeof body?.taskId === "string"
        ? body.taskId.trim()
        : "";

    console.log("");
    console.log("=================================");
    console.log("PandeyOS Task Execution API");
    console.log("=================================");
    console.log("Received missionId:", missionId);
    console.log("Received taskId:", taskId);
    console.log("=================================");
    console.log("");

    // ---------------------------------------------
    // VALIDATE MISSION ID
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
    // VALIDATE TASK ID
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
    // EXECUTE TASK
    // ---------------------------------------------

    const result =
      await executionEngine.executeTask(
        missionId,
        taskId
      );

    console.log("");
    console.log("=================================");
    console.log("Execution API Result");
    console.log("=================================");
    console.log(result);
    console.log("=================================");
    console.log("");

    // ---------------------------------------------
    // RETURN RESULT
    // ---------------------------------------------

    return NextResponse.json(
      result,
      {
        status: result.success ? 200 : 404,
      }
    );
  } catch (error) {
    console.error("");
    console.error("=================================");
    console.error("EXECUTION API ERROR");
    console.error("=================================");
    console.error(error);
    console.error("=================================");
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
}