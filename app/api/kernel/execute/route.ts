import { NextRequest, NextResponse } from "next/server";
import { kernel } from "@/lib/kernel/kernel";

// =====================================================
// CEO PLAN TYPES
// =====================================================

type CEOTask = {
  id: string;
  title: string;
  description: string;
  dependsOn: string[];
  expectedOutput: string;
};

type CEOAgent = {
  id: string;
  name: string;
  whyNeeded: string;
  responsibility: string;
  tasks: CEOTask[];
};

type CEOPlan = {
  mission: {
    objective: string;
    desiredOutcome: string;
    requirements: string[];
    assumptions: string[];
    risks: string[];
  };

  agents: CEOAgent[];

  executionOrder: {
    step: number;
    taskId: string;
    ownerAgentId: string;
    dependsOn: string[];
  }[];

  qualityControl: {
    mustReview: string[];
    tests: string[];
    successCriteria: string[];
    failureAction: string;
  };

  finalDeliverable: string;
  nextAction: string;
};

// =====================================================
// HELPERS
// =====================================================

function isValidCEOPlan(plan: any): plan is CEOPlan {
  if (!plan || typeof plan !== "object") {
    return false;
  }

  if (!plan.mission || typeof plan.mission !== "object") {
    return false;
  }

  if (!Array.isArray(plan.agents)) {
    return false;
  }

  if (!Array.isArray(plan.executionOrder)) {
    return false;
  }

  if (!plan.qualityControl || typeof plan.qualityControl !== "object") {
    return false;
  }

  if (typeof plan.finalDeliverable !== "string") {
    return false;
  }

  if (typeof plan.nextAction !== "string") {
    return false;
  }

  return true;
}

// =====================================================
// GET
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const missionId = searchParams.get("missionId");

    // ---------------------------------------------
    // Get one mission
    // ---------------------------------------------

    if (missionId) {
      const mission = kernel.getMission(missionId);

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
    console.error("Kernel GET error:", error);

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

export async function POST(request: NextRequest) {
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
    // Ask CEO Agent for workforce plan
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

    // ---------------------------------------------
    // Read CEO response
    // ---------------------------------------------

    const ceoRawText =
      await ceoResponse.text();

    console.log(
      "CEO HTTP status:",
      ceoResponse.status
    );

    console.log(
      "CEO raw response length:",
      ceoRawText.length
    );

    if (!ceoRawText.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "CEO Agent returned an empty response.",
        },
        { status: 500 }
      );
    }

    let ceoData: any;

    try {
      ceoData = JSON.parse(
        ceoRawText
      );
    } catch (error) {
      console.error(
        "Failed to parse CEO HTTP JSON:"
      );

      console.error(
        ceoRawText
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "CEO Agent returned invalid JSON.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------
    // Check CEO response
    // ---------------------------------------------

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

    // ---------------------------------------------
    // IMPORTANT:
    // CEO now returns `plan`, NOT `result`
    // ---------------------------------------------

    const plan =
      ceoData?.plan;

    if (!plan) {
      console.error(
        "CEO response did not contain plan:"
      );

      console.error(
        JSON.stringify(
          ceoData,
          null,
          2
        )
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "CEO Agent returned no workforce plan.",
        },
        { status: 500 }
      );
    }

    // ---------------------------------------------
    // Validate CEO plan
    // ---------------------------------------------

    if (!isValidCEOPlan(plan)) {
      console.error(
        "Invalid CEO workforce plan:"
      );

      console.error(
        JSON.stringify(
          plan,
          null,
          2
        )
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "CEO Agent returned an invalid workforce plan.",
        },
        { status: 500 }
      );
    }

    console.log("");
    console.log(
      "================================="
    );
    console.log(
      "CEO PLAN RECEIVED"
    );
    console.log(
      "================================="
    );

    console.log(
      "Objective:",
      plan.mission.objective
    );

    console.log(
      "Desired Outcome:",
      plan.mission.desiredOutcome
    );

    console.log(
      "Agents:",
      plan.agents.length
    );

    console.log(
      "Execution Steps:",
      plan.executionOrder.length
    );

    console.log(
      "Final Deliverable:",
      plan.finalDeliverable
    );

    console.log(
      "Next Action:",
      plan.nextAction
    );

    console.log(
      "================================="
    );
    console.log("");

    // =================================================
    // CONVERT CEO TASKS → KERNEL TASKS
    // =================================================

    const kernelTasks = [];

    for (
      const agent of plan.agents
    ) {
      for (
        const task of agent.tasks
      ) {
        kernelTasks.push({
          title: task.title,

          description:
            task.description,

          department:
            agent.name,

          owner:
            agent.name,

          dependency:
            task.dependsOn &&
            task.dependsOn.length > 0
              ? task.dependsOn.join(", ")
              : "None",

          expectedOutput:
            task.expectedOutput,
        });
      }
    }

    // ---------------------------------------------
    // Fallback if CEO created zero tasks
    // ---------------------------------------------

    if (
      kernelTasks.length === 0
    ) {
      console.warn(
        "CEO returned zero tasks."
      );

      kernelTasks.push({
        title:
          "Execute the first action defined by the CEO plan",

        description:
          plan.nextAction,

        department:
          "CEO",

        owner:
          "CEO Agent",

        dependency:
          "None",

        expectedOutput:
          plan.finalDeliverable,
      });
    }

    console.log(
      "Kernel tasks created:",
      kernelTasks.length
    );

    kernelTasks.forEach(
      (task, index) => {
        console.log(
          `${index + 1}. ${task.title} | Owner: ${task.owner}`
        );
      }
    );

    console.log("");

    // =================================================
    // STORE COMPLETE CEO PLAN
    // =================================================

    const storedPlan =
      JSON.stringify(
        plan,
        null,
        2
      );

    // =================================================
    // CREATE MISSION
    // =================================================

    const mission =
      kernel.createMission(
        cleanGoal,
        {
          plan:
            storedPlan,

          nextAction:
            plan.nextAction,

          finalDeliverable:
            plan.finalDeliverable,

          tasks:
            kernelTasks,
        }
      );

    // =================================================
    // MISSION CREATED
    // =================================================

    console.log("");
    console.log(
      "================================="
    );
    console.log(
      "MISSION CREATED"
    );
    console.log(
      "================================="
    );

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

    console.log(
      "================================="
    );
    console.log("");

    // =================================================
    // RETURN
    // =================================================

    return NextResponse.json({
      success: true,

      mission,

      ceoPlan: plan,
    });
  } catch (error) {
    console.error("");
    console.error(
      "================================="
    );
    console.error(
      "KERNEL POST ERROR"
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

export async function PATCH(request: NextRequest) {
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
          error:
            "missionId is required.",
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
          error:
            "taskId is required.",
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