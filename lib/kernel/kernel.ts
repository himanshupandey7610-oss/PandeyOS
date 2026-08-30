export type TaskStatus =
  | "Pending"
  | "Running"
  | "Completed"
  | "Failed";

export type KernelTask = {
  id: string;
  title: string;
  department: string;
  status: TaskStatus;
  owner?: string;
  dependency?: string;
  expectedOutput?: string;
};

export type KernelMission = {
  id: string;
  goal: string;
  status: "Pending" | "Running" | "Completed" | "Failed";
  tasks: KernelTask[];
  createdAt: string;

  // CEO Agent plan
  plan?: string;

  // Agent responsible for starting the mission
  nextAction?: string;

  // Final expected result
  finalDeliverable?: string;
};

export type CreateTaskInput = {
  title: string;
  department?: string;
  owner?: string;
  dependency?: string;
  expectedOutput?: string;
};

export type CreateMissionOptions = {
  plan?: string;
  nextAction?: string;
  finalDeliverable?: string;
  tasks?: CreateTaskInput[];
};

class PandeyOSKernel {
  private missions: KernelMission[] = [];

  /**
   * Create a new mission.
   *
   * The kernel itself does not decide what the tasks should be.
   * The CEO Agent provides the workforce plan and tasks.
   */
  createMission(
    goal: string,
    options: CreateMissionOptions = {}
  ): KernelMission {
    const missionId = `mission-${Date.now()}`;

    const tasks: KernelTask[] = (options.tasks ?? []).map(
      (task, index) => ({
        id: `${missionId}-task-${index + 1}`,
        title: task.title,
        department: task.department ?? "General",
        status: "Pending",
        owner: task.owner,
        dependency: task.dependency,
        expectedOutput: task.expectedOutput,
      })
    );

    const mission: KernelMission = {
      id: missionId,
      goal,
      status: "Pending",
      tasks,
      createdAt: new Date().toISOString(),
      plan: options.plan,
      nextAction: options.nextAction,
      finalDeliverable: options.finalDeliverable,
    };

    this.missions.push(mission);

    console.log("=================================");
    console.log("PandeyOS Kernel: Mission Created");
    console.log("Mission ID:", missionId);
    console.log("Goal:", goal);
    console.log("Tasks:", tasks.length);
    console.log("=================================");

    return mission;
  }

  /**
   * Add a task to an existing mission.
   */
  addTask(
    missionId: string,
    input: CreateTaskInput
  ): KernelTask | null {
    const mission = this.getMission(missionId);

    if (!mission) {
      return null;
    }

    const taskNumber = mission.tasks.length + 1;

    const task: KernelTask = {
      id: `${missionId}-task-${taskNumber}`,
      title: input.title,
      department: input.department ?? "General",
      status: "Pending",
      owner: input.owner,
      dependency: input.dependency,
      expectedOutput: input.expectedOutput,
    };

    mission.tasks.push(task);

    return task;
  }

  /**
   * Get a single mission.
   */
  getMission(id: string): KernelMission | null {
    return (
      this.missions.find((mission) => mission.id === id) ?? null
    );
  }

  /**
   * Get all missions.
   */
  getAllMissions(): KernelMission[] {
    return this.missions;
  }

  /**
   * Get all tasks belonging to a mission.
   */
  getTasks(missionId: string): KernelTask[] {
    const mission = this.getMission(missionId);

    if (!mission) {
      return [];
    }

    return mission.tasks;
  }

  /**
   * Get a single task.
   */
  getTask(
    missionId: string,
    taskId: string
  ): KernelTask | null {
    const mission = this.getMission(missionId);

    if (!mission) {
      return null;
    }

    return (
      mission.tasks.find((task) => task.id === taskId) ?? null
    );
  }

  /**
   * Update task status.
   */
  updateTaskStatus(
    missionId: string,
    taskId: string,
    status: KernelTask["status"]
  ): KernelTask | null {
    const mission = this.getMission(missionId);

    if (!mission) {
      return null;
    }

    const task = mission.tasks.find(
      (task) => task.id === taskId
    );

    if (!task) {
      return null;
    }

    task.status = status;

    // Automatically update mission status.
    this.updateMissionStatus(missionId);

    return task;
  }

  /**
   * Update mission status based on task states.
   */
  private updateMissionStatus(
    missionId: string
  ): KernelMission | null {
    const mission = this.getMission(missionId);

    if (!mission) {
      return null;
    }

    // No tasks yet = mission stays pending.
    if (mission.tasks.length === 0) {
      mission.status = "Pending";
      return mission;
    }

    const hasFailed = mission.tasks.some(
      (task) => task.status === "Failed"
    );

    if (hasFailed) {
      mission.status = "Failed";
      return mission;
    }

    const allCompleted = mission.tasks.every(
      (task) => task.status === "Completed"
    );

    if (allCompleted) {
      mission.status = "Completed";
      return mission;
    }

    const hasRunning = mission.tasks.some(
      (task) => task.status === "Running"
    );

    if (hasRunning) {
      mission.status = "Running";
      return mission;
    }

    mission.status = "Pending";

    return mission;
  }

  /**
   * Manually update mission status.
   */
  updateMissionStatusManually(
    missionId: string,
    status: KernelMission["status"]
  ): KernelMission | null {
    const mission = this.getMission(missionId);

    if (!mission) {
      return null;
    }

    mission.status = status;

    return mission;
  }

  /**
   * Delete a mission.
   */
  deleteMission(missionId: string): boolean {
    const index = this.missions.findIndex(
      (mission) => mission.id === missionId
    );

    if (index === -1) {
      return false;
    }

    this.missions.splice(index, 1);

    return true;
  }

  /**
   * Clear all missions.
   *
   * Useful during development/testing.
   */
  clearMissions(): void {
    this.missions = [];
  }
}

export const kernel = new PandeyOSKernel();