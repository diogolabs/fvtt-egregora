import { EGREGORA_CONFIG } from "./config.mjs";
import { registerSettings, registerStatusEffects } from "./settings.mjs";
import { EgregoraCharacterData, EgregoraNpcData, EgregoraVehicleData } from "./data/actors.mjs";
import {
  EgregoraArmorData,
  EgregoraCriticalData,
  EgregoraDefectData,
  EgregoraGearData,
  EgregoraMutationData,
  EgregoraQualityData,
  EgregoraSkillData,
  EgregoraSpellData,
  EgregoraTalentData,
  EgregoraWeaponData,
} from "./data/items.mjs";
import { EgregoraActor } from "./documents/actor.mjs";
import { EgregoraItem } from "./documents/item.mjs";
import { EgregoraChatMessage } from "./documents/chat-message.mjs";
import { EgregoraChatLog } from "./applications/chat-log.mjs";
import { EgregoraRollDialog } from "./applications/roll-dialog.mjs";
import { EgregoraSpellDialog } from "./applications/spell-dialog.mjs";
import { EgregoraActorSheet } from "./sheets/actor-sheet.mjs";
import { EgregoraItemSheet } from "./sheets/item-sheet.mjs";
import { YearZeroRollManager } from "../lib/yzur.js";
import { registerDice3D } from "./helpers/dice-so-nice.mjs";
import {
  executeEgregoraRoll,
  executeSpellCast,
  rollContaminationTest,
  rollCriticalTable,
  rollFearTest,
  rollHibernationTest,
  rollMutationTable,
  rollPanicTable,
  rollPermanentTraumaCheck,
  rollVehicleCritTable,
} from "./helpers/rolls.mjs";

globalThis.egregora = {
  config: EGREGORA_CONFIG,
  documents: { EgregoraActor, EgregoraItem, EgregoraChatMessage },
  applications: { EgregoraRollDialog, EgregoraSpellDialog, EgregoraActorSheet, EgregoraItemSheet },
  models: {
    EgregoraCharacterData,
    EgregoraNpcData,
    EgregoraVehicleData,
    EgregoraSkillData,
    EgregoraTalentData,
    EgregoraQualityData,
    EgregoraDefectData,
    EgregoraGearData,
    EgregoraWeaponData,
    EgregoraArmorData,
    EgregoraSpellData,
    EgregoraMutationData,
    EgregoraCriticalData,
  },
  rolls: {
    executeEgregoraRoll,
    executeSpellCast,
    rollContaminationTest,
    rollFearTest,
    rollPanicTable,
    rollPermanentTraumaCheck,
    rollHibernationTest,
    rollMutationTable,
    rollCriticalTable,
    rollVehicleCritTable,
  },
};

function registerHandlebarsHelpers() {
  const fallbackHelpers = {
    eq: (a, b) => a === b,
    ne: (a, b) => a !== b,
    gt: (a, b) => Number(a) > Number(b),
    gte: (a, b) => Number(a) >= Number(b),
    lt: (a, b) => Number(a) < Number(b),
    lte: (a, b) => Number(a) <= Number(b),
    and: (...args) => args.slice(0, -1).every(Boolean),
    or: (...args) => args.slice(0, -1).some(Boolean),
    not: a => !a,
  };
  for (const [name, fn] of Object.entries(fallbackHelpers)) {
    if (!Handlebars.helpers[name]) {
      Handlebars.registerHelper(name, fn);
    }
  }

  Handlebars.registerHelper("add", (a, b) => (Number(a) || 0) + (Number(b) || 0));
  Handlebars.registerHelper("upper", str => String(str ?? "").toUpperCase());
  Handlebars.registerHelper("times", (n, block) => {
    let out = "";
    const count = Math.max(0, Number(n) || 0);
    for (let i = 1; i <= count; i++) {
      out += block.fn(i);
    }
    return out;
  });
}

Hooks.once("init", () => {
  console.log("fvtt-egregora | Initializing Egrégora: O Mundo Oculto (YZE) System");

  CONFIG.EGREGORA = EGREGORA_CONFIG;
  registerSettings();
  registerStatusEffects();
  registerHandlebarsHelpers();

  CONFIG.Actor.documentClass = EgregoraActor;
  CONFIG.Actor.dataModels = {
    character: EgregoraCharacterData,
    npc: EgregoraNpcData,
    vehicle: EgregoraVehicleData,
  };

  CONFIG.Item.documentClass = EgregoraItem;
  CONFIG.Item.dataModels = {
    skill: EgregoraSkillData,
    talent: EgregoraTalentData,
    quality: EgregoraQualityData,
    defect: EgregoraDefectData,
    gear: EgregoraGearData,
    weapon: EgregoraWeaponData,
    armor: EgregoraArmorData,
    spell: EgregoraSpellData,
    mutation: EgregoraMutationData,
    critical: EgregoraCriticalData,
  };

  CONFIG.ChatMessage.documentClass = EgregoraChatMessage;
  CONFIG.ui.chat = EgregoraChatLog;

  const DocumentSheetConfig = foundry.applications?.apps?.DocumentSheetConfig
    ?? globalThis.DocumentSheetConfig;
  const ActorDoc = foundry.documents?.Actor ?? globalThis.Actor;
  const ItemDoc = foundry.documents?.Item ?? globalThis.Item;

  // Unregister legacy V1 core sheets on Foundry v13 (v14 does not pre-register core V1 sheets)
  if ((game.release?.generation ?? 13) < 14) {
    const CoreActorSheet = foundry.appv1?.sheets?.ActorSheet;
    const CoreItemSheet = foundry.appv1?.sheets?.ItemSheet;
    if (CoreActorSheet) {
      DocumentSheetConfig.unregisterSheet(ActorDoc, "core", CoreActorSheet);
    }
    if (CoreItemSheet) {
      DocumentSheetConfig.unregisterSheet(ItemDoc, "core", CoreItemSheet);
    }
  }

  DocumentSheetConfig.registerSheet(ActorDoc, EGREGORA_CONFIG.ID, EgregoraActorSheet, {
    types: ["character", "npc", "vehicle"],
    makeDefault: true,
    label: "EGREGORA.Sheet.Actor",
  });

  DocumentSheetConfig.registerSheet(ItemDoc, EGREGORA_CONFIG.ID, EgregoraItemSheet, {
    types: ["skill", "talent", "quality", "defect", "gear", "weapon", "armor", "spell", "mutation", "critical"],
    makeDefault: true,
    label: "EGREGORA.Sheet.Item",
  });

  YearZeroRollManager.register("egregora", {
    Roll: {
      baseTemplate: `systems/${EGREGORA_CONFIG.ID}/templates/dice/broll.hbs`,
      chatTemplate: `systems/${EGREGORA_CONFIG.ID}/templates/dice/roll.hbs`,
      tooltipTemplate: `systems/${EGREGORA_CONFIG.ID}/templates/dice/tooltip.hbs`,
      infosTemplate: `systems/${EGREGORA_CONFIG.ID}/templates/dice/infos.hbs`,
    },
  });
});

Hooks.once("diceSoNiceReady", registerDice3D);

Hooks.once("ready", () => {
  Hooks.on("hotbarDrop", (bar, data, slot) => {
    if (data.type === "Item" && data.uuid) {
      createItemMacro(data, slot);
      return false;
    }
  });
});

async function createItemMacro(data, slot) {
  const item = await Item.fromDropData(data);
  if (!item || !item.actor) {
    return ui.notifications.warn(game.i18n.localize("EGREGORA.Notifications.MacroOwnedItemsOnly"));
  }
  const macroName = `${item.actor.name}: ${item.name}`;
  const command = `(await fromUuid("${data.uuid}"))?.roll();`;
  let macro = game.macros.find(m => m.name === macroName && m.command === command);
  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: "script",
      img: item.img,
      command,
      flags: { "fvtt-egregora.itemMacro": true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
}
