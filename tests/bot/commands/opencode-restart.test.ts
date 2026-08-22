import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChildProcess } from "node:child_process";
import type { Context } from "grammy";
import { t } from "../../../src/i18n/index.js";

const mocked = vi.hoisted(() => ({
  healthMock: vi.fn(),
  resolveLocalOpencodeTargetMock: vi.fn(),
  launchSafeRestartMock: vi.fn(),
  waitForSupervisedServerReadyMock: vi.fn(),
  editBotTextMock: vi.fn(),
  loggerDebugMock: vi.fn(),
  loggerInfoMock: vi.fn(),
  loggerWarnMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  config: {
    opencode: {
      apiUrl: "http://localhost:4096",
    },
  },
}));

vi.mock("../../../src/config.js", () => ({ config: mocked.config }));
vi.mock("../../../src/opencode/client.js", () => ({
  opencodeClient: { global: { health: mocked.healthMock } },
}));
vi.mock("../../../src/opencode/process.js", () => ({
  resolveLocalOpencodeTarget: mocked.resolveLocalOpencodeTargetMock,
}));
vi.mock("../../../src/opencode/supervised-server-control.js", () => ({
  launchSafeRestart: mocked.launchSafeRestartMock,
  waitForSupervisedServerReady: mocked.waitForSupervisedServerReadyMock,
}));
vi.mock("../../../src/bot/messages/telegram-text.js", () => ({
  editBotText: mocked.editBotTextMock,
}));
vi.mock("../../../src/utils/logger.js", () => ({
  logger: {
    debug: mocked.loggerDebugMock,
    info: mocked.loggerInfoMock,
    warn: mocked.loggerWarnMock,
    error: mocked.loggerErrorMock,
  },
}));

import { opencodeRestartCommand } from "../../../src/bot/commands/opencode-restart-command.js";

function createContext(): Context {
  return {
    chat: { id: 42, type: "private" },
    api: {},
    reply: vi.fn().mockResolvedValue({ message_id: 10 }),
  } as unknown as Context;
}

function createChildProcess(): ChildProcess {
  return { once: vi.fn() } as unknown as ChildProcess;
}

describe("bot/commands/opencode-restart-command", () => {
  beforeEach(() => {
    mocked.healthMock.mockReset();
    mocked.resolveLocalOpencodeTargetMock.mockReset();
    mocked.launchSafeRestartMock.mockReset();
    mocked.waitForSupervisedServerReadyMock.mockReset();
    mocked.editBotTextMock.mockReset();
    mocked.loggerDebugMock.mockReset();
    mocked.loggerInfoMock.mockReset();
    mocked.loggerWarnMock.mockReset();
    mocked.loggerErrorMock.mockReset();

    mocked.config.opencode.apiUrl = "http://localhost:4096";
    mocked.resolveLocalOpencodeTargetMock.mockReturnValue({ host: "localhost", port: 4096 });
    mocked.launchSafeRestartMock.mockReturnValue(createChildProcess());
    mocked.waitForSupervisedServerReadyMock.mockResolvedValue(true);
    mocked.healthMock.mockResolvedValue({ data: { healthy: true, version: "1.2.3" }, error: null });
    mocked.editBotTextMock.mockResolvedValue(undefined);
  });

  it("warns when the configured OpenCode URL is remote", async () => {
    const ctx = createContext();
    mocked.config.opencode.apiUrl = "https://example.com";
    mocked.resolveLocalOpencodeTargetMock.mockReturnValue(null);

    await opencodeRestartCommand(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith(t("opencode_restart.remote_configured"));
    expect(mocked.launchSafeRestartMock).not.toHaveBeenCalled();
  });

  it("launches the safe helper and waits for authenticated readiness", async () => {
    const ctx = createContext();

    await opencodeRestartCommand(ctx as never);

    expect(mocked.launchSafeRestartMock).toHaveBeenCalledOnce();
    expect(mocked.waitForSupervisedServerReadyMock).toHaveBeenCalledOnce();
    expect(mocked.editBotTextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        text: t("opencode_restart.success", { version: "1.2.3" }),
      }),
    );
  });

  it("reports a restart that never becomes ready", async () => {
    const ctx = createContext();
    mocked.waitForSupervisedServerReadyMock.mockResolvedValue(false);

    await opencodeRestartCommand(ctx as never);

    expect(mocked.editBotTextMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ text: t("opencode_restart.error") }),
    );
  });
});
