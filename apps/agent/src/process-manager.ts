import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import type { BotInstanceStatus } from "@nexusbot/shared";
import { env } from "./config/env";
import { logger } from "./lib/logger";

interface ProcessManagerEvents {
  log: (payload: { stream: "stdout" | "stderr" | "system"; line: string }) => void;
  status: (payload: { status: BotInstanceStatus; pid?: number | null; exitCode?: number | null }) => void;
}

/**
 * Owns the lifecycle of the single child process this agent is responsible
 * for. Only ever runs `env.NEXUS_START_COMMAND` — that command is fixed at
 * agent startup from local config and is never overridable remotely.
 */
export class ProcessManager extends EventEmitter {
  private child: ChildProcess | null = null;
  private status: BotInstanceStatus = "READY";
  private stopRequested = false;

  override on<K extends keyof ProcessManagerEvents>(event: K, listener: ProcessManagerEvents[K]): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }

  getStatus(): BotInstanceStatus {
    return this.status;
  }

  private setStatus(status: BotInstanceStatus, extra?: { pid?: number | null; exitCode?: number | null }) {
    this.status = status;
    this.emit("status", { status, pid: extra?.pid ?? this.child?.pid ?? null, exitCode: extra?.exitCode ?? null });
  }

  private log(line: string, stream: "stdout" | "stderr" | "system" = "system") {
    this.emit("log", { stream, line });
  }

  start(): void {
    if (this.child) {
      this.log("Start requested but process is already running; ignoring.");
      return;
    }

    this.stopRequested = false;
    this.setStatus("STARTING");
    this.log(`Starting: ${env.NEXUS_START_COMMAND} (cwd=${env.NEXUS_WORKING_DIR})`);

    const child = spawn(env.NEXUS_START_COMMAND, {
      cwd: env.NEXUS_WORKING_DIR,
      shell: true,
      env: process.env,
      // With shell:true, `child.pid` is the *shell's* pid, and the actual
      // start command runs as its child — killing just the shell leaves
      // that grandchild running, orphaned and invisible to this panel.
      // `detached: true` makes the shell the leader of a new process group
      // that the command inherits, so `killProcessTree` below can signal
      // the whole group at once via `process.kill(-pid, signal)`.
      detached: true,
    });
    this.child = child;

    child.stdout?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString("utf8").split(/\r?\n/).filter(Boolean)) {
        this.emit("log", { stream: "stdout", line });
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString("utf8").split(/\r?\n/).filter(Boolean)) {
        this.emit("log", { stream: "stderr", line });
      }
    });

    child.once("spawn", () => {
      this.setStatus("ONLINE", { pid: child.pid });
      this.log(`Process online (pid=${child.pid}).`);
    });

    child.once("error", (err) => {
      logger.error({ err }, "Failed to spawn child process");
      this.log(`Failed to start: ${err.message}`);
      this.child = null;
      this.setStatus("CRASHED", { exitCode: null });
    });

    child.once("exit", (code, signal) => {
      const wasStopRequested = this.stopRequested;
      this.child = null;
      this.log(`Process exited (code=${code ?? "null"}, signal=${signal ?? "null"}).`);

      if (wasStopRequested) {
        this.setStatus("READY", { exitCode: code });
      } else {
        this.setStatus("CRASHED", { exitCode: code });
        if (env.NEXUS_RESTART_ON_CRASH) {
          this.log("Restart-on-crash is enabled; restarting in 3s.");
          setTimeout(() => this.start(), 3000);
        }
      }
    });
  }

  stop(): void {
    if (!this.child) {
      this.log("Stop requested but no process is running; ignoring.");
      this.setStatus("READY");
      return;
    }

    this.stopRequested = true;
    this.setStatus("STOPPING");
    this.log(`Stopping process (pid=${this.child.pid}) with ${env.NEXUS_STOP_SIGNAL}.`);
    killProcessTree(this.child, env.NEXUS_STOP_SIGNAL as NodeJS.Signals);

    const child = this.child;
    setTimeout(() => {
      if (this.child === child && child && !child.killed) {
        this.log("Process did not exit in time; sending SIGKILL.");
        killProcessTree(child, "SIGKILL");
      }
    }, env.NEXUS_STOP_TIMEOUT_MS);
  }

  restart(): void {
    if (!this.child) {
      this.start();
      return;
    }
    this.log("Restart requested.");

    const onStatus: ProcessManagerEvents["status"] = (payload) => {
      if (payload.status === "READY") {
        this.off("status", onStatus);
        this.start();
      }
    };
    this.on("status", onStatus);
    this.stop();
  }

  shutdown(): void {
    if (this.child) {
      killProcessTree(this.child, env.NEXUS_STOP_SIGNAL as NodeJS.Signals);
    }
  }
}

/**
 * Signals the whole process group of a `detached: true` child (covers the
 * shell wrapper *and* whatever it exec'd/forked), falling back to killing
 * just the direct child if group-signalling isn't available (e.g. Windows,
 * where negative pids aren't meaningful).
 */
function killProcessTree(child: ChildProcess, signal: NodeJS.Signals): void {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}
