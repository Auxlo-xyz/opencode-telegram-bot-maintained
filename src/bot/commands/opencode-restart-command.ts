import { CommandContext, Context } from "grammy";
import { config } from "../../config.js";
import { opencodeClient } from "../../opencode/client.js";
import { resolveLocalOpencodeTarget } from "../../opencode/process.js";
import {
  launchSafeRestart,
  waitForSupervisedServerReady,
} from "../../opencode/supervised-server-control.js";
import { logger } from "../../utils/logger.js";
import { t } from "../../i18n/index.js";
import { editBotText } from "../messages/telegram-text.js";

export async function opencodeRestartCommand(ctx: CommandContext<Context>): Promise<void> {
  try {
    const localTarget = resolveLocalOpencodeTarget(config.opencode.apiUrl);
    if (!localTarget) {
      await ctx.reply(t("opencode_restart.remote_configured"));
      return;
    }

    const statusMessage = await ctx.reply(t("opencode_restart.starting"));
    const childProcess = launchSafeRestart();
    childProcess.once("error", (error) => {
      logger.error("[Bot] Safe OpenCode restart process failed to start", error);
    });

    const ready = await waitForSupervisedServerReady();
    if (!ready) {
      await editBotText({
        api: ctx.api,
        chatId: ctx.chat.id,
        messageId: statusMessage.message_id,
        text: t("opencode_restart.error"),
      });
      return;
    }

    const health = (await opencodeClient.global.health()).data;
    await editBotText({
      api: ctx.api,
      chatId: ctx.chat.id,
      messageId: statusMessage.message_id,
      text: t("opencode_restart.success", {
        version: health?.version || t("common.unknown"),
      }),
    });

    logger.info(
      `[Bot] OpenCode server safely restarted under supervisor, port=${localTarget.port}`,
    );
  } catch (err) {
    logger.error("[Bot] Error in safe OpenCode restart command:", err);
    await ctx.reply(t("opencode_restart.error"));
  }
}
