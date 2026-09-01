import { NextRequest, NextResponse } from "next/server";

// =====================================================
// PANDeyOS CEO AGENT
// Ollama + qwen3:8b
// =====================================================

const OLLAMA_URL =
  process.env.OLLAMA_URL ||
  "http://127.0.0.1:11434/api/chat";

const MODEL =
  process.env.OLLAMA_MODEL ||
  "qwen3:8b";

// =====================================================
// CEO SYSTEM PROMPT
// =====================================================

const CEO_SYSTEM_PROMPT = `
You are the CEO Agent of PandeyOS.

Your job is to act as the strategic brain of an AI workforce.

You DO NOT perform the user's work yourself.

You analyze the user's goal and create an executable workforce plan that the Kernel can convert into missions and tasks.

Your responsibilities:

1. Understand the user's goal.
2. Identify the desired outcome.
3. Identify requirements and constraints.
4. Decide which specialized agents are needed.
5. Define responsibilities for each agent.
6. Break the mission into concrete tasks.
7. Define task dependencies.
8. Define execution order.
9. Define quality-control checks.
10. Define the final deliverable.
11. Define the immediate next action.
12. Avoid unnecessary agents.
13. Keep the plan practical and executable.

IMPORTANT:
Return ONLY valid JSON.

Do NOT use markdown.
Do NOT use code fences.
Do NOT add explanations before or after the JSON.

The JSON MUST follow exactly this structure:

{
  "mission": {
    "objective": "string",
    "desiredOutcome": "string",
    "requirements": ["string"],
    "assumptions": ["string"],
    "risks": ["string"]
  },
  "agents": [
    {
      "id": "agent-1",
      "name": "string",
      "whyNeeded": "string",
      "responsibility": "string",
      "tasks": [
        {
          "id": "task-1",
          "title": "string",
          "description": "string",
          "dependsOn": [],
          "expectedOutput": "string"
        }
      ]
    }
  ],
  "executionOrder": [
    {
      "step": 1,
      "taskId": "task-1",
      "ownerAgentId": "agent-1",
      "dependsOn": []
    }
  ],
  "qualityControl": {
    "mustReview": ["string"],
    "tests": ["string"],
    "successCriteria": ["string"],
    "failureAction": "string"
  },
  "finalDeliverable": "string",
  "nextAction": "string"
}

Rules:

- Every task must have a unique ID.
- Every agent must have a unique ID.
- dependsOn must contain task IDs.
- executionOrder must contain the tasks in the order they should be executed.
- Keep tasks specific and actionable.
- Do not create agents unless they are actually needed.
- If the goal is simple, use fewer agents.
- If information is missing, state reasonable assumptions.
- The finalDeliverable must describe what the user should ultimately receive.
- nextAction must describe the first practical action the workforce should take.

Think strategically before producing the JSON.
`;

// =====================================================
// HELPERS
// =====================================================

function cleanJSON(text: string): string {
  let result = text.trim();

  // Remove markdown code fences if the model accidentally adds them.
  result = result.replace(/^```json\s*/i, "");
  result = result.replace(/^```\s*/i, "");
  result = result.replace(/\s*```$/i, "");

  result = result.trim();

  // If there is extra text around the JSON,
  // extract the outermost JSON object.
  const firstBrace = result.indexOf("{");
  const lastBrace = result.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    result = result.slice(
      firstBrace,
      lastBrace + 1
    );
  }

  return result.trim();
}

function isObject(value: unknown): value is Record<string, any> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isValidCEOPlan(plan: any): boolean {
  if (!isObject(plan)) {
    return false;
  }

  if (!isObject(plan.mission)) {
    return false;
  }

  if (
    typeof plan.mission.objective !== "string" ||
    typeof plan.mission.desiredOutcome !== "string"
  ) {
    return false;
  }

  if (!Array.isArray(plan.mission.requirements)) {
    return false;
  }

  if (!Array.isArray(plan.mission.assumptions)) {
    return false;
  }

  if (!Array.isArray(plan.mission.risks)) {
    return false;
  }

  if (!Array.isArray(plan.agents)) {
    return false;
  }

  if (!Array.isArray(plan.executionOrder)) {
    return false;
  }

  if (!isObject(plan.qualityControl)) {
    return false;
  }

  if (
    !Array.isArray(plan.qualityControl.mustReview) ||
    !Array.isArray(plan.qualityControl.tests) ||
    !Array.isArray(plan.qualityControl.successCriteria) ||
    typeof plan.qualityControl.failureAction !== "string"
  ) {
    return false;
  }

  if (
    typeof plan.finalDeliverable !== "string" ||
    typeof plan.nextAction !== "string"
  ) {
    return false;
  }

  for (const agent of plan.agents) {
    if (!isObject(agent)) {
      return false;
    }

    if (
      typeof agent.id !== "string" ||
      typeof agent.name !== "string" ||
      typeof agent.whyNeeded !== "string" ||
      typeof agent.responsibility !== "string" ||
      !Array.isArray(agent.tasks)
    ) {
      return false;
    }

    for (const task of agent.tasks) {
      if (!isObject(task)) {
        return false;
      }

      if (
        typeof task.id !== "string" ||
        typeof task.title !== "string" ||
        typeof task.description !== "string" ||
        !Array.isArray(task.dependsOn) ||
        typeof task.expectedOutput !== "string"
      ) {
        return false;
      }
    }
  }

  return true;
}

// =====================================================
// POST
// =====================================================

export async function POST(
  request: NextRequest
) {
  const startedAt = Date.now();

  try {
    // -------------------------------------------------
    // Read request body
    // -------------------------------------------------

    const body = await request.json();

    const goal =
      typeof body?.goal === "string"
        ? body.goal.trim()
        : "";

    if (!goal) {
      return NextResponse.json(
        {
          success: false,
          error: "A goal is required.",
        },
        { status: 400 }
      );
    }

    console.log("");
    console.log("=================================");
    console.log("PandeyOS CEO Agent");
    console.log("=================================");
    console.log("Goal:", goal);
    console.log("Model:", MODEL);
    console.log("Ollama URL:", OLLAMA_URL);
    console.log("=================================");
    console.log("");

    // -------------------------------------------------
    // Build Ollama request
    // -------------------------------------------------

    const ollamaPayload = {
      model: MODEL,
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content: CEO_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `
USER GOAL:

${goal}

Analyze this goal and create the workforce plan.
Return ONLY the required JSON.
`,
        },
      ],
      options: {
        temperature: 0.2,
      },
    };

    console.log(
      "CEO: sending request to Ollama..."
    );

    // -------------------------------------------------
    // Timeout
    // -------------------------------------------------

    const controller =
      new AbortController();

    const timeout = setTimeout(() => {
      console.error(
        "CEO: Ollama request timed out."
      );

      controller.abort();
    }, 120000);

    let ollamaResponse: Response;

    try {
      ollamaResponse = await fetch(
        OLLAMA_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            ollamaPayload
          ),
          signal: controller.signal,
          cache: "no-store",
        }
      );
    } catch (error) {
      clearTimeout(timeout);

      if (
        error instanceof Error &&
        error.name === "AbortError"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "CEO Agent timed out while waiting for Ollama.",
          },
          { status: 504 }
        );
      }

      console.error(
        "CEO: failed to connect to Ollama:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to connect to Ollama. Make sure Ollama is running.",
        },
        { status: 502 }
      );
    }

    clearTimeout(timeout);

    // -------------------------------------------------
    // Read Ollama response safely
    // -------------------------------------------------

    const rawOllamaResponse =
      await ollamaResponse.text();

    console.log(
      "CEO: Ollama HTTP status:",
      ollamaResponse.status
    );

    console.log(
      "CEO: Ollama response length:",
      rawOllamaResponse.length
    );

    if (!ollamaResponse.ok) {
      console.error(
        "CEO: Ollama returned an error:"
      );

      console.error(
        rawOllamaResponse.slice(0, 4000)
      );

      return NextResponse.json(
        {
          success: false,
          error:
            `Ollama returned HTTP ${ollamaResponse.status}. ` +
            rawOllamaResponse.slice(0, 1000),
        },
        { status: 502 }
      );
    }

    if (!rawOllamaResponse.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Ollama returned an empty response.",
        },
        { status: 502 }
      );
    }

    // -------------------------------------------------
    // Parse Ollama envelope
    // -------------------------------------------------

    let ollamaData: any;

    try {
      ollamaData =
        JSON.parse(rawOllamaResponse);
    } catch (error) {
      console.error(
        "CEO: Ollama response was not valid JSON."
      );

      console.error(
        rawOllamaResponse.slice(0, 4000)
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Ollama returned an invalid JSON response.",
        },
        { status: 502 }
      );
    }

    // -------------------------------------------------
    // Extract assistant content
    // -------------------------------------------------

    const assistantContent =
      typeof ollamaData?.message?.content === "string"
        ? ollamaData.message.content.trim()
        : "";

    if (!assistantContent) {
      console.error(
        "CEO: Ollama response did not contain message.content."
      );

      console.error(
        JSON.stringify(
          ollamaData,
          null,
          2
        )
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Ollama returned no assistant content.",
        },
        { status: 502 }
      );
    }

    console.log(
      "CEO: assistant content received."
    );

    console.log(
      "CEO: content length:",
      assistantContent.length
    );

    // -------------------------------------------------
    // Parse CEO JSON plan
    // -------------------------------------------------

    const cleanedJSON =
      cleanJSON(
        assistantContent
      );

    let plan: any;

    try {
      plan =
        JSON.parse(cleanedJSON);
    } catch (error) {
      console.error(
        "CEO: failed to parse CEO plan JSON."
      );

      console.error(
        "Cleaned CEO output:"
      );

      console.error(
        cleanedJSON.slice(0, 8000)
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "CEO Agent returned invalid plan JSON.",
          raw:
            assistantContent.slice(
              0,
              4000
            ),
        },
        { status: 502 }
      );
    }

    // -------------------------------------------------
    // Validate plan
    // -------------------------------------------------

    if (!isValidCEOPlan(plan)) {
      console.error(
        "CEO: plan structure validation failed."
      );

      console.error(
        JSON.stringify(
          plan,
          null,
          2
        ).slice(0, 10000)
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "CEO Agent returned an invalid workforce plan structure.",
          plan,
        },
        { status: 502 }
      );
    }

    // -------------------------------------------------
    // Success
    // -------------------------------------------------

    const duration =
      Date.now() - startedAt;

    console.log("");
    console.log(
      "================================="
    );
    console.log(
      "CEO PLAN CREATED SUCCESSFULLY"
    );
    console.log(
      "================================="
    );

    console.log(
      "Objective:",
      plan.mission.objective
    );

    console.log(
      "Agents:",
      plan.agents.length
    );

    console.log(
      "Tasks:",
      plan.agents.reduce(
        (
          total: number,
          agent: CEOAgentLike
        ) =>
          total +
          agent.tasks.length,
        0
      )
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
      "Duration:",
      `${duration}ms`
    );

    console.log(
      "================================="
    );
    console.log("");

    return NextResponse.json({
      success: true,

      model: MODEL,

      result:
        JSON.stringify(
          plan,
          null,
          2
        ),

      plan,

      duration,
    });
  } catch (error) {
    console.error("");
    console.error(
      "================================="
    );
    console.error(
      "CEO ROUTE ERROR"
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
            : "CEO Agent failed.",
      },
      { status: 500 }
    );
  }
}

// =====================================================
// INTERNAL TYPE
// =====================================================

type CEOAgentLike = {
  tasks: unknown[];
};