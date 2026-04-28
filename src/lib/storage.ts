import { supabase } from "@/lib/supabase"

export type Collector = {
  id: string
  display_name: string
  color: string
}

export type Account = {
  id: string
  pseudo: string
  collector_id: string
  password_hash: string
  created_at?: string
}

export type AcquisitionSource = "pack" | "wonder_pick" | "trade" | "unknown"

export type CollectionEntry = {
  id?: string
  collector_id: string
  card_key: string
  set_code: string
  card_number: number
  owned: boolean
  acquisition_source: AcquisitionSource | null
  note: string | null
  obtained_at: string | null
  updated_at?: string
}

export type WonderMiss = {
  id?: string
  collector_id: string
  card_key: string
  set_code: string
  card_number: number
  card_name: string
  missed_on: string
  note: string | null
  created_at?: string
}

// ─── Session ─────────────────────────────────────────────────────────────────

export type Session = {
  collector_id: string
  display_name: string
  color: string
}

const sessionKey = "pocketdex.session"

export function getSession(): Session | null {
  const raw = localStorage.getItem(sessionKey)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function saveSession(collector: Collector): Session {
  const session: Session = {
    collector_id: collector.id,
    display_name: collector.display_name,
    color: collector.color,
  }
  localStorage.setItem(sessionKey, JSON.stringify(session))
  return session
}

export function clearSession() {
  localStorage.removeItem(sessionKey)
}

// ─── Local storage helpers ────────────────────────────────────────────────────

const collectorsKey = "pocketdex.collectors"
const accountsKey = "pocketdex.accounts"
const entriesKey = "pocketdex.collection_entries"
const missesKey = "pocketdex.wonder_misses"

function readLocal<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

function colorForName(displayName: string) {
  const palette = ["#ef4444", "#0ea5e9", "#22c55e", "#f97316", "#a855f7", "#ec4899", "#14b8a6"]
  return palette[Math.abs(displayName.length) % palette.length]
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Crée un compte et le collecteur associé. Retourne le collecteur.
 */
export async function createAccount(pseudo: string, password: string): Promise<Collector> {
  const normalizedPseudo = pseudo.trim()
  const passwordHash = await hashPassword(password)
  const collector: Collector = {
    id: crypto.randomUUID(),
    display_name: normalizedPseudo,
    color: colorForName(normalizedPseudo),
  }
  const account: Account = {
    id: crypto.randomUUID(),
    pseudo: normalizedPseudo,
    collector_id: collector.id,
    password_hash: passwordHash,
    created_at: new Date().toISOString(),
  }

  if (!supabase) {
    const accounts = readLocal<Account[]>(accountsKey, [])
    const collectors = readLocal<Collector[]>(collectorsKey, [])
    const pseudoTaken =
      accounts.some((a) => a.pseudo.toLowerCase() === normalizedPseudo.toLowerCase()) ||
      collectors.some((c) => c.display_name.toLowerCase() === normalizedPseudo.toLowerCase())

    if (pseudoTaken) throw new Error("Ce pseudo est déjà pris.")

    writeLocal(collectorsKey, [...collectors, collector])
    writeLocal(accountsKey, [...accounts, account])
    return collector
  }

  const { data: createdCollector, error: collectorError } = await supabase
    .from("collectors")
    .insert(collector)
    .select()
    .single()
  if (collectorError) throw collectorError

  const { error: accountError } = await supabase.from("app_accounts").insert(account)
  if (accountError) throw accountError

  return createdCollector
}

/**
 * Connecte un utilisateur existant. Retourne le collecteur associé.
 */
export async function login(pseudo: string, password: string): Promise<Collector> {
  const normalizedPseudo = pseudo.trim()
  const passwordHash = await hashPassword(password)

  if (!supabase) {
    const accounts = readLocal<Account[]>(accountsKey, [])
    const account = accounts.find(
      (a) =>
        a.pseudo.toLowerCase() === normalizedPseudo.toLowerCase() &&
        a.password_hash === passwordHash,
    )
    if (!account) throw new Error("Pseudo ou mot de passe incorrect.")

    const collectors = readLocal<Collector[]>(collectorsKey, [])
    const collector = collectors.find((c) => c.id === account.collector_id)
    if (!collector) throw new Error("Compte invalide, contacte l'admin.")
    return collector
  }

  const { data: account, error: accountError } = await supabase
    .from("app_accounts")
    .select("collector_id")
    .ilike("pseudo", normalizedPseudo)
    .eq("password_hash", passwordHash)
    .maybeSingle()

  if (accountError) throw accountError
  if (!account) throw new Error("Pseudo ou mot de passe incorrect.")

  const { data: collector, error: collectorError } = await supabase
    .from("collectors")
    .select("*")
    .eq("id", account.collector_id)
    .single()

  if (collectorError || !collector) throw new Error("Compte invalide.")
  return collector as Collector
}

// ─── Collectors ───────────────────────────────────────────────────────────────

export async function getCollectors(): Promise<Collector[]> {
  if (!supabase) return readLocal<Collector[]>(collectorsKey, [])

  const { data, error } = await supabase.from("collectors").select("*").order("created_at")
  if (error) throw error
  return data
}

export async function createCollector(displayName: string): Promise<Collector> {
  const normalizedName = displayName.trim()
  const collector: Collector = {
    id: crypto.randomUUID(),
    display_name: normalizedName,
    color: colorForName(normalizedName),
  }

  if (!supabase) {
    const collectors = readLocal<Collector[]>(collectorsKey, [])
    const exists = collectors.some(
      (c) => c.display_name.toLowerCase() === normalizedName.toLowerCase(),
    )
    if (exists) throw new Error("Ce nom de collecteur existe déjà.")
    writeLocal(collectorsKey, [...collectors, collector])
    return collector
  }

  const { data, error } = await supabase.from("collectors").insert(collector).select().single()
  if (error) throw error
  return data
}

/**
 * Cherche un ami par son pseudo dans app_accounts et retourne son collecteur.
 * Contrairement à createCollector, ne crée rien — lit uniquement.
 */
export async function findFriendByPseudo(pseudo: string): Promise<Collector> {
  const normalized = pseudo.trim()

  if (!supabase) {
    // Mode local : cherche dans les comptes locaux
    const accounts = readLocal<Account[]>(accountsKey, [])
    const account = accounts.find(
      (a) => a.pseudo.toLowerCase() === normalized.toLowerCase(),
    )
    if (!account) throw new Error(`Aucun compte trouvé pour "${normalized}".`)
    const collectors = readLocal<Collector[]>(collectorsKey, [])
    const collector = collectors.find((c) => c.id === account.collector_id)
    if (!collector) throw new Error("Compte invalide.")
    return collector
  }

  const { data: account, error: accountError } = await supabase
    .from("app_accounts")
    .select("collector_id")
    .ilike("pseudo", normalized)
    .maybeSingle()

  if (accountError) throw accountError
  if (!account) throw new Error(`Aucun compte trouvé pour "${normalized}".`)

  const { data: collector, error: collectorError } = await supabase
    .from("collectors")
    .select("*")
    .eq("id", account.collector_id)
    .single()

  if (collectorError || !collector) throw new Error("Compte invalide.")
  return collector as Collector
}


// ─── Collection entries ───────────────────────────────────────────────────────

export async function getCollectionEntries(): Promise<CollectionEntry[]> {
  if (!supabase) return readLocal<CollectionEntry[]>(entriesKey, [])

  const { data, error } = await supabase.from("collection_entries").select("*")
  if (error) throw error
  return data
}

export async function saveCollectionEntry(entry: CollectionEntry): Promise<CollectionEntry> {
  const next = {
    ...entry,
    updated_at: new Date().toISOString(),
  }

  if (!supabase) {
    const entries = readLocal<CollectionEntry[]>(entriesKey, [])
    const index = entries.findIndex(
      (item) => item.collector_id === next.collector_id && item.card_key === next.card_key,
    )
    const saved = { ...next, id: next.id ?? `${next.collector_id}-${next.card_key}` }
    if (index >= 0) entries[index] = saved
    else entries.push(saved)
    writeLocal(entriesKey, entries)
    return saved
  }

  const { data, error } = await supabase
    .from("collection_entries")
    .upsert(next, { onConflict: "collector_id,card_key" })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Wonder misses ────────────────────────────────────────────────────────────

export async function getWonderMisses(): Promise<WonderMiss[]> {
  if (!supabase) return readLocal<WonderMiss[]>(missesKey, [])

  const { data, error } = await supabase
    .from("wonder_misses")
    .select("*")
    .order("missed_on", { ascending: false })

  if (error) throw error
  return data
}

export async function createWonderMiss(miss: WonderMiss): Promise<WonderMiss> {
  if (!supabase) {
    const misses = readLocal<WonderMiss[]>(missesKey, [])
    const saved = {
      ...miss,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    }
    misses.unshift(saved)
    writeLocal(missesKey, misses)
    return saved
  }

  const { data, error } = await supabase.from("wonder_misses").insert(miss).select().single()
  if (error) throw error
  return data
}

export async function deleteWonderMiss(id: string): Promise<void> {
  if (!supabase) {
    writeLocal(
      missesKey,
      readLocal<WonderMiss[]>(missesKey, []).filter((miss) => miss.id !== id),
    )
    return
  }

  const { error } = await supabase.from("wonder_misses").delete().eq("id", id)
  if (error) throw error
}
