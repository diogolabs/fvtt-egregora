import { EGREGORA_CONFIG } from "../config.mjs";

/**
 * Verifica se o usuário atual tem permissão para ver e acionar botões pós-rolagem
 * (Forçar, Aceitar, Aplicar Dano, Crítico, Contaminação) de uma ChatMessage.
 * Apenas o Narrador (GM) ou o autor da rolagem podem vê-los e usá-los.
 */
export function canUserActOnChatMessage(message) {
  if (!message) return false;
  if (game.user?.isGM) return true;
  const flags = message.flags?.[EGREGORA_CONFIG.ID] ?? {};
  const rollerUserId = flags.rollerUserId || message.author?.id || "";
  return Boolean(rollerUserId && rollerUserId === game.user?.id);
}

/**
 * Oculta/remove todos os botões pós-rolagem (.dice-buttons) de uma mensagem no DOM
 * quando o usuário atual não for o autor da rolagem nem o Narrador.
 */
export function enforceChatButtonVisibility(message, html) {
  if (!message || !html) return;
  if (!message.rolls || !message.rolls.length) return;
  if (canUserActOnChatMessage(message)) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  root?.querySelectorAll?.(".dice-buttons").forEach(el => el.remove());
}

export class EgregoraChatMessage extends foundry.documents.ChatMessage {
  async renderHTML({ canDelete, canClose = false, ...rest } = {}) {
    const html = await super.renderHTML({ canDelete, canClose, ...rest });
    enforceChatButtonVisibility(this, html);
    return html;
  }
}
