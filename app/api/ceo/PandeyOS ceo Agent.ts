import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = "http://127.0.0.1:11434/api/chat";
const MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";

const CEO_SYSTEM_PROMPT = `
You are the CEO Agent of PandeyOS.

You are the strategic brain of an AI workforce platform.

Your job is to analyze a user's goal and create a small, executable workforce plan.

Do NOT perform the user's work.
Do NOT claim anything has already been completed.
Do NOT create unnecessary agents.

You must decide:

1. The real objective.
2. The desired outcome.
3. Requirements.
4. Assumptions.
5. Risks and unknowns.
6. Which specialized agents are actually necessary.
7. The responsibility of every agent.
8. Concrete executable tasks for every agent.
9. Expected output of every agent.
10. Dependencies between tasks.
11. Correct execution order.
12. Quality-control requirements.
13. Final deliverable.
14. The single best next action.

WORKFORCE RULES:

- Prefer a small workforce.
- Combine responsibilities when one agent can handle them.
- Every agent must have a clear reason to exist.
- Every task must be executable by another AI agent.
- Dependencies must be explicit.
- Quality control must happen before final delivery.
- Never invent completed results.
- Never use motivational filler.

IMPORTANT:
Return ONLY valid JSON.
Do not use markdown.
Do not use code fences.
Do not add explanations outside the JSON.

Use exactly this JSON structure:

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
`;

type TaskPlan = {
  id: string;
  title: string;
  description: string;
  dependsOn: string[];
  expectedOutput: string;
};

type AgentPlan = {
  id: string;
  name: string;
  whyNeeded: string;
  responsibility: string;
  tasks: TaskPlan[];
};

type CEOPlan = {
  mission: {
    objective: string;
    desiredOutcome: string;
    requirements: string[];
    assumptions: string[];
    risks: string[];
  };
  agents: AgentPlan[];
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

function extractJson(text: string): string {
  let cleaned = text.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("CEO returned no valid JSON object.");
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function validatePlan(plan: any): plan is CEOPlan {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const goal = body?.goal;

    if (!goal || typeof goal !== "string" || !goal.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a goal.",
        },
        { status: 400 }
      );
    }

    const cleanGoal = goal.trim();

    console.log("======================================");
    console.log("CEO AGENT");
    console.log("Goal:", cleanGoal);
    console.log("Model:", MODEL);
    console.log("======================================");

    const response = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
Analyze this user goal and create the workforce plan.

USER GOAL:
${cleanGoal}
`,
          },
        ],

        options: {
          temperature: 0.1,
          num_ctx: 8192,
        },
      }),
    });

    const rawText = await response.text();

    console.log("Ollama HTTP status:", response.status);
    console.log("Ollama response length:", rawText.length);

    if (!response.ok) {
      throw new Error(
        `Ollama request failed (${response.status}): ${rawText}`
      );
    }

    if (!rawText.trim()) {
      throw new Error("Ollama returned an empty response.");
    }

    let ollamaData: any;

    try {
      ollamaData = JSON.parse(rawText);
    } catch {
      console.error("Invalid Ollama HTTP JSON:");
      console.error(rawText);

      throw new Error("Ollama returned invalid HTTP JSON.");
    }

    const content =
      typeof ollamaData?.message?.content === "string"
        ? ollamaData.message.content.trim()
        : "";

    if (!content) {
      console.error(
        "Full Ollama response:",
        JSON.stringify(ollamaData, null, 2)
      );

      throw new Error("Ollama returned no CEO content.");
    }

    console.log("CEO raw content:");
    console.log(content);

    const jsonText = extractJson(content);

    let plan: CEOPlan;

    try {
      plan = JSON.parse(jsonText);
    } catch (error) {
      console.error("CEO JSON parsing failed.");
      console.error("JSON text:", jsonText);

      throw new Error("CEO returned invalid plan JSON.");
    }

    if (!validatePlan(plan)) {
      console.error(
        "Invalid CEO plan:",
        JSON.stringify(plan, null, 2)
      );

      throw new Error("CEO returned an invalid workforce plan.");
    }

    console.log("CEO plan generated successfully.");
    console.log("Agents:", plan.agents.length);

    const totalTasks = plan.agents.reduce(
      (count, agent) => count + agent.tasks.length,
      0
    );

    console.log("Total tasks:", totalTasks);

    return NextResponse.json({
      success: true,
      plan,
      model: MODEL,
    });
  } catch (error) {
    console.error("======================================");
    console.error("CEO AGENT ERROR");
    console.error(error);
    console.error("======================================");

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