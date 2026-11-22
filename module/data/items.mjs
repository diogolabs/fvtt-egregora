const fields = foundry.data.fields;

export class EgregoraSkillData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      skillKey: new fields.StringField({ initial: "" }),
      attribute: new fields.StringField({
        required: true,
        initial: "strength",
        choices: ["strength", "agility", "intelligence", "empathy"],
      }),
      level: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 5 }),
      isKeySkill: new fields.BooleanField({ initial: false }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}

export class EgregoraTalentData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      category: new fields.StringField({
        required: true,
        initial: "archetype",
        choices: ["archetype", "group", "general", "exclusive", "supernatural"],
      }),
      rank: new fields.NumberField({ required: true, integer: true, initial: 1, min: 1, max: 4 }),
      willpowerCost: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      corruptionCost: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      attribute: new fields.StringField({ initial: "" }),
      associatedSkill: new fields.StringField({ initial: "" }),
      modifier: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      summary: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}

export class EgregoraQualityData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      category: new fields.StringField({
        required: true,
        initial: "mental",
        choices: ["supernatural", "physical", "mental", "occult", "social"],
      }),
      points: new fields.NumberField({ required: true, integer: true, initial: 1, min: 1, max: 5 }),
      summary: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}

export class EgregoraDefectData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      category: new fields.StringField({
        required: true,
        initial: "mental",
        choices: ["supernatural", "physical", "mental", "occult", "social"],
      }),
      points: new fields.NumberField({ required: true, integer: true, initial: 1, min: 1, max: 5 }),
      summary: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}

export class EgregoraGearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      usage: new fields.StringField({ initial: "" }),
      bonus: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 10 }),
      durability: new fields.NumberField({ required: true, integer: true, initial: 3, min: 0, max: 10 }),
      maxDurability: new fields.NumberField({ required: true, integer: true, initial: 3, min: 0, max: 10 }),
      value: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, max: 10 }),
      quantity: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0 }),
      associatedSkill: new fields.StringField({ initial: "" }),
      effect: new fields.StringField({ initial: "" }),
      isRelic: new fields.BooleanField({ initial: false }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}

export class EgregoraWeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      skill: new fields.StringField({ initial: "" }),
      attribute: new fields.StringField({
        required: true,
        initial: "strength",
        choices: ["strength", "agility", "intelligence", "empathy"],
      }),
      damage: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0 }),
      bonus: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, max: 10 }),
      maxBonus: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, max: 10 }),
      range: new fields.StringField({
        required: true,
        initial: "engaged",
        choices: ["engaged", "short", "medium", "long", "extreme"],
      }),
      durability: new fields.NumberField({ required: true, integer: true, initial: 3, min: 0, max: 10 }),
      maxDurability: new fields.NumberField({ required: true, integer: true, initial: 3, min: 0, max: 10 }),
      ammo: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        max: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      }),
      value: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, max: 10 }),
      effect: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}

export class EgregoraArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      protection: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, max: 20 }),
      maxProtection: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, max: 20 }),
      agilityPenalty: new fields.NumberField({ required: true, integer: true, initial: 0, min: -10, max: 0 }),
      value: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, max: 10 }),
      equipped: new fields.BooleanField({ initial: true }),
      effect: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}

export class EgregoraSpellData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      primaryPath: new fields.StringField({
        required: true,
        initial: "echoes",
        choices: ["matter", "flux", "mind", "life", "echoes", "abyss"],
      }),
      secondaryPath: new fields.StringField({
        initial: "",
        choices: ["", "matter", "flux", "mind", "life", "echoes", "abyss"],
      }),
      requiredFocus: new fields.NumberField({ required: true, integer: true, initial: 1, min: 1, max: 5 }),
      defaultAttribute: new fields.StringField({
        required: true,
        initial: "intelligence",
        choices: ["strength", "agility", "intelligence", "empathy"],
      }),
      willpowerCost: new fields.NumberField({ required: true, integer: true, initial: 1, min: 1, max: 10 }),
      inGrimoire: new fields.BooleanField({ initial: true }),
      directDamage: new fields.BooleanField({ initial: false }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}

export class EgregoraMutationData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      tier: new fields.StringField({
        required: true,
        initial: "minor",
        choices: ["minor", "notable", "aberrant"],
      }),
      d66: new fields.StringField({ initial: "" }),
      effect: new fields.StringField({ initial: "" }),
      cost: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}

export class EgregoraCriticalData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      d66: new fields.StringField({ initial: "" }),
      lethal: new fields.BooleanField({ initial: false }),
      stabilized: new fields.BooleanField({ initial: false }),
      timeLimit: new fields.StringField({ initial: "—" }),
      healMod: new fields.NumberField({ required: true, integer: true, initial: 0 }),
      healingTime: new fields.StringField({ initial: "—" }),
      effect: new fields.StringField({ initial: "" }),
      description: new fields.HTMLField({ initial: "" }),
    };
  }
}
