import { spawn, type ChildProcess } from "node:child_process";
import { opencodeClient } from "./client.js";

const DEFAULT_SUPERVISOR_PATH = "/workspace/bin/opencode-telegram-supervise";
const DEFAULT_RESTART_PATH = "/workspace/bin/opencode-telegram-restart";
const DEFAULT_WORKING_DIRECTORY = "/workspace";
const HEALTH_CHECK_TIMEOUT_MS = 3_000;

function resolveConfiguredPath(environmentKey: string, fallback: string): string {
  const configuredPath = process.env[environmentKey]?.trim();
  return configuredPath || fallback;
}

function launchDetached(path: string): ChildProcess {
  const childProcess = spawn(path, [], {
    cwd: resolveConfiguredPath("OPENCODE_TELEGRAM_SUPERVISOR_CWD", DEFAULT_WORKING_DIRECTORY),
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });
  childProcess.unref();
  return childProcess;
}

export function launchSupervisor(): ChildProcess {
  return launchDetached(
    resolveConfiguredPath("OPENCODE_TELEGRAM_SUPERVISOR_PATH", DEFAULT_SUPERVISOR_PATH),
  );
}

export function launchSafeRestart(): ChildProcess {
  return launchDetached(
    resolveConfiguredPath("OPENCODE_TELEGRAM_RESTART_PATH", DEFAULT_RESTART_PATH),
  );
}

async function healthWithTimeout(timeoutMs: number = HEALTH_CHECK_TIMEOUT_MS): Promise<boolean> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const result = await Promise.race([
      opencodeClient.global.health({ signal: controller.signal }),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve(null);
        }, timeoutMs);
      }),
    ]);

    return result?.data?.healthy === true;
  } catch {
    return false;
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function waitForSupervisedServerReady(
  maxWaitMs: number = 15_000,
  pollIntervalMs: number = 500,
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    if (await healthWithTimeout()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  return false;
}
