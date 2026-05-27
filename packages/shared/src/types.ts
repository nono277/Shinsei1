export enum Grade {
  EVEILLE = 'EVEILLE',
  D = 'D',
  C = 'C',
  B = 'B',
  A = 'A',
  S = 'S',
  SS = 'SS',
}

export enum Class {
  HUNTER = 'hunter',
  TITAN = 'titan',
  ARCANE = 'arcane',
  SHINIGAMI = 'shinigami',
  BETE = 'bete',
}

export enum Faction {
  ORDRE = 'ORDRE',
  FRACTURES = 'FRACTURES',
  NOMADES = 'NOMADES',
}

export interface ModEntry {
  id: string
  name: string
  version: string
  url: string
  checksum: string
  required: boolean
}

export interface ServerManifest {
  version: string
  mods: ModEntry[]
  checksum: string
  minecraftVersion: string
  forgeVersion: string
}

export interface PlayerProfile {
  uuid: string
  username: string
  gradeShop: Grade
  gradeGameplay: Grade
  faction: Faction
  class: Class | null
}
