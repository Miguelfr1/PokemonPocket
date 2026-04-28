import pokemonEn from "pokemon/data/en.json"
import pokemonFr from "pokemon/data/fr.json"

export type PocketCard = {
  set: string
  number: number
  rarity: string
  name: string
  image?: string
  packs: string[]
}

export type PocketSet = {
  code: string
  releaseDate: string
  count: number
  name: Record<string, string>
  packs: string[]
}

export type RarityInfo = {
  label: string
  group?: string
  points?: number
  tradeable?: boolean
}

export type PocketData = {
  cards: PocketCard[]
  sets: PocketSet[]
  rarities: Record<string, RarityInfo>
}

const DATA_BASE = "https://cdn.jsdelivr.net/npm/pokemon-tcg-pocket-database/dist"
const LIMITLESS_BASE = "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pocket"
const frenchPokemonNames = new Map<string, string>(
  pokemonEn.map((name, index) => [name, pokemonFr[index] ?? name]),
)

export async function loadPocketData(): Promise<PocketData> {
  const [cards, groupedSets, rarities] = await Promise.all([
    fetch(`${DATA_BASE}/cards.json`).then((response) => response.json() as Promise<PocketCard[]>),
    fetch(`${DATA_BASE}/sets.json`).then((response) => response.json() as Promise<Record<string, PocketSet[]>>),
    fetch(`${DATA_BASE}/rarities.json`).then((response) => response.json() as Promise<Record<string, RarityInfo>>),
  ])

  return {
    cards,
    sets: Object.values(groupedSets).flat(),
    rarities,
  }
}

export function cardKey(card: Pick<PocketCard, "set" | "number">) {
  return `${card.set}-${card.number}`
}

export function formatCardNumber(card: Pick<PocketCard, "number">) {
  return String(card.number).padStart(3, "0")
}

export function limitlessSetCode(setCode: string) {
  if (setCode === "PROMO-A") return "P-A"
  if (setCode === "PROMO-B") return "P-B"
  return setCode
}

export function limitlessImageUrl(card: Pick<PocketCard, "set" | "number">, size: "small" | "large" = "small") {
  const setCode = limitlessSetCode(card.set)
  const suffix = size === "small" ? "_SM" : ""
  return `${LIMITLESS_BASE}/${setCode}/${setCode}_${formatCardNumber(card)}_EN${suffix}.webp`
}

export function displayCardName(card: Pick<PocketCard, "name">) {
  const match = card.name.match(/^(.*?)(\s+ex)?$/i)
  const baseName = match?.[1] ?? card.name
  const suffix = match?.[2] ?? ""
  return `${frenchPokemonNames.get(baseName) ?? baseName}${suffix}`
}

export function setName(set: PocketSet) {
  return set.name.en ?? Object.values(set.name)[0] ?? set.code
}
