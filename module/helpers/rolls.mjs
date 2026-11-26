import { YearZeroRoll } from "../../lib/yzur.js";
import { EGREGORA_CONFIG } from "../config.mjs";
import { canUserActOnChatMessage } from "../documents/chat-message.mjs";
import { decorateEgregoraRoll } from "./dice-so-nice.mjs";

const getRenderTemplate = () =>
  foundry.applications?.handlebars?.renderTemplate ?? globalThis.renderTemplate;

const V13_TO_V14_MODES = {
  publicroll: "public",
  gmroll: "gm",
  blindroll: "blind",
  selfroll: "self",
};

const V14_TO_V13_MODES = {
  public: "publicroll",
  gm: "gmroll",
  blind: "blindroll",
  self: "selfroll",
};

export function isFoundryV14() {
  return (game.release?.generation ?? 13) >= 14;
}

export function getDefaultRollMode() {
  if (isFoundryV14() || game.settings?.settings?.has("core.messageMode")) {
    return game.settings.get("core", "messageMode");
  }
  return game.settings.get("core", "rollMode");
}

export function normalizeRollMode(mode) {
  const raw = mode || getDefaultRollMode();
  if (isFoundryV14()) {
    return V13_TO_V14_MODES[raw] ?? raw ?? "public";
  }
  return V14_TO_V13_MODES[raw] ?? raw ?? "publicroll";
}

export function buildToMessageOptions(mode, create = true) {
  const normalized = normalizeRollMode(mode);
  if (isFoundryV14()) {
    return { messageMode: normalized, create };
  }
  return { rollMode: normalized, create };
}

/**
 * Aguarda a animação 3D do Dice So Nice com proteção contra travamentos/erros
 * e garante que a mensagem nunca fique presa com a classe .dsn-hide no chat.
 */
async function waitForDice3DSafe(messageId, timeoutMs = 6000) {
  if (!messageId) return;
  try {
    if (game.dice3d && typeof game.dice3d.waitFor3DAnimationByMessageID === "function") {
      await Promise.race([
        game.dice3d.waitFor3DAnimationByMessageID(messageId),
        new Promise(resolve => setTimeout(resolve, timeoutMs)),
      ]);
    }
  } catch (err) {
    console.warn("fvtt-egregora | Dice So Nice animation wait error:", err);
  }

  // Rede de segurança: se o DSN deixou a mensagem oculta após erro/timeout, revela no chat
  try {
    const selectors = [
      `.message[data-message-id="${messageId}"]`,
      `#chat-notifications .message[data-message-id="${messageId}"]`,
    ];
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => {
        if (el.classList.contains("dsn-hide")) {
          el.classList.remove("dsn-hide");
        }
        el.querySelectorAll(".dsn-hide").forEach(sub => sub.classList.remove("dsn-hide"));
      });
    }
  } catch {
    // ignore DOM fallback errors
  }
}

/**
 * Normaliza a lista de Caminhos de Magia selecionados (1 a 6) na ordem oficial.
 */
export function normalizeMagicPaths(paths = null, primaryPath = "echoes", secondaryPath = "") {
  const validOrder = Object.keys(EGREGORA_CONFIG.magicPaths);
  const raw = Array.isArray(paths) && paths.length
    ? paths
    : [primaryPath, secondaryPath].filter(Boolean);
  const cleaned = validOrder.filter(k => raw.includes(k));
  if (cleaned.length) return cleaned;
  return validOrder.includes(primaryPath) ? [primaryPath] : ["echoes"];
}

/**
 * Captura um snapshot dos tokens atualmente marcados como alvo (Target) pelo usuário atual.
 * Garante que apenas os alvos marcados por quem fez a rolagem sejam associados à mensagem.
 */
export function captureUserTargets() {
  const targets = Array.from(game.user?.targets ?? []);
  return targets
    .filter(t => t?.document?.uuid && t?.actor)
    .map(t => ({
      tokenUuid: t.document.uuid,
      actorUuid: t.actor.uuid,
      name: t.name || t.actor.name || "—",
      img: t.document.texture?.src || t.actor.img || "icons/svg/mystery-man.svg",
    }));
}

/**
 * Renderiza o conteúdo HTML do card de Conjuração Mágica (usado no cast inicial, Push e Aceitar).
 */
async function renderSpellCardContent(roll, cardData) {
  const successes = roll.successCount;
  const banes = roll.attributeTrauma;
  const qualityEntry = successes > 0
    ? EGREGORA_CONFIG.magicSuccessQuality.find(q => successes >= q.min && successes <= q.max)
    : null;
  const qualityTitle = qualityEntry ? game.i18n.localize(`EGREGORA.Magic.Quality.${qualityEntry.key}.title`) : "";
  const qualityDesc = qualityEntry ? game.i18n.localize(`EGREGORA.Magic.Quality.${qualityEntry.key}.desc`) : "";
  const highestPathVal = Number(cardData.highestPathVal) || 0;
  const calculatedDamage = cardData.directDamage && successes > 0
    ? Math.max(1, highestPathVal) + (successes - 1)
    : 0;

  // Garante que o YearZeroRoll tenha options.damage sincronizado com directDamage
  // para que o botão Aplicar Dano de roll.hbs apareça automaticamente após Aceitar/Push
  if (cardData.directDamage && !roll.options.damage) {
    roll.options.damage = Math.max(1, highestPathVal);
  }

  const renderTemplate = getRenderTemplate();
  return renderTemplate("systems/fvtt-egregora/templates/chat/spell-cast.hbs", {
    spellImg: cardData.spellImg || "systems/fvtt-egregora/assets/icons/spell.svg",
    spellTitle: cardData.spellTitle,
    attributeLabel: cardData.attributeLabel,
    pathsDisplay: cardData.pathsDisplay,
    costPoolLabel: cardData.costPoolLabel,
    totalCost: cardData.totalCost,
    successes,
    banes,
    qualityTitle,
    qualityDesc,
    calculatedDamage,
    contaminationTriggered: Boolean(cardData.contaminationTriggered),
    rollHtml: await roll.render(),
  });
}

/**
 * Calcula a pilha de dados D6 (Atributo + Perícia + Equipamento + Modificadores).
 * Penalidades removem primeiro de Perícia, depois Equipamento, depois Atributo.
 */
export function computeDicePool(attrDice = 0, skillDice = 0, gearDice = 0, totalMod = 0) {
  let base = Math.max(0, Number(attrDice) || 0);
  let skill = Math.max(0, Number(skillDice) || 0);
  let gear = Math.max(0, Number(gearDice) || 0);
  const mod = Number(totalMod) || 0;

  if (mod > 0) {
    skill += mod;
  } else if (mod < 0) {
    let rem = Math.abs(mod);
    const fromSkill = Math.min(skill, rem);
    skill -= fromSkill;
    rem -= fromSkill;

    const fromGear = Math.min(gear, rem);
    gear -= fromGear;
    rem -= fromGear;

    const fromBase = Math.min(base, rem);
    base -= fromBase;
  }

  return { base, skill, gear };
}

/**
 * Executa uma rolagem D6 Pool de Egrégora (com suporte a Dados de Corrupção, Orgulho e Dice So Nice 3D).
 */
export async function executeEgregoraRoll(actor, {
  attribute = "",
  attrScore = 0,
  skill = null,
  skillScore = 0,
  gear = null,
  gearBonus = 0,
  corruptionDice = 0,
  modifier = 0,
  maxPush = 1,
  flavor = "",
  damage = 0,
  usePride = false,
  rollMode = null,
  rollType = "skill",
  breakdown = [],
} = {}) {
  const pool = computeDicePool(attrScore, skillScore, gearBonus, modifier);
  const corrDice = Math.max(0, Number(corruptionDice) || 0);
  const formulaParts = [];

  if (pool.base > 0) formulaParts.push(`${pool.base}db`);
  if (pool.skill > 0) formulaParts.push(`${pool.skill}ds`);
  if (pool.gear > 0) formulaParts.push(`${pool.gear}dg`);
  if (corrDice > 0) formulaParts.push(`${corrDice}dk`);

  if (!formulaParts.length) {
    ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.NoDiceToRoll"));
    return null;
  }

  let contaminationTriggered = false;
  if (corrDice > 0 && actor?.system?.corruption !== undefined) {
    const prevPc = Number(actor.system.corruption.value) || 0;
    const nextPc = Math.min(10, prevPc + corrDice);
    await actor.update({ "system.corruption.value": nextPc });
    if (corrDice >= 2 || prevPc >= 4) {
      contaminationTriggered = true;
    }
  }

  const targetSnapshots = (damage > 0 || rollType === "weapon" || rollType === "vehicle-ram")
    ? captureUserTargets()
    : [];
  const targetsLabel = targetSnapshots.map(t => t.name).join(", ");

  const rollOptions = {
    game: "egregora",
    maxPush,
    damage: damage > 0 ? damage : undefined,
    breakdown,
    rollMode: normalizeRollMode(rollMode),
    rollType,
    attribute,
    prideBonus: usePride ? 1 : 0,
    corruptionAdded: corrDice,
    contaminationTriggered,
    targets: targetSnapshots,
    targetsLabel,
  };

  const roll = await new YearZeroRoll(formulaParts.join(" + "), { maxPush }, rollOptions).evaluate();
  decorateEgregoraRoll(roll, { actor, contaminationTriggered });

  if (usePride && actor?.system?.traits?.pride) {
    await actor.update({ "system.traits.pride.used": true });
  }

  const speaker = ChatMessage.getSpeaker({ actor });
  const message = await roll.toMessage(
    {
      speaker,
      flavor,
      flags: {
        [EGREGORA_CONFIG.ID]: {
          actorUuid: actor?.uuid ?? "",
          rollerUserId: game.user?.id ?? "",
          attribute,
          skillUuid: skill?.uuid ?? "",
          gearUuid: gear?.uuid ?? "",
          rollType,
          prideBonus: usePride ? 1 : 0,
          targets: targetSnapshots,
        },
      },
    },
    buildToMessageOptions(rollOptions.rollMode)
  );

  await waitForDice3DSafe(message.id);
  return message;
}

/**
 * Força (Push) uma rolagem no chat segundo as regras de Egrégora:
 * - Cada 1 em dado base causa 1 de dano em Saúde Física (FOR/AGI) ou Poder Mental (INT/EMP)
 * - Cada ponto perdido concede +1 Força de Vontade (até 10)
 * - Se Pontos de Perdição estiverem ativados, incrementa +1 para o Narrador
 */
export async function pushEgregoraRoll(event) {
  const messageId = event.target.closest("[data-message-id]")?.dataset?.messageId;
  const message = game.messages.get(messageId);
  if (!message || !message.rolls?.length) return null;
  if (!canUserActOnChatMessage(message)) return null;

  const flags = message.flags?.[EGREGORA_CONFIG.ID] ?? {};
  const actor = flags.actorUuid ? await fromUuid(flags.actorUuid) : game.actors.get(message.speaker?.actor);
  const gear = flags.gearUuid ? await fromUuid(flags.gearUuid) : null;
  const attribute = flags.attribute || message.rolls[0].options?.attribute || "strength";

  const roll = message.rolls[0].duplicate();
  await message.delete();
  await roll.push();
  decorateEgregoraRoll(roll, {
    actor,
    magicPath: flags.magicPath || null,
    magicPaths: flags.magicPaths || null,
    contaminationTriggered: Boolean(roll.options?.contaminationTriggered),
  });

  const trauma = roll.attributeTrauma || 0;
  const gearDmg = roll.gearDamage || 0;
  const pushSummary = [];

  if (actor && trauma > 0) {
    const isPhysical = EGREGORA_CONFIG.physicalAttributes.includes(attribute);
    const updates = {};
    if (isPhysical && actor.system.health) {
      updates["system.health.value"] = Math.max(0, actor.system.health.value - trauma);
      pushSummary.push(`${game.i18n.localize("EGREGORA.HealthShort")}: −${trauma}`);
    } else if (!isPhysical && actor.system.mental) {
      updates["system.mental.value"] = Math.max(0, actor.system.mental.value - trauma);
      pushSummary.push(`${game.i18n.localize("EGREGORA.MentalShort")}: −${trauma}`);
    }

    if (actor.system.willpower !== undefined) {
      const nextWp = Math.min(actor.system.willpower.max || 10, (actor.system.willpower.value || 0) + trauma);
      updates["system.willpower.value"] = nextWp;
      pushSummary.push(`+${trauma} ${game.i18n.localize("EGREGORA.WillpowerShort")}`);
    }

    if (Object.keys(updates).length) {
      await actor.update(updates);
    }
  }

  if (gear && gearDmg > 0) {
    const gearUpdates = {};
    const wearParts = [];
    let isBrokenNow = false;

    if (gear.system.durability !== undefined) {
      const prevDur = Number(gear.system.durability) || 0;
      const nextDur = Math.max(0, prevDur - gearDmg);
      gearUpdates["system.durability"] = nextDur;
      if (gear.system.maxDurability !== undefined && (Number(gear.system.maxDurability) || 0) < prevDur) {
        gearUpdates["system.maxDurability"] = prevDur;
      }
      wearParts.push(`−${gearDmg} ${game.i18n.localize("EGREGORA.DurabilityShort")} (${prevDur}→${nextDur})`);
      if (nextDur === 0) isBrokenNow = true;
    }

    if (gear.system.bonus !== undefined && (Number(gear.system.bonus) || 0) > 0) {
      const prevBonus = Number(gear.system.bonus) || 0;
      const nextBonus = Math.max(0, prevBonus - gearDmg);
      gearUpdates["system.bonus"] = nextBonus;
      if (gear.system.maxBonus !== undefined && (Number(gear.system.maxBonus) || 0) < prevBonus) {
        gearUpdates["system.maxBonus"] = prevBonus;
      }
      wearParts.push(`−${gearDmg} ${game.i18n.localize("EGREGORA.Bonus")} (${prevBonus}→${nextBonus})`);
      if (nextBonus === 0) isBrokenNow = true;
    }

    if (Object.keys(gearUpdates).length) {
      await gear.update(gearUpdates);
      const brokenTag = isBrokenNow ? ` [${game.i18n.localize("EGREGORA.GearBroken")}]` : "";
      pushSummary.push(`${gear.name}: ${wearParts.join(", ")}${brokenTag}`);
      if (isBrokenNow) {
        ui.notifications.warn(game.i18n.format("EGREGORA.Notifications.GearBroke", { name: gear.name }));
      }
    }
  }

  const enableDoom = game.settings.get(EGREGORA_CONFIG.ID, "enableDoomPoints");
  if (enableDoom) {
    if (game.user.isGM) {
      const curDoom = Number(game.settings.get(EGREGORA_CONFIG.ID, "doomPoints")) || 0;
      await game.settings.set(EGREGORA_CONFIG.ID, "doomPoints", curDoom + 1);
    }
    pushSummary.push(`+1 ${game.i18n.localize("EGREGORA.DoomPoint")}`);
  }

  if (pushSummary.length) {
    roll.options.pushCostSummary = pushSummary.join(" | ");
  }

  let newMessage;
  if (flags.rollType === "spell" && flags.spellCardData) {
    const content = await renderSpellCardContent(roll, flags.spellCardData);
    const chatData = {
      speaker: message.speaker,
      flavor: message.flavor,
      content,
      rolls: [roll],
      flags: message.flags,
    };
    if (typeof ChatMessage.applyRollMode === "function") {
      ChatMessage.applyRollMode(chatData, normalizeRollMode(roll.options.rollMode));
    }
    newMessage = await ChatMessage.create(chatData);
  } else {
    newMessage = await roll.toMessage(
      {
        speaker: message.speaker,
        flavor: message.flavor,
        flags: message.flags,
      },
      buildToMessageOptions(roll.options.rollMode)
    );
  }

  await waitForDice3DSafe(newMessage.id);
  return newMessage;
}

export async function acceptEgregoraRoll(event) {
  const messageEl = event.target.closest("[data-message-id]");
  const messageId = messageEl?.dataset?.messageId;
  const message = game.messages.get(messageId);
  if (!message || !message.rolls?.length) return null;
  if (!canUserActOnChatMessage(message)) return null;

  const roll = message.rolls[0].duplicate();
  roll.maxPush = 0;
  roll.options.maxPush = 0;

  const flags = message.flags?.[EGREGORA_CONFIG.ID] ?? {};
  const updateData = {};

  if (flags.rollType === "spell" && flags.spellCardData) {
    updateData.content = await renderSpellCardContent(roll, flags.spellCardData);
  }
  updateData.rolls = [roll.toJSON()];

  // Immediate visual feedback in the DOM before async round-trip completes
  messageEl?.querySelectorAll(".dice-button.push, .dice-button.accept").forEach(btn => {
    const row = btn.closest(".dice-buttons");
    btn.remove();
    if (row && !row.children.length) row.remove();
  });

  await message.update(updateData);

  // Force ChatLog re-render on both Foundry v13 & v14 so damage/crit buttons appear immediately without F5
  try {
    if (typeof ui.chat?.updateMessage === "function") {
      await ui.chat.updateMessage(message);
    }
  } catch (err) {
    console.warn("fvtt-egregora | Chat updateMessage refresh warning:", err);
  }

  return message;
}

/**
 * Conjuração Mágica de Egrégora:
 * Atributo + menor Foco entre 1 a 6 Caminhos combinados + Bônus de Fetiche + Dados de Corrupção.
 * Mescla os dados 3D de Caminho (ds) nas cores dos Caminhos combinados!
 */
export async function executeSpellCast(actor, {
  spell = null,
  spellName = "",
  attribute = "intelligence",
  paths = null,
  primaryPath = "echoes",
  secondaryPath = "",
  costPool = "willpower",
  costAmount = 1,
  fetishBonus = 0,
  corruptionDice = 0,
  modifier = 0,
  directDamage = false,
} = {}) {
  const selectedPaths = normalizeMagicPaths(
    paths ?? spell?.system?.selectedPaths,
    primaryPath || spell?.system?.primaryPath || "echoes",
    secondaryPath || spell?.system?.secondaryPath || ""
  );

  const attrVal = Number(actor?.system?.attributes?.[attribute]?.value) || 0;
  const pathVals = selectedPaths.map(p => Number(actor?.system?.magic?.paths?.[p]) || 0);
  const effectivePathVal = Math.min(...pathVals);
  const highestPathVal = Math.max(...pathVals);

  const corrDice = Math.max(0, Number(corruptionDice) || 0);
  const pool = computeDicePool(attrVal, effectivePathVal, fetishBonus, modifier);

  // Distribute skill (Magic Path) dice across all selected paths for blended 3D dice!
  const pathAllocations = [];
  if (pool.skill > 0) {
    const counts = new Array(selectedPaths.length).fill(0);
    for (let i = 0; i < pool.skill; i++) {
      counts[i % selectedPaths.length]++;
    }
    for (let i = 0; i < selectedPaths.length; i++) {
      if (counts[i] > 0) {
        pathAllocations.push({ path: selectedPaths[i], count: counts[i] });
      }
    }
  }

  const formulaParts = [];
  if (pool.base > 0) formulaParts.push(`${pool.base}db`);
  for (const alloc of pathAllocations) {
    formulaParts.push(`${alloc.count}ds`);
  }
  if (pool.gear > 0) formulaParts.push(`${pool.gear}dg`);
  if (corrDice > 0) formulaParts.push(`${corrDice}dk`);

  // Validate dice pool BEFORE spending Willpower / Health / Mental / Corruption!
  if (!formulaParts.length) {
    ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.NoDiceToRoll"));
    return null;
  }

  const totalCost = Math.max(1, Number(costAmount) || 1);
  if (actor?.type === "character") {
    if (costPool === "willpower" && actor.system.willpower) {
      if (actor.system.willpower.value < totalCost) {
        ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.NotEnoughWillpower"));
        return null;
      }
      await actor.update({ "system.willpower.value": actor.system.willpower.value - totalCost });
    } else if (costPool === "health" && actor.system.health) {
      await actor.update({ "system.health.value": Math.max(0, actor.system.health.value - totalCost) });
    } else if (costPool === "mental" && actor.system.mental) {
      await actor.update({ "system.mental.value": Math.max(0, actor.system.mental.value - totalCost) });
    }
  }

  let contaminationTriggered = false;
  if (corrDice > 0 && actor?.system?.corruption) {
    const prevPc = Number(actor.system.corruption.value) || 0;
    await actor.update({ "system.corruption.value": Math.min(10, prevPc + corrDice) });
    if (corrDice >= 2 || prevPc >= 4) contaminationTriggered = true;
  }

  const targetSnapshots = captureUserTargets();
  const targetsLabel = targetSnapshots.map(t => t.name).join(", ");
  const spellBaseDamage = directDamage ? Math.max(1, highestPathVal) : undefined;

  const rollMode = normalizeRollMode();
  const roll = new YearZeroRoll(formulaParts.join(" + "), { maxPush: 1 }, {
    game: "egregora",
    maxPush: 1,
    damage: spellBaseDamage,
    rollType: "spell",
    rollMode,
    attribute,
    contaminationTriggered,
    targets: targetSnapshots,
    targetsLabel,
  });

  // Tag each blended skill term with its exact Magic Path key & localized flavor
  let allocIdx = 0;
  for (const term of roll.dice) {
    if (term.type === "skill" && pathAllocations[allocIdx]) {
      const pathKey = pathAllocations[allocIdx].path;
      term.options ??= {};
      term.options.dsnPath = pathKey;
      term.options.flavor = game.i18n.localize(EGREGORA_CONFIG.magicPaths[pathKey]);
      allocIdx++;
    }
  }

  await roll.evaluate();
  decorateEgregoraRoll(roll, {
    actor,
    magicPath: selectedPaths[0],
    magicPaths: selectedPaths,
    contaminationTriggered,
  });

  const pathsDisplay = selectedPaths
    .map(p => game.i18n.localize(EGREGORA_CONFIG.magicPaths[p]))
    .join(" + ");

  const spellCardData = {
    spellImg: spell?.img || "systems/fvtt-egregora/assets/icons/spell.svg",
    spellTitle: spell?.name || spellName || pathsDisplay,
    attributeLabel: game.i18n.localize(EGREGORA_CONFIG.attributes[attribute]),
    pathsDisplay,
    costPoolLabel: game.i18n.localize(`EGREGORA.Magic.CostPool.${costPool}`),
    totalCost,
    directDamage: Boolean(directDamage),
    highestPathVal,
    contaminationTriggered,
    targets: targetSnapshots,
  };

  const content = await renderSpellCardContent(roll, spellCardData);
  const chatData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${game.i18n.localize("EGREGORA.Magic.Cast")}: ${spellCardData.spellTitle}`,
    content,
    rolls: [roll],
    flags: {
      [EGREGORA_CONFIG.ID]: {
        actorUuid: actor?.uuid ?? "",
        rollerUserId: game.user?.id ?? "",
        attribute,
        magicPath: selectedPaths[0],
        magicPaths: selectedPaths,
        rollType: "spell",
        spellCardData,
        targets: targetSnapshots,
      },
    },
  };

  if (typeof ChatMessage.applyRollMode === "function") {
    ChatMessage.applyRollMode(chatData, rollMode);
  }

  const message = await ChatMessage.create(chatData);
  await waitForDice3DSafe(message.id);
  return message;
}

/**
 * Teste de Contaminação (rola dados de Corrupção = nível atual de PC; 6 = efeito colateral imediato).
 */
export async function rollContaminationTest(actor) {
  const pc = Number(actor?.system?.corruption?.value) || 0;
  if (pc <= 0) {
    ui.notifications.info(game.i18n.localize("EGREGORA.Notifications.NoCorruption"));
    return null;
  }

  const roll = await new YearZeroRoll(`${pc}dk`, { maxPush: 0 }, {
    game: "egregora",
    maxPush: 0,
    rollType: "contamination",
  }).evaluate();

  const triggered = roll.successCount > 0;
  decorateEgregoraRoll(roll, { actor, contaminationTriggered: triggered });

  const renderTemplate = getRenderTemplate();
  const content = await renderTemplate("systems/fvtt-egregora/templates/chat/table-result.hbs", {
    tableTitle: game.i18n.localize("EGREGORA.Corruption.ContaminationTest"),
    rollLabel: `${pc}D6 (${game.i18n.localize("EGREGORA.Chat.Successes")}: ${roll.successCount})`,
    resultTitle: triggered
      ? game.i18n.localize("EGREGORA.Corruption.ContaminationFailTitle")
      : game.i18n.localize("EGREGORA.Corruption.ContaminationSafeTitle"),
    resultText: triggered
      ? game.i18n.localize("EGREGORA.Corruption.ContaminationFailText")
      : game.i18n.localize("EGREGORA.Corruption.ContaminationSafeText"),
    isAlert: triggered,
  });

  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
  });

  await waitForDice3DSafe(message.id);
  return message;
}

/**
 * Teste de Medo (Inteligência ou Empatia + aliados até +3).
 */
export async function rollFearTest(actor, attribute = "intelligence", allies = 0) {
  const attrVal = Number(actor?.system?.attributes?.[attribute]?.value) || 1;
  const allyBonus = Math.min(3, Math.max(0, Number(allies) || 0));
  return executeEgregoraRoll(actor, {
    attribute,
    attrScore: attrVal,
    modifier: allyBonus,
    maxPush: 1,
    flavor: `${game.i18n.localize("EGREGORA.FearTest")} (${game.i18n.localize(EGREGORA_CONFIG.attributes[attribute])})`,
    rollType: "fear",
    breakdown: allyBonus > 0 ? [`${game.i18n.localize("EGREGORA.Allies")}: +${allyBonus}`] : [],
  });
}

/**
 * Helper para rolar D66 real via Foundry Roll (anima os 2D6 em 3D no Dice So Nice!).
 */
async function evaluateD66Roll(actor) {
  const roll = await new Roll("1d6 + 1d6", {}, { isTableRoll: true }).evaluate();
  decorateEgregoraRoll(roll, { actor });
  const tens = roll.dice[0]?.total ?? 1;
  const ones = roll.dice[1]?.total ?? 1;
  return { roll, d66: tens * 10 + ones };
}

/**
 * Tabela de Pânico de Egrégora (1D6 + Corrupção) com animação 3D.
 */
export async function rollPanicTable(actor) {
  const pc = Number(actor?.system?.corruption?.value) || 0;
  const dieRoll = await new Roll("1d6", {}, { isTableRoll: true }).evaluate();
  decorateEgregoraRoll(dieRoll, { actor });
  const dieVal = dieRoll.dice[0]?.total ?? 1;
  const total = dieVal + pc;

  const entry = EGREGORA_CONFIG.panicTable.find(e => total >= e.min && total <= e.max)
    || EGREGORA_CONFIG.panicTable[EGREGORA_CONFIG.panicTable.length - 1];

  const renderTemplate = getRenderTemplate();
  const content = await renderTemplate("systems/fvtt-egregora/templates/chat/table-result.hbs", {
    tableTitle: game.i18n.localize("EGREGORA.Panic.TableTitle"),
    rollLabel: `1D6 (${dieVal}) + ${game.i18n.localize("EGREGORA.Corruption.Label")} (${pc}) = ${total}`,
    resultTitle: game.i18n.localize(`EGREGORA.Tables.Panic.${entry.key}.title`),
    resultText: game.i18n.localize(`EGREGORA.Tables.Panic.${entry.key}.effect`),
    isAlert: total >= 7,
  });

  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [dieRoll],
  });

  await waitForDice3DSafe(message.id);
  return message;
}

/**
 * Verificação de Trauma Mental Permanente (rola 1D6 em 3D; em 1, reduz PM máximo em 1).
 */
export async function rollPermanentTraumaCheck(actor) {
  const dieRoll = await new Roll("1d6", {}, { isTableRoll: true }).evaluate();
  decorateEgregoraRoll(dieRoll, { actor });
  const dieVal = dieRoll.dice[0]?.total ?? 1;
  const suffered = dieVal === 1;

  if (suffered && actor?.system?.mental) {
    const nextTrauma = (Number(actor.system.mental.permanentTrauma) || 0) + 1;
    await actor.update({ "system.mental.permanentTrauma": nextTrauma });
  }

  const renderTemplate = getRenderTemplate();
  const content = await renderTemplate("systems/fvtt-egregora/templates/chat/table-result.hbs", {
    tableTitle: game.i18n.localize("EGREGORA.Trauma.TraumaCheckTitle"),
    rollLabel: `1D6 = ${dieVal}`,
    resultTitle: suffered
      ? game.i18n.localize("EGREGORA.Trauma.TraumaSufferedTitle")
      : game.i18n.localize("EGREGORA.Trauma.TraumaAvoidedTitle"),
    resultText: suffered
      ? game.i18n.localize("EGREGORA.Trauma.TraumaSufferedText")
      : game.i18n.localize("EGREGORA.Trauma.TraumaAvoidedText"),
    isAlert: suffered,
  });

  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [dieRoll],
  });

  await waitForDice3DSafe(message.id);
  return message;
}

/**
 * Teste de Hibernação (Inteligência + Empatia, penalidade por estágio de corrupção).
 */
export async function rollHibernationTest(actor, modifier = 0) {
  const intVal = Number(actor?.system?.attributes?.intelligence?.value) || 0;
  const empVal = Number(actor?.system?.attributes?.empathy?.value) || 0;
  const pc = Number(actor?.system?.corruption?.value) || 0;
  const stageMod = pc >= 7 ? -2 : pc >= 4 ? -1 : 0;

  return executeEgregoraRoll(actor, {
    attribute: "intelligence",
    attrScore: intVal,
    skillScore: empVal,
    modifier: stageMod + (Number(modifier) || 0),
    maxPush: 0,
    flavor: game.i18n.localize("EGREGORA.Corruption.HibernationTest"),
    rollType: "hibernation",
    breakdown: stageMod < 0 ? [`${game.i18n.localize("EGREGORA.Corruption.Label")}: ${stageMod}`] : [],
  });
}

/**
 * Tabela D66 de Mutações da Corrupção (Leves, Notáveis, Aberrantes) com animação 3D.
 */
export async function rollMutationTable(actor, tier = "minor", addToActor = true) {
  const { roll, d66 } = await evaluateD66Roll(actor);

  const table = EGREGORA_CONFIG.mutationsTable[tier] || EGREGORA_CONFIG.mutationsTable.minor;
  const entry = table.find(e => d66 >= e.min && d66 <= e.max) || table[0];
  const prefix = `EGREGORA.Tables.Mutations.${tier}.${entry.key}`;
  const mutName = game.i18n.localize(`${prefix}.name`);
  const mutEffect = game.i18n.localize(`${prefix}.effect`);
  const mutCost = game.i18n.localize(`${prefix}.cost`);
  const tierLabel = game.i18n.localize(EGREGORA_CONFIG.mutationTiers[tier]);

  if (addToActor && actor && ["character", "npc"].includes(actor.type)) {
    await actor.createEmbeddedDocuments("Item", [
      {
        name: mutName,
        type: "mutation",
        img: "systems/fvtt-egregora/assets/icons/mutation.svg",
        system: {
          tier,
          d66: String(d66),
          effect: mutEffect,
          cost: mutCost,
          description: `<p><strong>${tierLabel} (D66: ${d66})</strong></p><p><strong>${game.i18n.localize("EGREGORA.Effect")}:</strong> ${mutEffect}</p><p><strong>${game.i18n.localize("EGREGORA.Cost")}:</strong> ${mutCost}</p>`,
        },
      },
    ]);
  }

  const renderTemplate = getRenderTemplate();
  const content = await renderTemplate("systems/fvtt-egregora/templates/chat/table-result.hbs", {
    tableTitle: `${game.i18n.localize("EGREGORA.Mutation.TableTitle")} — ${tierLabel}`,
    rollLabel: `D66 = ${d66}`,
    resultTitle: mutName,
    resultText: `${mutEffect} (${game.i18n.localize("EGREGORA.Cost")}: ${mutCost})`,
    isAlert: true,
  });

  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
  });

  await waitForDice3DSafe(message.id);
  return message;
}

/**
 * Tabela D66 de Ferimentos Críticos oficial de Egrégora com animação 3D.
 */
export async function rollCriticalTable(actor, addToActor = true) {
  const { roll, d66 } = await evaluateD66Roll(actor);

  const entry = EGREGORA_CONFIG.criticalInjuriesTable.find(e => d66 >= e.min && d66 <= e.max)
    || EGREGORA_CONFIG.criticalInjuriesTable[0];
  const entryName = game.i18n.localize(`EGREGORA.Tables.Critical.${entry.key}.name`);
  const entryEffect = game.i18n.localize(`EGREGORA.Tables.Critical.${entry.key}.effect`);

  if (addToActor && actor && ["character", "npc"].includes(actor.type)) {
    await actor.createEmbeddedDocuments("Item", [
      {
        name: `${entryName} (${d66})`,
        type: "critical",
        img: "systems/fvtt-egregora/assets/icons/critical.svg",
        system: {
          d66: String(d66),
          lethal: Boolean(entry.lethal),
          timeLimit: entry.timeLimit,
          healMod: entry.healMod || 0,
          healingTime: entry.healingTime,
          effect: entryEffect,
          description: `<p><strong>D66 (${d66}) — ${entryName}:</strong> ${entryEffect}</p>`,
        },
      },
    ]);
  }

  const metaLine = entry.lethal
    ? `${game.i18n.localize("EGREGORA.Critical.Lethal")}: ${game.i18n.localize("EGREGORA.Yes")} (${entry.timeLimit}) | ${game.i18n.localize("EGREGORA.Critical.HealingTime")}: ${entry.healingTime}`
    : `${game.i18n.localize("EGREGORA.Critical.HealingTime")}: ${entry.healingTime}`;

  const renderTemplate = getRenderTemplate();
  const content = await renderTemplate("systems/fvtt-egregora/templates/chat/table-result.hbs", {
    tableTitle: game.i18n.localize("EGREGORA.Critical.TableTitle"),
    rollLabel: `D66 = ${d66}`,
    resultTitle: entryName,
    resultText: entryEffect,
    metaLine,
    isAlert: true,
  });

  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
  });

  await waitForDice3DSafe(message.id);
  return message;
}

/**
 * Tabela D66 de Danos Críticos em Veículos com animação 3D.
 */
export async function rollVehicleCritTable(actor) {
  const { roll, d66 } = await evaluateD66Roll(actor);

  const entry = EGREGORA_CONFIG.vehicleCritTable.find(e => d66 >= e.min && d66 <= e.max)
    || EGREGORA_CONFIG.vehicleCritTable[0];
  const entryName = game.i18n.localize(`EGREGORA.Tables.VehicleCrit.${entry.key}.name`);
  const entryEffect = game.i18n.localize(`EGREGORA.Tables.VehicleCrit.${entry.key}.effect`);

  const renderTemplate = getRenderTemplate();
  const content = await renderTemplate("systems/fvtt-egregora/templates/chat/table-result.hbs", {
    tableTitle: game.i18n.localize("EGREGORA.Vehicle.CritTableTitle"),
    rollLabel: `D66 = ${d66}`,
    resultTitle: entryName,
    resultText: entryEffect,
    isAlert: true,
  });

  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
  });

  await waitForDice3DSafe(message.id);
  return message;
}

/**
 * Aplica dano diretamente aos TokenDocuments informados (executado pelo dono do ator ou pelo GM via socket).
 * @param {string[]} tokenUuids
 * @param {number} dmg
 * @returns {Promise<Array<{name: string, prev: number, next: number, broken: boolean, isVehicle: boolean}>>}
 */
async function executeDamageOnTokens(tokenUuids, dmg) {
  const results = [];
  for (const uuid of tokenUuids) {
    const doc = await fromUuid(uuid);
    const targetActor = doc?.actor ?? (doc instanceof Actor ? doc : null);
    if (!targetActor) continue;
    const displayName = doc?.name || targetActor.name || "—";

    if (targetActor.type === "vehicle") {
      const prev = Number(targetActor.system.hull?.value) || 0;
      const next = Math.max(0, prev - dmg);
      await targetActor.update({
        "system.hull.value": next,
        "system.wrecked": next === 0,
      });
      results.push({ name: displayName, prev, next, broken: next === 0, isVehicle: true });
    } else if (targetActor.system.health) {
      const prev = Number(targetActor.system.health.value) || 0;
      const next = Math.max(0, prev - dmg);
      await targetActor.update({ "system.health.value": next });
      results.push({ name: displayName, prev, next, broken: next === 0, isVehicle: false });
    }
  }
  return results;
}

/**
 * Publica um resumo curto no chat confirmando o dano aplicado em cada alvo.
 */
async function postDamageAppliedSummary(results, dmg, sourceMessage) {
  if (!results.length) return;
  const lines = results.map(r => {
    const unit = r.isVehicle
      ? game.i18n.localize("EGREGORA.Vehicle.Hull")
      : game.i18n.localize("EGREGORA.HealthShort");
    const statusTag = r.broken
      ? ` <span class="eg-dmg-broken">(${game.i18n.localize(r.isVehicle ? "EGREGORA.Vehicle.Wrecked" : "EGREGORA.Status.broken")})</span>`
      : "";
    return `<li><strong>${foundry.utils.escapeHTML(r.name)}</strong>: −${dmg} ${unit} (${r.prev} → ${r.next})${statusTag}</li>`;
  });

  const ChatMessageCls = ChatMessage.implementation ?? ChatMessage;
  await ChatMessageCls.create({
    speaker: sourceMessage?.speaker ?? ChatMessage.getSpeaker(),
    content: `<div class="eg-chat-card eg-damage-summary">
      <div class="eg-damage-summary-title"><i class="fa-solid fa-crosshairs"></i> ${game.i18n.localize("EGREGORA.Chat.DamageAppliedTitle")}</div>
      <ul>${lines.join("")}</ul>
    </div>`,
  });
}

/**
 * Resolve a proteção de armadura ativa de um ator alvo (Character, NPC ou Veículo).
 * @param {Actor} targetActor
 * @returns {{ rating: number, mode: "items"|"npcRating"|"vehicleArmor"|"none", items: Item[], label: string }}
 */
export function resolveTargetArmor(targetActor) {
  if (!targetActor) return { rating: 0, mode: "none", items: [], label: "" };

  if (targetActor.type === "vehicle") {
    const rating = Math.max(0, Number(targetActor.system?.armor) || 0);
    return {
      rating,
      mode: rating > 0 ? "vehicleArmor" : "none",
      items: [],
      label: game.i18n.localize("EGREGORA.Vehicle.Armor"),
    };
  }

  const equippedArmors = (targetActor.items ?? []).filter(
    i => i.type === "armor" && i.system?.equipped && (Number(i.system?.protection) || 0) > 0
  );
  if (equippedArmors.length) {
    const rating = equippedArmors.reduce((acc, a) => acc + (Number(a.system.protection) || 0), 0);
    const label = equippedArmors.map(a => a.name).join(" + ");
    return { rating, mode: "items", items: equippedArmors, label };
  }

  if (targetActor.type === "npc") {
    const rating = Math.max(0, Number(targetActor.system?.armorRating) || 0);
    return {
      rating,
      mode: rating > 0 ? "npcRating" : "none",
      items: [],
      label: game.i18n.localize("EGREGORA.Armor.Label"),
    };
  }

  return { rating: 0, mode: "none", items: [], label: "" };
}

/**
 * Aplica degradação (desgaste) na armadura de um ator alvo quando dano penetra a proteção.
 * @param {Actor} targetActor
 * @param {ReturnType<typeof resolveTargetArmor>} armorInfo
 * @param {number} wearAmount
 * @returns {Promise<Array<{name: string, prev: number, next: number}>>}
 */
async function applyArmorDegradation(targetActor, armorInfo, wearAmount) {
  const degraded = [];
  let remaining = Math.max(0, Number(wearAmount) || 0);
  if (!targetActor || remaining <= 0 || armorInfo.rating <= 0) return degraded;

  if (armorInfo.mode === "items") {
    const sorted = [...armorInfo.items].sort(
      (a, b) => (Number(b.system.protection) || 0) - (Number(a.system.protection) || 0)
    );
    for (const item of sorted) {
      if (remaining <= 0) break;
      const prev = Number(item.system.protection) || 0;
      if (prev <= 0) continue;
      const drop = Math.min(prev, remaining);
      const next = prev - drop;
      remaining -= drop;
      const updates = { "system.protection": next };
      if ((Number(item.system.maxProtection) || 0) < prev) {
        updates["system.maxProtection"] = prev;
      }
      await item.update(updates);
      degraded.push({ name: item.name, prev, next });
    }
  } else if (armorInfo.mode === "npcRating") {
    const prev = Number(targetActor.system.armorRating) || 0;
    const next = Math.max(0, prev - remaining);
    await targetActor.update({ "system.armorRating": next });
    degraded.push({ name: armorInfo.label, prev, next });
  } else if (armorInfo.mode === "vehicleArmor") {
    const prev = Number(targetActor.system.armor) || 0;
    const next = Math.max(0, prev - remaining);
    await targetActor.update({ "system.armor": next });
    degraded.push({ name: armorInfo.label, prev, next });
  }

  return degraded;
}

/**
 * Cria um card no chat de Dano Recebido / Absorção de Armadura, visível e acionável
 * exclusivamente pelo dono do alvo e pelo Narrador.
 */
async function postArmorAbsorptionPrompt(doc, targetActor, incomingDamage, armorInfo, sourceMessage) {
  const targetName = doc?.name || targetActor.name || "—";
  const targetImg = doc?.texture?.src || targetActor.img || "icons/svg/mystery-man.svg";
  const targetOwnerIds = game.users
    .filter(u => !u.isGM && targetActor.testUserPermission(u, "OWNER"))
    .map(u => u.id);

  const promptData = {
    promptType: "armorAbsorption",
    targetTokenUuid: doc?.uuid ?? "",
    targetActorUuid: targetActor.uuid,
    targetActorId: targetActor.id,
    targetOwnerIds,
    targetName,
    targetImg,
    incomingDamage,
    armorRating: armorInfo.rating,
    armorLabel: armorInfo.label,
    resolved: false,
    resolvedSummary: "",
    sourceMessageId: sourceMessage?.id ?? "",
  };

  const renderTemplate = getRenderTemplate();
  const content = await renderTemplate("systems/fvtt-egregora/templates/chat/armor-absorption.hbs", promptData);
  const ChatMessageCls = ChatMessage.implementation ?? ChatMessage;

  return ChatMessageCls.create({
    speaker: ChatMessage.getSpeaker({ actor: targetActor }),
    content,
    flags: {
      [EGREGORA_CONFIG.ID]: promptData,
    },
  });
}

/**
 * Marca um card de Dano Pendente / Absorção de Armadura como resolvido (direto ou via socket).
 */
async function resolveArmorPromptMessage(message, resolvedSummary, messageEl = null) {
  const ID = EGREGORA_CONFIG.ID;
  const flags = message?.flags?.[ID];
  if (!flags || flags.promptType !== "armorAbsorption") return;

  // Remoção imediata dos botões no DOM local
  messageEl?.querySelectorAll(".dice-buttons").forEach(el => el.remove());

  const updatedData = {
    ...flags,
    resolved: true,
    resolvedSummary,
  };
  const renderTemplate = getRenderTemplate();
  const content = await renderTemplate("systems/fvtt-egregora/templates/chat/armor-absorption.hbs", updatedData);

  if (game.user.isGM || message.isAuthor) {
    await message.update({
      content,
      [`flags.${ID}.resolved`]: true,
      [`flags.${ID}.resolvedSummary`]: resolvedSummary,
    });
    try {
      await ui.chat?.updateMessage?.(message);
    } catch {
      // ignore refresh warning
    }
  } else {
    game.socket.emit(`system.${ID}`, {
      action: "resolveDamagePrompt",
      messageId: message.id,
      resolvedSummary,
      requesterId: game.user.id,
    });
  }
}

/**
 * Ação do alvo: rola a Armadura (dados de equipamento `dg`, sem forçar), subtrai sucessos do dano,
 * degrada a armadura se algum dano passar e saírem 1s, e aplica o dano líquido.
 */
export async function rollArmorAbsorption(event) {
  const messageEl = event.target.closest("[data-message-id]");
  const messageId = messageEl?.dataset?.messageId;
  const message = game.messages.get(messageId);
  if (!message) return null;

  const ID = EGREGORA_CONFIG.ID;
  const flags = message.flags?.[ID] ?? {};
  if (flags.promptType !== "armorAbsorption" || flags.resolved) return null;

  if (!canUserActOnChatMessage(message)) {
    ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.OnlyTargetOwnerCanAbsorb"));
    return null;
  }

  const doc = flags.targetTokenUuid ? await fromUuid(flags.targetTokenUuid) : null;
  const targetActor = doc?.actor ?? (flags.targetActorUuid ? await fromUuid(flags.targetActorUuid) : null);
  if (!targetActor) return null;

  const incomingDamage = Math.max(0, Number(flags.incomingDamage) || 0);
  const armorInfo = resolveTargetArmor(targetActor);
  const diceCount = armorInfo.rating > 0 ? armorInfo.rating : (Number(flags.armorRating) || 0);
  if (diceCount <= 0) {
    return acceptIncomingDamage(event);
  }

  const roll = await new YearZeroRoll(`${diceCount}dg`, { maxPush: 0 }, {
    game: "egregora",
    maxPush: 0,
    rollType: "armor",
  }).evaluate();
  decorateEgregoraRoll(roll, { actor: targetActor });

  const absorbed = roll.successCount || 0;
  const netDamage = Math.max(0, incomingDamage - absorbed);
  const wear = netDamage > 0 ? (roll.gearDamage || 0) : 0;

  // Aplica dano líquido no alvo
  let dmgResult = null;
  if (netDamage > 0) {
    const results = await executeDamageOnTokens([flags.targetTokenUuid || targetActor.uuid], netDamage);
    dmgResult = results[0] ?? null;
  }

  // Degrada armadura apenas se algum dano penetrou e saíram 1s nos dados de equipamento
  const degraded = wear > 0 ? await applyArmorDegradation(targetActor, armorInfo, wear) : [];

  const summaryParts = [
    `${game.i18n.localize("EGREGORA.Armor.Absorbed")}: ${absorbed}/${incomingDamage}`,
    `${game.i18n.localize("EGREGORA.Armor.NetDamage")}: ${netDamage}`,
  ];
  if (degraded.length) {
    const wearTxt = degraded.map(d => `${d.name} (${d.prev}→${d.next})`).join(", ");
    summaryParts.push(`${game.i18n.localize("EGREGORA.Armor.Degraded")}: ${wearTxt}`);
  }
  const resolvedSummary = summaryParts.join(" • ");

  await resolveArmorPromptMessage(message, resolvedSummary, messageEl);

  const rollHtml = await roll.render();
  const unit = dmgResult?.isVehicle
    ? game.i18n.localize("EGREGORA.Vehicle.Hull")
    : game.i18n.localize("EGREGORA.HealthShort");
  const hpLine = dmgResult
    ? `<div class="eg-info-row eg-alert"><span class="label">${game.i18n.localize("EGREGORA.Armor.NetDamage")}:</span><span class="value"><strong>−${netDamage} ${unit} (${dmgResult.prev} → ${dmgResult.next})</strong>${dmgResult.broken ? ` <span class="eg-dmg-broken">(${game.i18n.localize(dmgResult.isVehicle ? "EGREGORA.Vehicle.Wrecked" : "EGREGORA.Status.broken")})</span>` : ""}</span></div>`
    : `<div class="eg-info-row eg-armor-blocked"><span class="label"><i class="fa-solid fa-shield"></i> ${game.i18n.localize("EGREGORA.Armor.FullyAbsorbed")}</span><span class="value"><strong>0</strong></span></div>`;
  const wearLine = degraded.length
    ? `<div class="eg-info-row eg-alert"><span class="label"><i class="fa-solid fa-burst"></i> ${game.i18n.localize("EGREGORA.Armor.Degraded")}:</span><span class="value">${degraded.map(d => `${foundry.utils.escapeHTML(d.name)} (${d.prev} → ${d.next})`).join(", ")}</span></div>`
    : "";

  const ChatMessageCls = ChatMessage.implementation ?? ChatMessage;
  const resultMsg = await ChatMessageCls.create({
    speaker: ChatMessage.getSpeaker({ actor: targetActor }),
    flavor: `${game.i18n.localize("EGREGORA.Armor.Roll")}: ${armorInfo.label || flags.armorLabel}`,
    content: `<div class="eg-chat-card eg-armor-result">
      ${rollHtml}
      ${hpLine}
      ${wearLine}
    </div>`,
    rolls: [roll],
    flags: {
      [ID]: {
        actorUuid: targetActor.uuid,
        rollerUserId: game.user.id,
        rollType: "armor",
      },
    },
  });

  await waitForDice3DSafe(resultMsg.id);
  return resultMsg;
}

/**
 * Ação do alvo: aceita receber o dano integral sem rolar armadura.
 */
export async function acceptIncomingDamage(event) {
  const messageEl = event.target.closest("[data-message-id]");
  const messageId = messageEl?.dataset?.messageId;
  const message = game.messages.get(messageId);
  if (!message) return null;

  const ID = EGREGORA_CONFIG.ID;
  const flags = message.flags?.[ID] ?? {};
  if (flags.promptType !== "armorAbsorption" || flags.resolved) return null;

  if (!canUserActOnChatMessage(message)) {
    ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.OnlyTargetOwnerCanAbsorb"));
    return null;
  }

  const incomingDamage = Math.max(0, Number(flags.incomingDamage) || 0);
  const targetUuid = flags.targetTokenUuid || flags.targetActorUuid;
  if (!targetUuid || incomingDamage <= 0) return null;

  const results = await executeDamageOnTokens([targetUuid], incomingDamage);
  const summary = `${game.i18n.localize("EGREGORA.Armor.AcceptedFullDamage")}: −${incomingDamage}`;
  await resolveArmorPromptMessage(message, summary, messageEl);
  await postDamageAppliedSummary(results, incomingDamage, message);
  return results;
}

/**
 * Aplica dano de ataque/magia exclusivamente aos tokens marcados como alvo (Target) pelo autor da rolagem.
 * Nunca utiliza `canvas.tokens.controlled` (ferramenta de seleção).
 * - Se o ataque não ignora armadura e o alvo possui armadura > 0, envia um card de Absorção de Armadura
 *   exclusivamente para o dono do alvo (e Narrador).
 * - Caso contrário, aplica o dano imediatamente (diretamente ou via socket no Narrador).
 */
export async function applyTargetDamage(event) {
  const btn = event.target.closest("[data-action='applyTargetDamage']");
  const messageId = event.target.closest("[data-message-id]")?.dataset?.messageId;
  const message = game.messages.get(messageId);
  if (!message) return;

  const flags = message.flags?.[EGREGORA_CONFIG.ID] ?? {};
  const rollerUserId = flags.rollerUserId || message.author?.id || "";

  // Apenas o autor da rolagem ou o Narrador podem aplicar o dano desta rolagem
  if (!game.user.isGM && rollerUserId && game.user.id !== rollerUserId) {
    ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.OnlyRollerCanApplyDamage"));
    return;
  }

  const roll = message.rolls?.[0];
  const explicitDmg = Number(btn?.dataset?.damage);
  const dmg = Number.isFinite(explicitDmg) && explicitDmg > 0
    ? explicitDmg
    : (Number(roll?.attackDamage) || 0);
  if (dmg <= 0) return;

  const ignoresArmor = flags.rollType === "spell" && Boolean(flags.spellCardData?.directDamage);

  // 1. Prioriza os alvos marcados (Target) pelo autor no momento da rolagem
  let targetUuids = Array.isArray(flags.targets)
    ? flags.targets.map(t => t.tokenUuid).filter(Boolean)
    : [];

  // 2. Fallback: se nenhum alvo estava marcado no momento da rolagem, usa os Targets atuais
  //    exclusivamente do próprio autor da rolagem (ou do Narrador)
  if (!targetUuids.length && (game.user.isGM || !rollerUserId || game.user.id === rollerUserId)) {
    targetUuids = captureUserTargets().map(t => t.tokenUuid);
  }

  if (!targetUuids.length) {
    ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.SelectTargetToken"));
    return;
  }

  const directUuids = [];
  const gmUuids = [];
  let armorPromptsCreated = 0;

  for (const uuid of targetUuids) {
    const doc = await fromUuid(uuid);
    const targetActor = doc?.actor ?? (doc instanceof Actor ? doc : null);
    if (!targetActor) continue;

    const armorInfo = !ignoresArmor ? resolveTargetArmor(targetActor) : { rating: 0 };
    if (armorInfo.rating > 0) {
      await postArmorAbsorptionPrompt(doc, targetActor, dmg, armorInfo, message);
      armorPromptsCreated++;
      continue;
    }

    if (game.user.isGM || targetActor.isOwner) {
      directUuids.push(uuid);
    } else {
      gmUuids.push(uuid);
    }
  }

  if (!directUuids.length && !gmUuids.length && !armorPromptsCreated) {
    ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.SelectTargetToken"));
    return;
  }

  if (armorPromptsCreated > 0) {
    ui.notifications.info(game.i18n.format("EGREGORA.Notifications.ArmorPromptSent", { count: armorPromptsCreated }));
  }

  if (directUuids.length) {
    const results = await executeDamageOnTokens(directUuids, dmg);
    await postDamageAppliedSummary(results, dmg, message);
    ui.notifications.info(game.i18n.format("EGREGORA.Notifications.AppliedDamage", { dmg }));
  }

  if (gmUuids.length) {
    const activeGM = game.users.activeGM ?? game.users.find(u => u.isGM && u.active);
    if (!activeGM) {
      ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.NoGMForDamage"));
      return;
    }
    game.socket.emit(`system.${EGREGORA_CONFIG.ID}`, {
      action: "applyTargetDamage",
      messageId: message.id,
      tokenUuids: gmUuids,
      damage: dmg,
      requesterId: game.user.id,
    });
    ui.notifications.info(game.i18n.format("EGREGORA.Notifications.AppliedDamage", { dmg }));
  }
}

/**
 * Registra o listener de socket no Narrador para:
 * - aplicar dano em alvos marcados por jogadores (`applyTargetDamage`)
 * - marcar cards de Absorção de Armadura como resolvidos quando acionados pelo jogador alvo (`resolveDamagePrompt`)
 */
export function registerRollSocket() {
  const ID = EGREGORA_CONFIG.ID;
  game.socket.on(`system.${ID}`, async payload => {
    if (!payload) return;
    const primaryGM = game.users.activeGM ?? game.users.find(u => u.isGM && u.active);
    if (!game.user.isGM || (primaryGM && primaryGM.id !== game.user.id)) return;

    if (payload.action === "applyTargetDamage") {
      const message = game.messages.get(payload.messageId);
      if (!message) return;
      const flags = message.flags?.[ID] ?? {};
      const rollerUserId = flags.rollerUserId || message.author?.id || "";

      // Garante que apenas o autor da rolagem possa solicitar a aplicação de dano via socket
      if (rollerUserId && payload.requesterId !== rollerUserId) return;

      const dmg = Number(payload.damage) || 0;
      const uuids = Array.isArray(payload.tokenUuids) ? payload.tokenUuids.filter(Boolean) : [];
      if (dmg <= 0 || !uuids.length) return;

      const results = await executeDamageOnTokens(uuids, dmg);
      await postDamageAppliedSummary(results, dmg, message);
    } else if (payload.action === "resolveDamagePrompt") {
      const message = game.messages.get(payload.messageId);
      if (!message) return;
      const flags = message.flags?.[ID] ?? {};
      if (flags.promptType !== "armorAbsorption" || flags.resolved) return;

      // Garante que quem solicitou é de fato um dono do ator alvo
      const requester = game.users.get(payload.requesterId);
      const targetActor = flags.targetActorUuid ? await fromUuid(flags.targetActorUuid) : null;
      const resolvedActor = targetActor?.actor ?? targetActor;
      if (!requester || (!requester.isGM && resolvedActor && !resolvedActor.testUserPermission(requester, "OWNER"))) {
        return;
      }

      const updatedData = {
        ...flags,
        resolved: true,
        resolvedSummary: String(payload.resolvedSummary || ""),
      };
      const renderTemplate = getRenderTemplate();
      const content = await renderTemplate("systems/fvtt-egregora/templates/chat/armor-absorption.hbs", updatedData);
      await message.update({
        content,
        [`flags.${ID}.resolved`]: true,
        [`flags.${ID}.resolvedSummary`]: updatedData.resolvedSummary,
      });
    }
  });
}
