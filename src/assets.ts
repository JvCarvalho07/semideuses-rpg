export type UiAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;

const asset = (file: string, alt = ""): UiAsset => ({
  src: `${ASSET_BASE}${file}`,
  width: 256,
  height: 256,
  alt,
});

export const ASSETS = {
  resources: {
    vitality: asset("resource-vitality.webp"),
    mana: asset("resource-mana.webp"),
    divine: asset("resource-divine.webp"),
    texture: asset("resource-panel-texture.webp"),
  },
  currency: {
    dracma: asset("currency-dracma.webp"),
    human: asset("currency-human.webp"),
  },
  stats: {
    armor: asset("stat-armor.webp"),
    initiative: asset("stat-initiative.webp"),
    speed: asset("stat-speed.webp"),
    perception: asset("stat-perception.webp"),
    casting: asset("stat-casting.webp"),
    savingThrows: asset("stat-saving-throws.webp"),
    temporaryHp: asset("stat-temp-hp.webp"),
    favor: asset("stat-favor.webp"),
    sustain: asset("stat-sustain.webp"),
    divine: asset("stat-divine.webp"),
  },
  attributes: {
    for: asset("attribute-for.webp"),
    des: asset("attribute-des.webp"),
    con: asset("attribute-con.webp"),
    int: asset("attribute-int.webp"),
    sab: asset("attribute-sab.webp"),
    car: asset("attribute-car.webp"),
  },
  sections: {
    skills: asset("section-skills.webp"),
    path: asset("section-path.webp"),
    signature: asset("section-signature.webp"),
    filiation: asset("section-filiation.webp"),
    abilities: asset("section-abilities.webp"),
    talents: asset("section-talents.webp"),
    history: asset("section-skills.webp"),
    traits: asset("section-abilities.webp"),
    notes: asset("section-notes.webp"),
  },
  equipment: {
    Arma: asset("equipment-arma.webp"),
    Armadura: asset("equipment-armadura.webp"),
    Escudo: asset("equipment-escudo.webp"),
    Ferramenta: asset("equipment-ferramenta.webp"),
    Acessório: asset("equipment-acessorio.webp"),
    Relíquia: asset("equipment-reliquia.webp"),
    Consumível: asset("equipment-consumivel.webp"),
    Outro: asset("equipment-outro.webp"),
    equipped: asset("equipment-equipped.webp"),
    inventory: asset("equipment-inventory.webp"),
  },
} as const;

export const FILIATION_SEALS = {
  Zeus: asset("filiation-zeus.webp"),
  Poseidon: asset("filiation-poseidon.webp"),
  Hades: asset("filiation-hades.webp"),
  Atena: asset("filiation-atena.webp"),
  Ares: asset("filiation-ares.webp"),
  Apolo: asset("filiation-apolo.webp"),
  Hefesto: asset("filiation-hefesto.webp"),
  Hermes: asset("filiation-hermes.webp"),
  Afrodite: asset("filiation-afrodite.webp"),
  "Deméter": asset("filiation-demeter.webp"),
  "Dionísio": asset("filiation-dionisio.webp"),
  "Ártemis": asset("filiation-artemis.webp"),
  "Hécate": asset("filiation-hecate.webp"),
  "Íris": asset("filiation-iris.webp"),
  "Nêmesis": asset("filiation-nemesis.webp"),
  Hipnos: asset("filiation-hipnos.webp"),
  Morfeu: asset("filiation-morfeu.webp"),
  Nike: asset("filiation-nike.webp"),
  Tique: asset("filiation-tique.webp"),
  "Tânatos": asset("filiation-tanatos.webp"),
  "Éolo": asset("filiation-eolo.webp"),
  Circe: asset("filiation-circe.webp"),
  "Perséfone": asset("filiation-persefone.webp"),
  Hebe: asset("filiation-hebe.webp"),
  Eros: asset("filiation-eros.webp"),
  Nyx: asset("filiation-nyx.webp"),
} as const;

export type EquipmentAssetKey = keyof typeof ASSETS.equipment;
