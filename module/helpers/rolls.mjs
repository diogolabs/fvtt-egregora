import { YearZeroRoll } from "../../lib/yzur.js";
import { EGREGORA_CONFIG } from "../config.mjs";
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
          attribute,
          skillUuid: skill?.uuid ?? "",
          gearUuid: gear?.uuid ?? "",
          rollType,
          prideBonus: usePride ? 1 : 0,
        },
      },
    },
    buildToMessageOptions(rollOptions.rollMode)
  );

  await game.dice3d?.waitFor3DAnimationByMessageID(message.id);
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

  if (gear && gearDmg > 0 && gear.system.durability !== undefined) {
    const nextDur = Math.max(0, (gear.system.durability || 0) - gearDmg);
    await gear.update({ "system.durability": nextDur });
    pushSummary.push(`${gear.name}: −${gearDmg} ${game.i18n.localize("EGREGORA.DurabilityShort")}`);
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

  const newMessage = await roll.toMessage(
    {
      speaker: message.speaker,
      flavor: message.flavor,
      flags: message.flags,
    },
    buildToMessageOptions(roll.options.rollMode)
  );
  await game.dice3d?.waitFor3DAnimationByMessageID(newMessage.id);
  return newMessage;
}

export async function acceptEgregoraRoll(event) {
  const messageId = event.target.closest("[data-message-id]")?.dataset?.messageId;
  const message = game.messages.get(messageId);
  if (!message || !message.rolls?.length) return null;

  const roll = message.rolls[0].duplicate();
  roll.maxPush = 0;
  await message.update({ rolls: [roll.toJSON()] });
  return message;
}

/**
 * Conjuração Mágica de Egrégora:
 * Atributo + menor Caminho utilizado + Bônus de Foco/Fetiche + Dados de Corrupção.
 * Colore os dados de Caminho com o tema 3D correspondente ao Caminho Principal!
 */
export async function executeSpellCast(actor, {
  spell = null,
  spellName = "",
  attribute = "intelligence",
  primaryPath = "echoes",
  secondaryPath = "",
  costPool = "willpower",
  costAmount = 1,
  fetishBonus = 0,
  corruptionDice = 0,
  modifier = 0,
  directDamage = false,
} = {}) {
  const attrVal = Number(actor?.system?.attributes?.[attribute]?.value) || 0;
  const path1Val = Number(actor?.system?.magic?.paths?.[primaryPath]) || 0;
  const path2Val = secondaryPath ? (Number(actor?.system?.magic?.paths?.[secondaryPath]) || 0) : null;
  const effectivePathVal = path2Val !== null ? Math.min(path1Val, path2Val) : path1Val;
  const highestPathVal = path2Val !== null ? Math.max(path1Val, path2Val) : path1Val;

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

  const corrDice = Math.max(0, Number(corruptionDice) || 0);
  let contaminationTriggered = false;
  if (corrDice > 0 && actor?.system?.corruption) {
    const prevPc = Number(actor.system.corruption.value) || 0;
    await actor.update({ "system.corruption.value": Math.min(10, prevPc + corrDice) });
    if (corrDice >= 2 || prevPc >= 4) contaminationTriggered = true;
  }

  const pool = computeDicePool(attrVal, effectivePathVal, fetishBonus, modifier);
  const formulaParts = [];
  if (pool.base > 0) formulaParts.push(`${pool.base}db`);
  if (pool.skill > 0) formulaParts.push(`${pool.skill}ds`);
  if (pool.gear > 0) formulaParts.push(`${pool.gear}dg`);
  if (corrDice > 0) formulaParts.push(`${corrDice}dk`);

  if (!formulaParts.length) {
    ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.NoDiceToRoll"));
    return null;
  }

  const roll = await new YearZeroRoll(formulaParts.join(" + "), { maxPush: 1 }, {
    game: "egregora",
    maxPush: 1,
    rollType: "spell",
    attribute,
    contaminationTriggered,
  }).evaluate();
  decorateEgregoraRoll(roll, { actor, magicPath: primaryPath, contaminationTriggered });

  const successes = roll.successCount;
  const banes = roll.attributeTrauma;
  const qualityEntry = successes > 0
    ? EGREGORA_CONFIG.magicSuccessQuality.find(q => successes >= q.min && successes <= q.max)
    : null;
  const qualityTitle = qualityEntry ? game.i18n.localize(`EGREGORA.Magic.Quality.${qualityEntry.key}.title`) : "";
  const qualityDesc = qualityEntry ? game.i18n.localize(`EGREGORA.Magic.Quality.${qualityEntry.key}.desc`) : "";
  const calculatedDamage = directDamage && successes > 0 ? Math.max(1, highestPathVal) + (successes - 1) : 0;

  const pathLabel1 = game.i18n.localize(EGREGORA_CONFIG.magicPaths[primaryPath]);
  const pathLabel2 = secondaryPath ? game.i18n.localize(EGREGORA_CONFIG.magicPaths[secondaryPath]) : "";
  const pathsDisplay = pathLabel2 ? `${pathLabel1} + ${pathLabel2}` : pathLabel1;

  const renderTemplate = getRenderTemplate();
  const content = await renderTemplate("systems/fvtt-egregora/templates/chat/spell-cast.hbs", {
    actor,
    spell,
    spellTitle: spell?.name || spellName || pathsDisplay,
    attributeLabel: game.i18n.localize(EGREGORA_CONFIG.attributes[attribute]),
    pathsDisplay,
    costPoolLabel: game.i18n.localize(`EGREGORA.Magic.CostPool.${costPool}`),
    totalCost,
    successes,
    banes,
    qualityTitle,
    qualityDesc,
    calculatedDamage,
    contaminationTriggered,
    rollHtml: await roll.render(),
  });

  const message = await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${game.i18n.localize("EGREGORA.Magic.Cast")}: ${spell?.name || spellName || pathsDisplay}`,
    content,
    rolls: [roll],
    flags: {
      [EGREGORA_CONFIG.ID]: {
        actorUuid: actor?.uuid ?? "",
        attribute,
        magicPath: primaryPath,
        rollType: "spell",
      },
    },
  });

  await game.dice3d?.waitFor3DAnimationByMessageID(message.id);
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

  await game.dice3d?.waitFor3DAnimationByMessageID(message.id);
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

  await game.dice3d?.waitFor3DAnimationByMessageID(message.id);
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

  await game.dice3d?.waitFor3DAnimationByMessageID(message.id);
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

  await game.dice3d?.waitFor3DAnimationByMessageID(message.id);
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

  await game.dice3d?.waitFor3DAnimationByMessageID(message.id);
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

  await game.dice3d?.waitFor3DAnimationByMessageID(message.id);
  return message;
}

/**
 * Aplica dano de ataque nos tokens atualmente selecionados.
 */
export async function applyTargetDamage(event) {
  const messageId = event.target.closest("[data-message-id]")?.dataset?.messageId;
  const message = game.messages.get(messageId);
  const roll = message?.rolls?.[0];
  if (!roll || !roll.attackDamage) return;

  const controlled = canvas?.tokens?.controlled ?? [];
  if (!controlled.length) {
    ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.SelectTargetToken"));
    return;
  }

  const dmg = Number(roll.attackDamage) || 0;
  for (const token of controlled) {
    const targetActor = token.actor;
    if (!targetActor) continue;
    if (targetActor.type === "vehicle") {
      const nextHull = Math.max(0, targetActor.system.hull.value - dmg);
      await targetActor.update({
        "system.hull.value": nextHull,
        "system.wrecked": nextHull === 0,
      });
    } else if (targetActor.system.health) {
      const nextHp = Math.max(0, targetActor.system.health.value - dmg);
      await targetActor.update({ "system.health.value": nextHp });
    }
  }
  ui.notifications.info(game.i18n.format("EGREGORA.Notifications.AppliedDamage", { dmg }));
}
