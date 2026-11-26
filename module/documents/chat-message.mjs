import { EGREGORA_CONFIG } from "../config.mjs";

/**
 * Resolve de forma síncrona se o usuário atual é dono do ator alvo de um prompt de absorção.
 */
function isTargetActorOwner(flags) {
  if (!flags) return false;
  let actor = null;
  if (flags.targetActorUuid && typeof fromUuidSync === "function") {
    const doc = fromUuidSync(flags.targetActorUuid);
    actor = doc?.actor ?? (doc instanceof Actor ? doc : null);
  }
  if (!actor && flags.targetActorId) {
    actor = game.actors?.get(flags.targetActorId) ?? null;
  }
  if (actor) {
    return Boolean(actor.isOwner);
  }
  if (Array.isArray(flags.targetOwnerIds) && game.user?.id) {
    return flags.targetOwnerIds.includes(game.user.id);
  }
  return false;
}

/**
 * Verifica se o usuário atual tem permissão para ver e acionar botões pós-rolagem
 * de uma ChatMessage:
 * - Cards de Absorção de Armadura (`promptType === "armorAbsorption"`): apenas dono do alvo ou GM.
 * - Cards de Rolagem/Ataque/Magia: apenas o autor da rolagem ou GM.
 */
export function canUserActOnChatMessage(message) {
  if (!message) return false;
  if (game.user?.isGM) return true;
  const flags = message.flags?.[EGREGORA_CONFIG.ID] ?? {};

  if (flags.promptType === "armorAbsorption") {
    return isTargetActorOwner(flags);
  }

  const rollerUserId = flags.rollerUserId || message.author?.id || "";
  return Boolean(rollerUserId && rollerUserId === game.user?.id);
}

/**
 * Oculta/remove todos os botões interativos (.dice-buttons) de uma mensagem no DOM
 * quando o usuário atual não tiver permissão para agir sobre ela.
 */
export function enforceChatButtonVisibility(message, html) {
  if (!message || !html) return;
  const flags = message.flags?.[EGREGORA_CONFIG.ID] ?? {};
  const isPrompt = flags.promptType === "armorAbsorption";
  if (!isPrompt && (!message.rolls || !message.rolls.length)) return;
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
