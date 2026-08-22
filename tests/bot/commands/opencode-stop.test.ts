import { describe, expect, it, vi } from "vitest";
import type { Context } from "grammy";
import { t } from "../../../src/i18n/index.js";

import { opencodeStopCommand } from "../../../src/bot/commands/opencode-stop-command.js";

function createContext(): Context {
  return {
    reply: vi.fn().mockResolvedValue(undefined),
  } as unknown as Context;
}

describe("bot/commands/opencode-stop-command", () => {
  it("explains that the server is owned by the supervisor", async () => {
    const ctx = createContext();

    await opencodeStopCommand(ctx as never);

    expect(ctx.reply).toHaveBeenCalledWith(t("opencode_stop.supervised_message"));
  });
});
