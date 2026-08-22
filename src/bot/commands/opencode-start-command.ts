import { CommandContext, Context } from "grammy";
import { config } from "../../config.js";
import { opencodeClient } from "../../opencode/client.js";
import { resolveLocalOpencodeTarget } from "../../opencode/process.js";
import {
  launchSupervisor,
  waitForSupervisedServerReady,
} from "../../opencode/supervised-server-control.js";
import { opencodeReadyLifecycle } from "../../opencode/ready-lifecycle.js";
import { logger } from "../../utils/logger.js";
import { t } from "../../i18n/index.js";
import { editBotText } from "../messages/telegram-text.js";

export async function opencodeStartCommand(ctx: CommandContext<Context>): Promise<void> {
  try {
    const localTarget = resolveLocalOpencodeTarget(config.opencode.apiUrl);
    if (!localTarget) {
      await ctx.reply(t("opencode_start.remote_configured"));
      return;
    }

    try {
      const { data, error } = await opencodeClient.global.health();
      if (!error && data?.healthy) {
        await ctx.reply(
          t("opencode_start.already_running", { version: data.version || t("common.unknown") }),
        );
        await opencodeReadyLifecycle.notifyReady("opencode_start_already_running");
        return;
      }
    } catch {
      // The supervisor will start or recover the server below.
    }

    const statusMessage = await ctx.reply(t("opencode_start.starting"));
    const childProcess = launchSupervisor();
    childProcess.once("error", (error) => {
      logger.error("[Bot] Telegram supervisor failed to start", error);
    });

    const ready = await waitForSupervisedServerReady();
    if (!ready) {
      await editBotText({
        api: ctx.api,
        chatId: ctx.chat.id,
        messageId: statusMessage.message_id,
        text: t("opencode_start.started_not_ready"),
      });
      return;
    }

    const health = (await opencodeClient.global.health()).data;
    await editBotText({
      api: ctx.api,
      chatId: ctx.chat.id,
      messageId: statusMessage.message_id,
      text: t("opencode_start.supervised_success", {
        version: health?.version || t("common.unknown"),
      }),
    });

    logger.info(`[Bot] OpenCode server started under supervisor, port=${localTarget.port}`);
    await opencodeReadyLifecycle.notifyReady("opencode_start_success");
  } catch (err) {
    logger.error("[Bot] Error in /opencode-start command:", err);
    await ctx.reply(t("opencode_start.error"));
  }
}
