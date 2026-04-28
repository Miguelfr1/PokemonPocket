import { useEffect, useMemo, useState } from "react"
import {
  ArrowDownUp,
  Database,
  LogOut,
  Loader2,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TooltipProvider } from "@/components/ui/tooltip"
import CardDialog from "@/components/CardDialog"
import CardGrid from "@/components/CardGrid"
import RarityBadge, { RARITY_CONFIG, RARITY_ORDER } from "@/components/RarityBadge"
import SetOverview from "@/components/SetOverview"
import WonderMissPanel from "@/components/WonderMissPanel"
import {
  cardKey,
  displayCardName,
  loadPocketData,
  setName,
  type PocketCard,
  type PocketData,
} from "@/lib/pocket-data"
import {
  findFriendByPseudo,
  createWonderMiss,
  deleteWonderMiss,
  getCollectionEntries,
  getCollectors,
  getWonderMisses,
  saveCollectionEntry,
  type CollectionEntry,
  type Collector,
  type Session,
  type WonderMiss,
} from "@/lib/storage"

const today = () => new Date().toISOString().slice(0, 10)

interface DexPageProps {
  session: Session
  onLogout: () => void
}

export default function DexPage({ session, onLogout }: DexPageProps) {
  const [data, setData] = useState<PocketData | null>(null)
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [entries, setEntries] = useState<CollectionEntry[]>([])
  const [misses, setMisses] = useState<WonderMiss[]>([])
  const [compareCollectorId, setCompareCollectorId] = useState("none")
  const [selectedSetCode, setSelectedSetCode] = useState("")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"number" | "rarity_asc" | "rarity_desc">("number")
  const [filterRarities, setFilterRarities] = useState<Set<string>>(new Set())
  const [selectedCard, setSelectedCard] = useState<PocketCard | null>(null)
  const [addFriendOpen, setAddFriendOpen] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // The active collector is always the logged-in user
  const activeCollector = useMemo(
    () =>
      collectors.find((c) => c.id === session.collector_id) ?? {
        id: session.collector_id,
        display_name: session.display_name,
        color: session.color,
      },
    [collectors, session],
  )

  useEffect(() => {
    async function boot() {
      try {
        const [pocketData, loadedCollectors, loadedEntries, loadedMisses] = await Promise.all([
          loadPocketData(),
          getCollectors(),
          getCollectionEntries(),
          getWonderMisses(),
        ])

        const latestSet = pocketData.sets.reduce((latest, set) =>
          new Date(set.releaseDate) > new Date(latest.releaseDate) ? set : latest,
          pocketData.sets[0],
        )

        setData(pocketData)
        setCollectors(loadedCollectors)
        setEntries(loadedEntries)
        setMisses(loadedMisses)
        setSelectedSetCode(latestSet?.code ?? "")
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible de charger les données.")
      } finally {
        setBusy(false)
      }
    }
    boot()
  }, [])

  const friends = useMemo(
    () => collectors.filter((c) => c.id !== session.collector_id),
    [collectors, session.collector_id],
  )

  const compareCollector = useMemo(
    () => collectors.find((c) => c.id === compareCollectorId) ?? null,
    [collectors, compareCollectorId],
  )

  const selectedSet = data?.sets.find((set) => set.code === selectedSetCode)

  const entriesByCollector = useMemo(() => {
    const map = new Map<string, CollectionEntry>()
    for (const entry of entries) {
      map.set(`${entry.collector_id}:${entry.card_key}`, entry)
    }
    return map
  }, [entries])

  // Available rarities for the current set (for filter chips)
  const raritiesInSet = useMemo(() => {
    if (!data) return []
    const seen = new Set<string>()
    data.cards
      .filter((card) => card.set === selectedSetCode)
      .forEach((card) => seen.add(card.rarity))
    return Object.keys(RARITY_CONFIG).filter((r) => seen.has(r))
  }, [data, selectedSetCode])

  function toggleRarityFilter(rarity: string) {
    setFilterRarities((prev) => {
      const next = new Set(prev)
      if (next.has(rarity)) next.delete(rarity)
      else next.add(rarity)
      return next
    })
  }

  function clearFilters() {
    setFilterRarities(new Set())
    setSearch("")
  }

  const cardsForSet = useMemo(() => {
    if (!data) return []
    const query = search.trim().toLowerCase()
    const filtered = data.cards
      .filter((card) => card.set === selectedSetCode)
      .filter((card) => {
        if (!query) return true
        return (
          card.name.toLowerCase().includes(query) ||
          displayCardName(card).toLowerCase().includes(query) ||
          String(card.number).includes(query) ||
          card.rarity.toLowerCase().includes(query)
        )
      })
      .filter((card) => filterRarities.size === 0 || filterRarities.has(card.rarity))

    if (sortBy === "number") {
      return filtered.sort((a, b) => a.number - b.number)
    }
    return filtered.sort((a, b) => {
      const diff = (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99)
      if (diff !== 0) return sortBy === "rarity_asc" ? diff : -diff
      return a.number - b.number // secondary: by number
    })
  }, [data, search, selectedSetCode, sortBy, filterRarities])

  const stats = useMemo(() => {
    if (!data || !selectedSet) return []
    const setCards = data.cards.filter((card) => card.set === selectedSet.code)
    return collectors.map((collector) => {
      const owned = setCards.filter((card) =>
        entriesByCollector.get(`${collector.id}:${cardKey(card)}`)?.owned,
      ).length
      return {
        collector,
        owned,
        total: setCards.length,
        percent: setCards.length ? Math.round((owned / setCards.length) * 100) : 0,
      }
    })
  }, [collectors, data, entriesByCollector, selectedSet])

  // ── Mutations ────────────────────────────────────────────────────────────────

  async function persistEntry(entry: CollectionEntry) {
    const saved = await saveCollectionEntry(entry)
    setEntries((current) => {
      const index = current.findIndex(
        (item) => item.collector_id === saved.collector_id && item.card_key === saved.card_key,
      )
      if (index < 0) return [...current, saved]
      const next = [...current]
      next[index] = saved
      return next
    })
  }

  async function toggleOwned(card: PocketCard, collector: Collector, owned: boolean) {
    const key = cardKey(card)
    const current = entriesByCollector.get(`${collector.id}:${key}`)
    await persistEntry({
      id: current?.id,
      collector_id: collector.id,
      card_key: key,
      set_code: card.set,
      card_number: card.number,
      owned,
      acquisition_source: owned ? current?.acquisition_source ?? "pack" : null,
      note: current?.note ?? null,
      obtained_at: owned ? current?.obtained_at ?? today() : null,
    })
  }

  async function addMiss(
    card: PocketCard,
    collector: Collector,
    note: string,
    missedOn: string,
  ) {
    const miss = await createWonderMiss({
      collector_id: collector.id,
      card_key: cardKey(card),
      set_code: card.set,
      card_number: card.number,
      card_name: displayCardName(card),
      missed_on: missedOn,
      note: note.trim() || null,
    })
    setMisses((current) => [miss, ...current])
  }

  async function removeMiss(id: string) {
    await deleteWonderMiss(id)
    setMisses((current) => current.filter((miss) => miss.id !== id))
  }

  async function addFriend(pseudo: string) {
    const collector = await findFriendByPseudo(pseudo)
    
    // Check if friend is already in the collectors list
    if (collectors.some((c) => c.id === collector.id)) {
      setCompareCollectorId(collector.id)
      return
    }
    
    setCollectors((current) => [...current, collector])
    setCompareCollectorId(collector.id)
  }

  // ── Loading / error states ───────────────────────────────────────────────────

  if (busy) {
    return (
      <main className="grid min-h-svh place-items-center">
        <div className="flex items-center gap-3 rounded-2xl border-2 border-[#253b75] bg-white px-5 py-4 shadow-[0_4px_0_#253b75] font-black text-[#253b75]">
          <Loader2 className="size-5 animate-spin" />
          Chargement du dex...
        </div>
      </main>
    )
  }

  if (error || !data || !selectedSet) {
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <Card className="max-w-md border-red-200 bg-white">
          <CardHeader>
            <CardTitle className="text-[#e33535]">Chargement impossible</CardTitle>
            <CardDescription>{error ?? "Aucune donnée disponible."}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <main className="min-h-svh text-[#182b5b]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:px-5 lg:px-8">

          {/* ── Header ── */}
          <header className="sticky top-0 z-20 -mx-3 bg-transparent px-3 py-2 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
            <div className="rounded-2xl border border-[#253b75]/15 bg-white/90 px-3 py-2 shadow-[0_8px_24px_rgb(37_59_117/0.10)] backdrop-blur-xl sm:rounded-[28px] sm:px-4 sm:py-3">

              {/* ── Single row: works on all screen sizes ── */}
              <div className="flex items-center gap-2">

                {/* Icon */}
                <div className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-[#253b75] bg-[#e33535] shadow-[0_2px_0_#253b75] sm:size-10">
                  <Database className="size-3.5 text-white sm:size-4" />
                </div>

                {/* Title — hidden on very small */}
                <h1 className="pokemon-title-mini hidden text-2xl sm:block sm:text-3xl lg:text-4xl">PocketDex</h1>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Set selector — compact, no label */}
                <Select value={selectedSetCode} onValueChange={setSelectedSetCode}>
                  <SelectTrigger className="h-8 max-w-[130px] rounded-full border border-[#253b75]/30 bg-[#f7fbff] text-xs font-black text-[#253b75] sm:max-w-[200px] sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.sets
                      .slice()
                      .reverse()
                      .map((set) => (
                        <SelectItem key={set.code} value={set.code}>
                          {set.code} · {setName(set)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {/* User — dot only on mobile, dot+name on sm+ */}
                <div className="flex h-8 items-center gap-1.5 rounded-full border border-[#253b75]/30 bg-[#f7fbff] px-2 sm:px-3">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: activeCollector.color }}
                  />
                  <span className="hidden text-xs font-black text-[#253b75] sm:block">
                    {activeCollector.display_name}
                  </span>
                </div>

                {/* Logout */}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label="Se déconnecter"
                  title="Se déconnecter"
                  className="size-8 rounded-full border-2 border-[#253b75] bg-white text-[#253b75] shadow-[0_2px_0_#253b75] hover:bg-[#f7fbff]"
                  onClick={onLogout}
                >
                  <LogOut className="size-3.5" />
                </Button>

              </div>
            </div>
          </header>

          {/* ── Main content ── */}
          <section className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-[1fr_340px]">
              <SetOverview
                selectedSet={selectedSet}
                stats={stats}
                activeCollector={activeCollector}
                compareCollector={compareCollector}
              />
              <WonderMissPanel
                collectors={collectors}
                activeCollector={activeCollector}
                compareCollector={compareCollector}
                entries={entries}
                misses={misses}
                onRemove={removeMiss}
              />
            </div>

            {/* Search + sort bar */}
            <div className="flex flex-col gap-2 rounded-2xl border-2 border-[#253b75] bg-white p-2 shadow-[0_4px_0_#253b75] sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#2a5da8]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="rounded-full border-2 border-[#d7e0ff] bg-[#f7fbff] pl-9 font-bold"
                  placeholder="Chercher une carte, un numéro, une rareté..."
                />
              </div>
              {/* Sort button cycling: number → rarity_asc → rarity_desc */}
              <button
                type="button"
                onClick={() =>
                  setSortBy((prev) =>
                    prev === "number" ? "rarity_asc" : prev === "rarity_asc" ? "rarity_desc" : "number",
                  )
                }
                className="flex h-9 items-center gap-1.5 rounded-full border-2 border-[#253b75] bg-[#f7fbff] px-3 font-black text-[#253b75] text-sm hover:bg-[#e8f0ff] transition-colors"
                title={`Tri : ${sortBy === "number" ? "numéro" : sortBy === "rarity_asc" ? "rareté ↑" : "rareté ↓"}`}
              >
                <ArrowDownUp className="size-3.5" />
                {sortBy === "number" && "N°"}
                {sortBy === "rarity_asc" && "Rareté ↑"}
                {sortBy === "rarity_desc" && "Rareté ↓"}
              </button>
              <Badge className="h-8 justify-center rounded-full border-2 border-[#253b75] bg-[#ffcb05] px-3 text-[#253b75]">
                {cardsForSet.length} carte{cardsForSet.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            {/* Rarity filter chips */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border-2 border-[#253b75] bg-white px-3 py-2 shadow-[0_4px_0_#253b75]">
              <span className="text-xs font-black uppercase text-[#253b75]/60 mr-1">Rareté</span>
              {raritiesInSet.map((rarity) => {
                const active = filterRarities.has(rarity)
                const cfg = RARITY_CONFIG[rarity]
                return (
                  <button
                    key={rarity}
                    type="button"
                    onClick={() => toggleRarityFilter(rarity)}
                    title={cfg?.label ?? rarity}
                    className={`flex items-center rounded-full border-2 px-2 py-1 transition-all ${
                      active
                        ? "border-[#253b75] bg-[#253b75] shadow-[0_2px_0_#0f1d3d]"
                        : "border-[#d7e0ff] bg-[#f7fbff] text-[#253b75] hover:border-[#253b75]"
                    }`}
                  >
                    <RarityBadge rarity={rarity} variant="chip" />
                  </button>
                )
              })}
              {filterRarities.size > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-1 rounded-full border-2 border-[#e33535]/50 bg-red-50 px-2 py-1 text-xs font-black text-[#e33535] hover:bg-red-100 transition-colors"
                >
                  <X className="size-3" />
                  Effacer
                </button>
              )}
            </div>

            {/* Compare bar */}
            <div className="flex flex-col gap-2 rounded-2xl border-2 border-[#253b75] bg-white p-2 shadow-[0_4px_0_#253b75] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 px-2 font-black text-[#253b75]">
                <Users className="size-4" />
                Comparer avec
              </div>
              <div className="flex gap-2">
                <Select value={compareCollectorId} onValueChange={setCompareCollectorId}>
                  <SelectTrigger className="min-w-44 rounded-full border-2 border-[#253b75] bg-[#f7fbff] font-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Personne</SelectItem>
                    {friends.map((friend) => (
                      <SelectItem key={friend.id} value={friend.id}>
                        {friend.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full border-2 border-[#253b75] bg-[#ffcb05] font-black text-[#253b75]"
                  onClick={() => setAddFriendOpen(true)}
                >
                  <Plus className="size-4" />
                  Ami
                </Button>
              </div>
            </div>

            {/* Card grid */}
            <CardGrid
              cards={cardsForSet}
              activeCollector={activeCollector}
              compareCollector={compareCollector}
              entriesByCollector={entriesByCollector}
              rarities={data.rarities}
              onOpen={setSelectedCard}
              onQuickToggle={toggleOwned}
            />
          </section>
        </div>

        {/* Dialogs */}
        {selectedCard && (
          <CardDialog
            key={`${activeCollector.id}:${cardKey(selectedCard)}`}
            card={selectedCard}
            collectors={collectors}
            activeCollector={activeCollector}
            entriesByCollector={entriesByCollector}
            rarityLabel={data.rarities[selectedCard.rarity]?.label}
            onClose={() => setSelectedCard(null)}
            onSave={persistEntry}
            onMiss={addMiss}
          />
        )}

        <AddFriendDialog
          open={addFriendOpen}
          onOpenChange={setAddFriendOpen}
          onAdd={addFriend}
        />
      </main>
    </TooltipProvider>
  )
}

// ── AddFriendDialog ────────────────────────────────────────────────────────────

function AddFriendDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (displayName: string) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const displayName = name.trim()
    if (!displayName) {
      setError("Nom obligatoire.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onAdd(displayName)
      setName("")
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible d'ajouter.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-4 border-[#253b75] bg-[#fff4bd] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black text-[#253b75]">
            <Users className="size-5" />
            Ajouter un ami
          </DialogTitle>
          <DialogDescription className="font-bold text-[#52659b]">
            Son dex sera séparé du tien, mais comparable carte par carte.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-black text-[#253b75]">Pseudo</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-full border-2 border-[#253b75] bg-white font-bold"
              placeholder="Ex: Marie"
              onKeyDown={(e) => e.key === "Enter" && void submit()}
            />
          </div>
          {error && (
            <div className="rounded-2xl border-2 border-[#e33535] bg-white p-3 text-sm font-black text-[#e33535]">
              {error}
            </div>
          )}
          <Button
            type="button"
            className="w-full rounded-full bg-[#e33535] font-black text-white"
            onClick={submit}
            disabled={saving}
          >
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
