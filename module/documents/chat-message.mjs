import { EGREGORA_CONFIG } from "../config.mjs";

export class EgregoraChatMessage extends foundry.documents.ChatMessage {
  async renderHTML({ canDelete, canClose = false, ...rest } = {}) {
    const html = await super.renderHTML({ canDelete, canClose, ...rest });
    if (!this.rolls || !this.rolls.length) return html;

    const flags = this.flags?.[EGREGORA_CONFIG.ID] ?? {};
    const rollerUserId = flags.rollerUserId || this.author?.id || "";
    const isRoller = rollerUserId ? rollerUserId === game.user.id : false;

    if (game.user.isGM || isRoller) {
      return html;
    }

    html.querySelectorAll(".dice-buttons").forEach(el => el.remove());
    return html;
  }
}
