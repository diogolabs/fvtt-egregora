import { EGREGORA_CONFIG, getCorruptionStage } from "../config.mjs";

const fields = foundry.data.fields;

function makeAttributeSchema(initialValue = 3, maxLimit = 6) {
  return new fields.SchemaField({
    value: new fields.NumberField({ required: true, integer: true, initial: initialValue, min: 0, max: maxLimit }),
    mod: new fields.NumberField({ required: true, integer: true, initial: 0 }),
  });
}

export class EgregoraCharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      playerName: new fields.StringField({ initial: "" }),
      archetype: new fields.StringField({ initial: "" }),
      groupType: new fields.StringField({ initial: "" }),
      sect: new fields.StringField({ initial: "none" }),
      ageBracket: new fields.StringField({
        required: true,
        initial: "adult",
        choices: ["young", "adult", "elder"],
      }),
      ageYears: new fields.StringField({ initial: "" }),
      concept: new fields.StringField({ initial: "" }),

      attributes: new fields.SchemaField({
        strength: makeAttributeSchema(3, 6),
        agility: makeAttributeSchema(3, 6),
        intelligence: makeAttributeSchema(3, 6),
        empathy: makeAttributeSchema(3, 6),
      }),

      health: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 6, min: 0 }),
        max: new fields.NumberField({ required: true, integer: true, initial: 6, min: 0 }),
        customMax: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null, min: 0 }),
      }),

      mental: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 6, min: 0 }),
        max: new fields.NumberField({ required: true, integer: true, initial: 6, min: 0 }),
        permanentTrauma: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        customMax: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null, min: 0 }),
      }),

      willpower: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 10 }),
        max: new fields.NumberField({ required: true, integer: true, initial: 10, min: 0, max: 10 }),
      }),

      corruption: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 10 }),
        max: new fields.NumberField({ required: true, integer: true, initial: 10, min: 0, max: 10 }),
      }),

      magic: new fields.SchemaField({
        aptitude: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 3 }),
        paths: new fields.SchemaField({
          matter: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 5 }),
          flux: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 5 }),
          mind: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 5 }),
          life: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 5 }),
          echoes: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 5 }),
          abyss: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 5 }),
        }),
        notes: new fields.StringField({ initial: "" }),
      }),

      traits: new fields.SchemaField({
        pride: new fields.SchemaField({
          text: new fields.StringField({ initial: "" }),
          used: new fields.BooleanField({ initial: false }),
        }),
        darkSecret: new fields.StringField({ initial: "" }),
        bigDream: new fields.StringField({ initial: "" }),
        weakness: new fields.StringField({ initial: "" }),
      }),

      anchor: new fields.StringField({ initial: "" }),
      tension: new fields.StringField({ initial: "" }),
      resources: new fields.NumberField({ required: true, integer: true, initial: 2, min: 0, max: 10 }),

      experience: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
        total: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      }),

      appearance: new fields.StringField({ initial: "" }),
      biography: new fields.HTMLField({ initial: "" }),
      notes: new fields.HTMLField({ initial: "" }),
    };
  }

  prepareDerivedData() {
    const str = Number(this.attributes.strength.value) || 0;
    const agi = Number(this.attributes.agility.value) || 0;
    const int = Number(this.attributes.intelligence.value) || 0;
    const emp = Number(this.attributes.empathy.value) || 0;

    // Egrégora: PV = FOR + AGI; PM = INT + EMP - Trauma Permanente
    if (this.health.customMax !== null && this.health.customMax > 0) {
      this.health.max = this.health.customMax;
    } else {
      this.health.max = Math.max(1, str + agi);
    }

    const trauma = Number(this.mental.permanentTrauma) || 0;
    if (this.mental.customMax !== null && this.mental.customMax > 0) {
      this.mental.max = Math.max(0, this.mental.customMax - trauma);
    } else {
      this.mental.max = Math.max(0, int + emp - trauma);
    }

    // Estágio de Corrupção
    this.corruptionStage = getCorruptionStage(this.corruption.value);

    // Focus Mágico (Aptidão Mágica 0/1/2/3 => 0/2/4/6)
    const apt = EGREGORA_CONFIG.magicAptitudeLevels[this.magic.aptitude] ?? EGREGORA_CONFIG.magicAptitudeLevels[0];
    this.magic.focusMax = apt.focus;
    this.magic.maxPathRank = apt.maxPath;
    this.magic.focusSpent = Object.values(this.magic.paths).reduce((acc, v) => acc + (Number(v) || 0), 0);

    // Somatório de pontos de Qualidades e Defeitos
    const items = this.parent?.items ?? [];
    this.qualityPoints = items
      .filter(i => i.type === "quality")
      .reduce((acc, i) => acc + (Number(i.system.points) || 0), 0);
    this.defectPoints = items
      .filter(i => i.type === "defect")
      .reduce((acc, i) => acc + (Number(i.system.points) || 0), 0);

    // Penalidade de armadura equipada
    this.armorPenalty = items
      .filter(i => i.type === "armor" && i.system.equipped)
      .reduce((acc, i) => acc + (Number(i.system.agilityPenalty) || 0), 0);
  }
}

export class EgregoraNpcData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      role: new fields.StringField({ initial: "" }),
      fearRating: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 10 }),

      attributes: new fields.SchemaField({
        strength: makeAttributeSchema(3, 20),
        agility: makeAttributeSchema(3, 20),
        intelligence: makeAttributeSchema(3, 20),
        empathy: makeAttributeSchema(3, 20),
      }),

      health: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 6, min: 0 }),
        max: new fields.NumberField({ required: true, integer: true, initial: 6, min: 0 }),
        customMax: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null, min: 0 }),
      }),

      mental: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 6, min: 0 }),
        max: new fields.NumberField({ required: true, integer: true, initial: 6, min: 0 }),
        customMax: new fields.NumberField({ required: false, nullable: true, integer: true, initial: null, min: 0 }),
      }),

      armorRating: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),

      corruption: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, max: 10 }),
        max: new fields.NumberField({ required: true, integer: true, initial: 10, min: 0, max: 10 }),
      }),

      notes: new fields.HTMLField({ initial: "" }),
    };
  }

  prepareDerivedData() {
    if (this.health.customMax !== null && this.health.customMax > 0) {
      this.health.max = this.health.customMax;
    } else {
      this.health.max = Math.max(1, (this.attributes.strength.value || 0) + (this.attributes.agility.value || 0));
    }

    if (this.mental.customMax !== null && this.mental.customMax > 0) {
      this.mental.max = this.mental.customMax;
    } else {
      this.mental.max = Math.max(1, (this.attributes.intelligence.value || 0) + (this.attributes.empathy.value || 0));
    }

    this.corruptionStage = getCorruptionStage(this.corruption.value);
  }
}

export class EgregoraVehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      vehicleType: new fields.StringField({ initial: "" }),
      passengers: new fields.NumberField({ required: true, integer: true, initial: 4, min: 0 }),
      maneuverability: new fields.NumberField({ required: true, integer: true, initial: 2 }),

      hull: new fields.SchemaField({
        value: new fields.NumberField({ required: true, integer: true, initial: 4, min: 0 }),
        max: new fields.NumberField({ required: true, integer: true, initial: 4, min: 1 }),
      }),

      armor: new fields.NumberField({ required: true, integer: true, initial: 4, min: 0 }),
      damage: new fields.NumberField({ required: true, integer: true, initial: 2, min: 0 }),
      speed: new fields.StringField({ initial: "5 setores/dia" }),
      altitude: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
      wrecked: new fields.BooleanField({ initial: false }),
      notes: new fields.HTMLField({ initial: "" }),
    };
  }

  prepareDerivedData() {
    this.rammingDamage = this.damage > 0 ? this.damage : Math.ceil((this.hull.max || 1) / 2);
  }
}
