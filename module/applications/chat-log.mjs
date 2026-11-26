import { EGREGORA_CONFIG } from "../config.mjs";
import { canUserActOnChatMessage } from "../documents/chat-message.mjs";
import {
  acceptEgregoraRoll,
  applyTargetDamage,
  pushEgregoraRoll,
  rollContaminationTest,
  rollCriticalTable,
  rollPanicTable,
} from "../helpers/rolls.mjs";

export class EgregoraChatLog extends foundry.applications.sidebar.tabs.ChatLog {
  static DEFAULT_OPTIONS = {
    actions: {
      pushRoll: EgregoraChatLog.#pushRoll,
      acceptRoll: EgregoraChatLog.#acceptRoll,
      applyTargetDamage: EgregoraChatLog.#applyTargetDamage,
      rollContamination: EgregoraChatLog.#rollContamination,
      rollPanic: EgregoraChatLog.#rollPanic,
      rollCritTable: EgregoraChatLog.#rollCritTable,
    },
  };

  static async #pushRoll(event) {
    await pushEgregoraRoll(event);
  }

  static async #acceptRoll(event) {
    await acceptEgregoraRoll(event);
  }

  static async #applyTargetDamage(event) {
    await applyTargetDamage(event);
  }

  static async #rollContamination(event) {
    const messageId = event.target.closest("[data-message-id]")?.dataset?.messageId;
    const message = game.messages.get(messageId);
    if (message && !canUserActOnChatMessage(message)) return;
    const actor = game.actors.get(message?.speaker?.actor) || game.user.character;
    if (actor) await rollContaminationTest(actor);
  }

  static async #rollPanic(event) {
    const messageId = event.target.closest("[data-message-id]")?.dataset?.messageId;
    const message = game.messages.get(messageId);
    if (message && !canUserActOnChatMessage(message)) return;
    const actor = game.actors.get(message?.speaker?.actor) || game.user.character;
    await rollPanicTable(actor);
  }

  static async #rollCritTable(event) {
    const messageId = event.target.closest("[data-message-id]")?.dataset?.messageId;
    const message = game.messages.get(messageId);
    if (message && !canUserActOnChatMessage(message)) return;
    const flags = message?.flags?.[EGREGORA_CONFIG.ID] ?? {};

    let actor = null;
    const savedTargetUuid = flags.targets?.[0]?.tokenUuid;
    if (savedTargetUuid) {
      const doc = await fromUuid(savedTargetUuid);
      actor = doc?.actor ?? null;
    }
    if (!actor) {
      const firstTarget = Array.from(game.user?.targets ?? [])[0];
      actor = firstTarget?.actor ?? null;
    }
    if (!actor) {
      actor = game.actors.get(message?.speaker?.actor) || game.user.character;
    }
    await rollCriticalTable(actor, false);
  }
}
