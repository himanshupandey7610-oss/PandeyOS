import { kernel, KernelTask } from "@/lib/kernel/kernel";

export type TaskExecutionResult = {
  success: boolean;
  task: KernelTask | null;
  message: string;
};

class PandeyOSExecutionEngine {
  async executeTask(
    missionId: string,
    taskId: string
  ): Promise<TaskExecutionResult> {
    console.log("");
    console.log("=================================");
    console.log("PandeyOS Execution Engine");
    console.log("Execute Task Request");
    console.log("=================================");
    console.log("Mission ID:", missionId);
    console.log("Task ID:", taskId);
    console.log("=================================");

    // ---------------------------------------------
    // Find mission
    // ---------------------------------------------

    const mission = kernel.getMission(missionId);

    if (!mission) {
      console.error(
        "Execution Engine: Mission not found:",
        missionId
      );

      return {
        success: false,
        task: null,
        message: `Mission not found: ${missionId}`,
      };
    }

    // ---------------------------------------------
    // Find task
    // ---------------------------------------------

    const task = kernel.getTask(
      missionId,
      taskId
    );

    if (!task) {
      console.error(
        "Execution Engine: Task not found:",
        taskId
      );

      console.log(
        "Available tasks:",
        mission.tasks.map((t) => t.id)
      );

      return {
        success: false,
        task: null,
        message: `Task not found: ${taskId}`,
      };
    }

    console.log("Task found:", task.title);
    console.log("Current status:", task.status);

    // ---------------------------------------------
    // Prevent duplicate execution
    // ---------------------------------------------

    if (task.status === "Running") {
      return {
        success: true,
        task,
        message: "Task is already running.",
      };
    }

    if (task.status === "Completed") {
      return {
        success: true,
        task,
        message: "Task is already completed.",
      };
    }

    // ---------------------------------------------
    // Start task
    // ---------------------------------------------

    const updatedTask =
      kernel.updateTaskStatus(
        missionId,
        taskId,
        "Running"
      );

    if (!updatedTask) {
      return {
        success: false,
        task: null,
        message:
          "Failed to change task status to Running.",
      };
    }

    console.log("");
    console.log("=================================");
    console.log("TASK STARTED");
    console.log("=================================");
    console.log("Mission:", missionId);
    console.log("Task:", updatedTask.id);
    console.log("Title:", updatedTask.title);
    console.log(
      "Department:",
      updatedTask.department
    );
    console.log("Owner:", updatedTask.owner);
    console.log(
      "Dependency:",
      updatedTask.dependency
    );
    console.log("Status:", updatedTask.status);
    console.log("=================================");
    console.log("");

    // ---------------------------------------------
    // Temporary execution
    // ---------------------------------------------

    console.log(
      "Execution Engine: task is ready for Agent execution."
    );

    return {
      success: true,
      task: updatedTask,
      message:
        "Task successfully moved to Running state.",
    };
  }
}

export const executionEngine =
  new PandeyOSExecutionEngine();