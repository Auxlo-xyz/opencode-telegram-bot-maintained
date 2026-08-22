import { CommandContext, Context } from "grammy";
import { t } from "../../i18n/index.js";

/**
 * The Vellum deployment owns OpenCode through an external supervisor.
 * Killing only the child would make the supervisor immediately start it again.
 */
export async function opencodeStopCommand(ctx: CommandContext<Context>): Promise<void> {
  await ctx.reply(t("opencode_stop.supervised_message"));
}
