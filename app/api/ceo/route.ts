import { NextRequest, NextResponse } from "next/server";
import { kernel } from "@/lib/kernel/kernel";

type ParsedTask = {
  title: string;
  department: string;
  owner?: string;
  dependency?: string;
  expectedOutput?: string;
};

function cleanText(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\*\*/g, "")
    .trim();
}

function parseCEOPlan(plan: string): {
  tasks: ParsedTask[];
  finalDeliverable?: string;
  nextAction?: string;
} {
  const tasks: ParsedTask[] = [];

  const normalizedPlan = cleanText(plan);

  console.log("");
  console.log("=================================");
  console.log("PandeyOS CEO Plan Parser");
  console.log("=================================");
  console.log("Plan length:", normalizedPlan.length);
  console.log("=================================");
  console.log("");

  // ---------------------------------------------
  // FINAL DELIVERABLE
  // ---------------------------------------------

  const finalDeliverableMatch = normalizedPlan.match(
    /FINAL DELIVERABLE\s*:?\s*([\s\S]*?)(?=\n\s*NEXT ACTION|$)/i
  );

  const finalDeliverable = finalDeliverableMatch
    ? cleanText(finalDeliverableMatch[1])
    : undefined;

  // ---------------------------------------------
  // NEXT ACTION
  // ---------------------------------------------

  const nextActionMatch = normalizedPlan.match(
    /NEXT ACTION\s*:?\s*([\s\S]*)$/i
  );

  const nextAction = nextActionMatch
    ? cleanText(nextActionMatch[1])
    : undefined;

  // ---------------------------------------------
  // AGENT SECTIONS
  // ---------------------------------------------

  const agentRegex =
    /AGENT\s+\d+([\s\S]*?)(?=\n\s*AGENT\s+\d+|\n\s*EXECUTION ORDER|\n\s*QUALITY CONTROL|\n\s*FINAL DELIVERABLE|$)/gi;

  const agentSections = [
    ...normalizedPlan.matchAll(agentRegex),
  ];

  console.log(
    "CEO agent sections found:",
    agentSections.length
  );

  for (const match of agentSections) {
    const section = match[1] || "";

    // -------------------------------------------
    // Agent name
    // -------------------------------------------

    const nameMatch = section.match(
      /Name\s*:\s*(.+)/i
    );

    const owner = nameMatch
      ? cleanText(nameMatch[1])
      : undefined;

    console.log(
      "Parsing agent:",
      owner || "Unknown Agent"
    );

    // -------------------------------------------
    // Tasks block
    // -------------------------------------------

    const tasksMatch = section.match(
      /Tasks\s*:\s*([\s\S]*?)(?=\n\s*Expected output\s*:|\n\s*Expected Output\s*:|$)/i
    );

    if (!tasksMatch) {
      console.log(
        "No Tasks block found for:",
        owner || "Unknown Agent"
      );

      continue;
    }

    const taskBlock = cleanText(
      tasksMatch[1]
    );

    // -------------------------------------------
    // Expected output
    // -------------------------------------------

    const outputMatch = section.match(
      /Expected output\s*:\s*([\s\S]*?)(?=\n\s*AGENT\s+\d+|\n\s*EXECUTION ORDER|\n\s*QUALITY CONTROL|$)/i
    );

    const expectedOutput = outputMatch
      ? cleanText(outputMatch[1])
      : undefined;

    // -------------------------------------------
    // Parse individual task lines
    // -------------------------------------------

    const taskLines = taskBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of taskLines) {
      const cleaned = line
        .replace(/^\d+[\.\)]\s*/, "")
        .replace(/^[-*]\s*/, "")
        .replace(/^\*\*\d+[\.\)]?\s*/, "")
        .replace(/\*\*/g, "")
        .trim();

      if (!cleaned) {
        continue;
      }

      // Ignore headings accidentally captured as tasks.
      if (
        /^expected output:?$/i.test(cleaned) ||
        /^responsibility:?$/i.test(cleaned) ||
        /^tasks:?$/i.test(cleaned) ||
        /^why needed:?$/i.test(cleaned)
      ) {
        continue;
      }

      tasks.push({
        title: cleaned,
        department: owner || "General",
        owner,
        expectedOutput,
      });
    }
  }

  // ---------------------------------------------
  // FALLBACK
  // ---------------------------------------------

  if (tasks.length === 0) {
    console.warn(
      "CEO parser produced 0 tasks."
    );

    tasks.push({
      title:
        "Execute the first action defined by the CEO plan",
      department: "CEO",
      owner: "CEO Agent",
      expectedOutput: finalDeliverable,
    });
  }

  // ---------------------------------------------
  // Dependencies
  // ---------------------------------------------

  for (let i = 0; i < tasks.length; i++) {
    tasks[i].dependency =
      i === 0
        ? "None"
        : `Task ${i}`;
  }

  console.log("");
  console.log(
    "Parsed CEO tasks:",
    tasks.length
  );

  tasks.forEach((task, index) => {
    console.log(
      `${index + 1}. ${task.title} | Owner: ${task.owner}`
    );
  });

  console.log("");

  return {
    tasks,
    finalDeliverable,
    nextAction,
  };
}

// =====================================================
// GET
// =====================================================

export async function GET(
  request: NextRequest
) {
  try {
    const { searchParams } =
      new URL(request.url);

    const missionId =
      searchParams.get("missionId");

    // ---------------------------------------------
    // Get one mission
    // ---------------------------------------------

    if (missionId) {
      const mission =
        kernel.getMission(missionId);

      if (!mission) {
        return NextResponse.json(
          {
            success: false,
            error: "Mission not found.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        mission,
      });
    }

    // ---------------------------------------------
    // Get all missions
    // ---------------------------------------------

    return NextResponse.json({
      success: true,
      missions: kernel.getAllMissions(),
    });
  } catch (error) {
    console.error(
      "Kernel GET error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve missions.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// POST
// =====================================================

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const goal = body?.goal;

    // ---------------------------------------------
    // Validate goal
    // ---------------------------------------------

    if (
      !goal ||
      typeof goal !== "string" ||
      !goal.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A goal is required.",
        },
        { status: 400 }
      );
    }

    const cleanGoal = goal.trim();

    console.log("");
    console.log("=================================");
    console.log("PandeyOS Kernel");
    console.log("New Goal");
    console.log("=================================");
    console.log(cleanGoal);
    console.log("=================================");
    console.log("");

    // ---------------------------------------------
    // Ask CEO Agent to create workforce plan
    // ---------------------------------------------

    console.log(
      "Kernel: requesting CEO workforce plan..."
    );

    const ceoUrl = new URL(
      "/api/ceo",
      request.url
    );

    const ceoResponse = await fetch(
      ceoUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          goal: cleanGoal,
        }),
        cache: "no-store",
      }
    );

    const ceoData =
      await ceoResponse.json();

    if (!ceoResponse.ok) {
      console.error(
        "CEO Agent returned error:",
        ceoData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            ceoData?.error ||
            "CEO Agent failed to create a workforce plan.",
        },
        { status: 500 }
      );
    }

    const plan =
      typeof ceoData?.result === "string"
        ? ceoData.result.trim()
        : "";

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CEO Agent returned an empty workforce plan.",
        },
        { status: 500 }
      );
    }

    console.log("");
    console.log(
      "CEO plan received successfully."
    );
    console.log(
      "CEO model:",
      ceoData?.model || "unknown"
    );
    console.log(
      "Plan length:",
      plan.length
    );
    console.log("");

    // ---------------------------------------------
    // Parse CEO plan
    // ---------------------------------------------

    const parsed =
      parseCEOPlan(plan);

    // ---------------------------------------------
    // Create mission WITH tasks
    // ---------------------------------------------

    const mission =
      kernel.createMission(
        cleanGoal,
        {
          plan,
          nextAction:
            parsed.nextAction,
          finalDeliverable:
            parsed.finalDeliverable,
          tasks: parsed.tasks,
        }
      );

    console.log("");
    console.log("=================================");
    console.log("MISSION CREATED");
    console.log("=================================");
    console.log(
      "Mission ID:",
      mission.id
    );
    console.log(
      "Tasks:",
      mission.tasks.length
    );
    console.log(
      "Next Action:",
      mission.nextAction
    );
    console.log(
      "Final Deliverable:",
      mission.finalDeliverable
    );
    console.log("=================================");
    console.log("");

    return NextResponse.json({
      success: true,
      mission,
    });
  } catch (error) {
    console.error("");
    console.error(
      "================================="
    );
    console.error(
      "Kernel POST error"
    );
    console.error(
      "================================="
    );
    console.error(error);
    console.error("");

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Kernel failed.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH
// =====================================================

export async function PATCH(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const missionId =
      body?.missionId;

    const taskId =
      body?.taskId;

    const status =
      body?.status;

    // ---------------------------------------------
    // Validate missionId
    // ---------------------------------------------

    if (
      !missionId ||
      typeof missionId !== "string"
    ) {
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

    if (
      !taskId ||
      typeof taskId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "taskId is required.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // Validate status
    // ---------------------------------------------

    const validStatuses = [
      "Pending",
      "Running",
      "Completed",
      "Failed",
    ];

    if (
      !validStatuses.includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid status. Use Pending, Running, Completed, or Failed.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------
    // Update task
    // ---------------------------------------------

    const task =
      kernel.updateTaskStatus(
        missionId,
        taskId,
        status
      );

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Mission or task not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      task,
      mission:
        kernel.getMission(
          missionId
        ),
    });
  } catch (error) {
    console.error(
      "Kernel PATCH error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update task.",
      },
      { status: 500 }
    );
  }
}