import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Check,
  CircleSlash,
  Database,
  KeyRound,
  Plus,
  Loader2,
  PackageOpen,
  Search,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  cardKey,
  displayCardName,
  formatCardNumber,
  limitlessImageUrl,
  loadPocketData,
  type PocketCard,
  type PocketData,
  type PocketSet,
  setName,
} from "@/lib/pocket-data"
import {
  createAccount,
  createCollector,
  createWonderMiss,
  deleteWonderMiss,
  getCollectionEntries,
  getCollectors,
  getWonderMisses,
  saveCollectionEntry,
  type AcquisitionSource,
  type CollectionEntry,
  type Collector,
  type WonderMiss,
} from "@/lib/storage"

const sourceLabels: Record<AcquisitionSource, string> = {
  pack: "Pack",
  wonder_pick: "Pioche miracle",
  trade: "Échange",
  unknown: "Autre",
}

const today = () => new Date().toISOString().slice(0, 10)

function App() {
  const [data, setData] = useState<PocketData | null>(null)
  const [collectors, setCollectors] = useState<Collector[]>([])
  const [entries, setEntries] = useState<CollectionEntry[]>([])
  const [misses, setMisses] = useState<WonderMiss[]>([])
  const [activeCollectorId, setActiveCollectorId] = useState("")
  const [compareCollectorId, setCompareCollectorId] = useState("none")
  const [selectedSetCode, setSelectedSetCode] = useState("")
  const [search, setSearch] = useState("")
  const [selectedCard, setSelectedCard] = useState<PocketCard | null>(null)
  const [addFriendOpen, setAddFriendOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function boot() {
      try {
        const [pocketData, loadedCollectors, loadedEntries, loadedMisses] = await Promise.all([
          loadPocketData(),
          getCollectors(),
          getCollectionEntries(),
          getWonderMisses(),
        ])

        const latestSet = pocketData.sets.reduce((latest, set) => {
          return new Date(set.releaseDate) > new Date(latest.releaseDate) ? set : latest
        }, pocketData.sets[0])
        setData(pocketData)
        setCollectors(loadedCollectors)
        setEntries(loadedEntries)
        setMisses(loadedMisses)
        setActiveCollectorId(loadedCollectors[0]?.id ?? "")
        setSelectedSetCode(latestSet?.code ?? "")
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Impossible de charger les données.")
      } finally {
        setBusy(false)
      }
    }

    boot()
  }, [])

  const activeCollector = collectors.find((collector) => collector.id === activeCollectorId)
  const friends = collectors.filter((collector) => collector.id !== activeCollectorId)
  const compareCollector = collectors.find((collector) => collector.id === compareCollectorId) ?? null
  const selectedSet = data?.sets.find((set) => set.code === selectedSetCode)

  const entriesByCollector = useMemo(() => {
    const map = new Map<string, CollectionEntry>()
    for (const entry of entries) {
      map.set(`${entry.collector_id}:${entry.card_key}`, entry)
    }
    return map
  }, [entries])

  const cardsForSet = useMemo(() => {
    if (!data) return []

    const query = search.trim().toLowerCase()
    return data.cards
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
      .sort((a, b) => a.number - b.number)
  }, [data, search, selectedSetCode])

  const stats = useMemo(() => {
    if (!data || !selectedSet) return []
    const setCards = data.cards.filter((card) => card.set === selectedSet.code)

    return collectors.map((collector) => {
      const owned = setCards.filter((card) => {
        return entriesByCollector.get(`${collector.id}:${cardKey(card)}`)?.owned
      }).length

      return {
        collector,
        owned,
        total: setCards.length,
        percent: setCards.length ? Math.round((owned / setCards.length) * 100) : 0,
      }
    })
  }, [collectors, data, entriesByCollector, selectedSet])

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

  async function addMiss(card: PocketCard, collector: Collector, note: string, missedOn: string) {
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

  async function addFriend(displayName: string) {
    const collector = await createCollector(displayName)
    setCollectors((current) => [...current, collector])
    setCompareCollectorId(collector.id)
  }

  async function signUp(pseudo: string, password: string) {
    const collector = await createAccount(pseudo, password)
    setCollectors((current) => [...current, collector])
    setActiveCollectorId(collector.id)
    setCompareCollectorId("none")
  }

  if (busy) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#f8f3e7] text-stone-950">
        <div className="flex items-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-3 shadow-sm">
          <Loader2 className="size-5 animate-spin" />
          Chargement du dex...
        </div>
      </main>
    )
  }

  if (error || !data || !activeCollector || !selectedSet) {
    return (
      <main className="grid min-h-svh place-items-center bg-[#f8f3e7] p-6 text-stone-950">
        <Card className="max-w-md border-red-200 bg-white">
          <CardHeader>
            <CardTitle>Chargement impossible</CardTitle>
            <CardDescription>{error ?? "Aucune donnée disponible."}</CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <TooltipProvider>
      <main className="min-h-svh text-[#182b5b]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-3 py-3 sm:px-5 lg:px-8">
          <header className="sticky top-0 z-20 -mx-3 bg-transparent px-3 py-3 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
            <div className="rounded-[28px] border-2 border-[#253b75]/15 bg-white/78 px-3 py-3 shadow-[0_12px_30px_rgb(37_59_117/0.12)] backdrop-blur-xl sm:px-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-full border-2 border-[#253b75] bg-[#e33535] shadow-[0_3px_0_#253b75]">
                    <Database className="size-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="pokemon-title-mini text-3xl sm:text-4xl">
                      PocketDex
                    </h1>
                    <p className="hidden max-w-xl truncate text-sm font-extrabold text-[#2a5da8] sm:block">
                      Ton dex, tes amis, vos différences.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto] lg:w-[560px]">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-[#253b75]/75">Mon dex</Label>
                  <div className="flex h-9 items-center gap-2 rounded-full border border-[#253b75]/30 bg-[#f7fbff] px-3 font-black text-[#253b75]">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: activeCollector.color }}
                    />
                    {activeCollector.display_name}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-[#253b75]/75">Extension</Label>
                  <Select value={selectedSetCode} onValueChange={setSelectedSetCode}>
                    <SelectTrigger className="h-9 rounded-full border border-[#253b75]/30 bg-[#f7fbff] font-black text-[#253b75]">
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
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    aria-label="Créer un compte"
                    title="Créer un compte"
                    className="h-9 w-9 rounded-full border-2 border-[#253b75] bg-[#ffcb05] text-[#253b75] shadow-[0_2px_0_#253b75]"
                    onClick={() => setSignupOpen(true)}
                  >
                    <KeyRound className="size-4" />
                  </Button>
                </div>
              </div>
              </div>
            </div>
          </header>

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
                misses={misses}
                onRemove={removeMiss}
              />
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border-2 border-[#253b75] bg-white p-2 shadow-[0_4px_0_#253b75] sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#2a5da8]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="rounded-full border-2 border-[#d7e0ff] bg-[#f7fbff] pl-9 font-bold"
                  placeholder="Chercher une carte, un numéro, une rareté..."
                />
              </div>
              <Badge className="h-8 justify-center rounded-full border-2 border-[#253b75] bg-[#ffcb05] px-3 text-[#253b75]">
                {cardsForSet.length} cartes
              </Badge>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border-2 border-[#253b75] bg-white p-2 shadow-[0_4px_0_#253b75] sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 px-2 font-black text-[#253b75]">
                <Users className="size-4" />
                Comparer avec un ami
              </div>
              <div className="flex gap-2">
                <Select value={compareCollectorId} onValueChange={setCompareCollectorId}>
                  <SelectTrigger className="min-w-44 rounded-full border-2 border-[#253b75] bg-[#f7fbff] font-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun ami</SelectItem>
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
        <SignupDialog
          open={signupOpen}
          onOpenChange={setSignupOpen}
          onSignup={signUp}
        />
      </main>
    </TooltipProvider>
  )
}

function SetOverview({
  selectedSet,
  stats,
  activeCollector,
  compareCollector,
}: {
  selectedSet: PocketSet
  stats: { collector: Collector; owned: number; total: number; percent: number }[]
  activeCollector: Collector
  compareCollector: Collector | null
}) {
  const visibleStats = stats.filter(({ collector }) => {
    return collector.id === activeCollector.id || collector.id === compareCollector?.id
  })

  return (
    <Card className="pokedex-panel overflow-hidden rounded-3xl bg-white">
      <CardHeader className="gap-3 pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-2xl font-black text-[#253b75]">
              {selectedSet.code} · {setName(selectedSet)}
            </CardTitle>
            <CardDescription className="font-bold text-[#52659b]">
              Sortie {selectedSet.releaseDate} · {selectedSet.packs.join(", ")}
            </CardDescription>
          </div>
          <Badge className="w-fit rounded-full border-2 border-[#253b75] bg-[#ffcb05] text-[#253b75]">
            <PackageOpen className="mr-1 size-3.5" />
            {selectedSet.count} cartes annoncées
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {visibleStats.map(({ collector, owned, total, percent }) => (
          <div key={collector.id} className="rounded-2xl border-2 border-[#d7e0ff] bg-[#f7fbff] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-[#253b75]">
                <span className="size-3 rounded-full border border-white shadow-sm" style={{ backgroundColor: collector.color }} />
                {collector.display_name}
              </div>
              <span className="text-sm font-black text-[#253b75]">
                {owned}/{total}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-[#b8c6ef] bg-white">
              <div
                className="h-full rounded-full"
                style={{ width: `${percent}%`, backgroundColor: collector.color }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function CardGrid({
  cards,
  activeCollector,
  compareCollector,
  entriesByCollector,
  rarities,
  onOpen,
  onQuickToggle,
}: {
  cards: PocketCard[]
  activeCollector: Collector
  compareCollector: Collector | null
  entriesByCollector: Map<string, CollectionEntry>
  rarities: PocketData["rarities"]
  onOpen: (card: PocketCard) => void
  onQuickToggle: (card: PocketCard, collector: Collector, owned: boolean) => Promise<void>
}) {
  return (
    <div className="grid grid-cols-2 gap-3 pb-24 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {cards.map((card) => {
        const key = cardKey(card)
        const ownedByActive = Boolean(entriesByCollector.get(`${activeCollector.id}:${key}`)?.owned)
        const ownedByCompare = compareCollector
          ? Boolean(entriesByCollector.get(`${compareCollector.id}:${key}`)?.owned)
          : false

        return (
          <article
            key={key}
            className="group overflow-hidden rounded-2xl border-2 border-[#253b75] bg-white shadow-[0_4px_0_#253b75] transition hover:-translate-y-0.5 hover:shadow-[0_7px_0_#253b75]"
          >
            <button
              type="button"
              onClick={() => onOpen(card)}
              className="block w-full text-left"
            >
              <div className="relative aspect-[5/7] overflow-hidden bg-[#d7e0ff]">
                <img
                  src={limitlessImageUrl(card)}
                  alt={displayCardName(card)}
                  loading="lazy"
                  className={`size-full object-cover transition duration-300 ${
                    ownedByActive ? "saturate-100" : "grayscale opacity-35"
                  }`}
                  onError={(event) => {
                    event.currentTarget.style.display = "none"
                  }}
                />
                <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-[#17285b]/75 via-transparent to-[#17285b]/15 p-2 text-white">
                  <div className="flex justify-between">
                    <Badge className="rounded-full border border-[#253b75] bg-white/95 font-black text-[#253b75]">#{card.number}</Badge>
                    <Badge className="rounded-full bg-[#e33535] font-black text-white">{card.rarity}</Badge>
                  </div>
                  {!ownedByActive && (
                    <div className="rounded-full border-2 border-white bg-[#e33535] px-2 py-1 text-center text-xs font-black uppercase shadow-[0_2px_0_#253b75]">
                      Manquante
                    </div>
                  )}
                </div>
              </div>
            </button>

            <div className="space-y-2 p-2.5">
              <div className="min-h-10">
                <h3 className="line-clamp-2 text-sm font-black leading-tight text-[#253b75]">{displayCardName(card)}</h3>
                <p className="text-xs font-bold text-[#52659b]">{rarities[card.rarity]?.label ?? card.rarity}</p>
              </div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex -space-x-1">
                  {[activeCollector, compareCollector].filter(Boolean).map((collector) => {
                    const person = collector as Collector
                    const owned = entriesByCollector.get(`${person.id}:${key}`)?.owned
                    return (
                      <span
                        key={person.id}
                        title={person.display_name}
                        className={`grid size-5 place-items-center rounded-full border-2 border-white text-[10px] text-white shadow-sm ${
                          owned ? "" : "bg-[#d4d8df]"
                        }`}
                        style={{ backgroundColor: owned ? person.color : undefined }}
                      >
                        {owned ? <Check className="size-3" /> : ""}
                      </span>
                    )
                  })}
                </div>
                {compareCollector && (
                  <Badge className={`rounded-full text-[10px] font-black ${ownedByCompare === ownedByActive ? "bg-[#d7e0ff] text-[#253b75]" : "bg-[#ffcb05] text-[#253b75]"}`}>
                    {ownedByCompare === ownedByActive ? "=" : "diff"}
                  </Badge>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={ownedByActive ? "secondary" : "outline"}
                  className={ownedByActive ? "rounded-full bg-[#ffcb05] font-black text-[#253b75]" : "rounded-full border-2 border-[#253b75] font-black text-[#253b75]"}
                  onClick={() => onQuickToggle(card, activeCollector, !ownedByActive)}
                >
                  {ownedByActive ? "OK" : "Avoir"}
                </Button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function WonderMissPanel({
  collectors,
  activeCollector,
  misses,
  onRemove,
}: {
  collectors: Collector[]
  activeCollector: Collector
  misses: WonderMiss[]
  onRemove: (id: string) => Promise<void>
}) {
  const visible = misses.filter((miss) => miss.collector_id === activeCollector.id).slice(0, 12)
  const collectorById = new Map(collectors.map((collector) => [collector.id, collector]))

  return (
    <Card className="pokedex-panel rounded-3xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#253b75]">
          <WandSparkles className="size-5" />
          Pioches loupées
        </CardTitle>
        <CardDescription className="font-bold text-[#52659b]">Le pense-bête des 20% qui n’ont pas voulu tomber.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#b8c6ef] bg-[#f7fbff] p-4 text-sm font-bold text-[#52659b]">
            Aucun raté enregistré pour {activeCollector.display_name}.
          </div>
        ) : (
          visible.map((miss) => (
            <div key={miss.id} className="rounded-2xl border-2 border-[#d7e0ff] bg-[#f7fbff] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-black text-[#253b75]">{miss.card_name}</div>
                  <div className="text-xs font-bold text-[#52659b]">
                    {miss.set_code}-{formatCardNumber({ number: miss.card_number })} · {miss.missed_on}
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => miss.id && onRemove(miss.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {miss.note && <p className="mt-2 text-sm font-bold text-[#52659b]">{miss.note}</p>}
              <div className="mt-2 flex items-center gap-1 text-xs font-bold text-[#52659b]">
                <Users className="size-3" />
                {collectorById.get(miss.collector_id)?.display_name}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

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
      setError(cause instanceof Error ? cause.message : "Impossible d’ajouter cet ami.")
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
            Son dex sera séparé du tien, mais comparable sur chaque extension.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-black text-[#253b75]">Nom</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-full border-2 border-[#253b75] bg-white font-bold"
              placeholder="Ex: Marie"
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit()
              }}
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

function SignupDialog({
  open,
  onOpenChange,
  onSignup,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSignup: (pseudo: string, password: string) => Promise<void>
}) {
  const [pseudo, setPseudo] = useState("")
  const [password, setPassword] = useState("")
  const [repeatPassword, setRepeatPassword] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const normalizedPseudo = pseudo.trim()
    if (!normalizedPseudo) {
      setError("Pseudo obligatoire.")
      return
    }
    if (password.length < 4) {
      setError("Mot de passe trop court.")
      return
    }
    if (password !== repeatPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSignup(normalizedPseudo, password)
      setPseudo("")
      setPassword("")
      setRepeatPassword("")
      onOpenChange(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Impossible de créer le compte.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border-4 border-[#253b75] bg-[#fff4bd] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black text-[#253b75]">
            <KeyRound className="size-5" />
            Créer un compte
          </DialogTitle>
          <DialogDescription className="font-bold text-[#52659b]">
            Un pseudo, un mot de passe, et ton dex devient ton profil principal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="font-black text-[#253b75]">Pseudo</Label>
            <Input
              value={pseudo}
              onChange={(event) => setPseudo(event.target.value)}
              className="rounded-full border-2 border-[#253b75] bg-white font-bold"
              placeholder="Miguel"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-black text-[#253b75]">Mot de passe</Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-full border-2 border-[#253b75] bg-white font-bold"
              placeholder="••••••••"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="font-black text-[#253b75]">Répéter le mot de passe</Label>
            <Input
              type="password"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submit()
              }}
              className="rounded-full border-2 border-[#253b75] bg-white font-bold"
              placeholder="••••••••"
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
            <KeyRound className="size-4" />
            Créer le compte
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CardDialog({
  card,
  collectors,
  activeCollector,
  entriesByCollector,
  rarityLabel,
  onClose,
  onSave,
  onMiss,
}: {
  card: PocketCard
  collectors: Collector[]
  activeCollector: Collector
  entriesByCollector: Map<string, CollectionEntry>
  rarityLabel?: string
  onClose: () => void
  onSave: (entry: CollectionEntry) => Promise<void>
  onMiss: (card: PocketCard, collector: Collector, note: string, missedOn: string) => Promise<void>
}) {
  const initialEntry = entriesByCollector.get(`${activeCollector.id}:${cardKey(card)}`)
  const [collectorId, setCollectorId] = useState(activeCollector.id)
  const [source, setSource] = useState<AcquisitionSource>(initialEntry?.acquisition_source ?? "pack")
  const [note, setNote] = useState(initialEntry?.note ?? "")
  const [obtainedAt, setObtainedAt] = useState(initialEntry?.obtained_at ?? today())
  const [missNote, setMissNote] = useState("")
  const [missedOn, setMissedOn] = useState(today())
  const [saving, setSaving] = useState(false)

  const openCard = card
  const collector = collectors.find((item) => item.id === collectorId) ?? activeCollector
  const entry = entriesByCollector.get(`${collector.id}:${cardKey(openCard)}`)

  async function save(owned: boolean) {
    setSaving(true)
    try {
      await onSave({
        id: entry?.id,
        collector_id: collector.id,
        card_key: cardKey(openCard),
        set_code: openCard.set,
        card_number: openCard.number,
        owned,
        acquisition_source: owned ? source : null,
        note: note.trim() || null,
        obtained_at: owned ? obtainedAt : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  async function saveMiss() {
    setSaving(true)
    try {
      await onMiss(openCard, collector, missNote, missedOn)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={Boolean(card)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto rounded-3xl border-4 border-[#253b75] bg-[#fff4bd] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-2xl font-black text-[#253b75]">
            {displayCardName(card)}
            <Badge className="rounded-full bg-[#e33535] text-white">{card.rarity}</Badge>
          </DialogTitle>
          <DialogDescription className="font-bold text-[#52659b]">
            {card.set}-{formatCardNumber(card)} · {rarityLabel ?? card.rarity} · {card.packs.join(", ")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <div className="overflow-hidden rounded-2xl border-4 border-[#253b75] bg-[#d7e0ff] shadow-[0_5px_0_#253b75]">
            <img
              src={limitlessImageUrl(card, "large")}
              alt={displayCardName(card)}
              className="aspect-[5/7] w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none"
              }}
            />
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="font-black text-[#253b75]">Collection</Label>
                <Select value={collectorId} onValueChange={setCollectorId}>
                  <SelectTrigger className="rounded-full border-2 border-[#253b75] bg-white font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {collectors.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-black text-[#253b75]">Obtenue via</Label>
                <Select value={source} onValueChange={(value) => setSource(value as AcquisitionSource)}>
                  <SelectTrigger className="rounded-full border-2 border-[#253b75] bg-white font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-black text-[#253b75]">Date d’obtention</Label>
              <Input
                type="date"
                value={obtainedAt}
                onChange={(event) => setObtainedAt(event.target.value)}
                className="rounded-full border-2 border-[#253b75] bg-white font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-black text-[#253b75]">Note</Label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Ex: pack du matin, pioche miracle sur un ami..."
                className="min-h-20 rounded-2xl border-2 border-[#253b75] bg-white font-bold"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" className="rounded-full bg-[#e33535] font-black text-white" onClick={() => save(true)} disabled={saving}>
                <Check className="size-4" />
                Marquer obtenue
              </Button>
              <Button type="button" variant="outline" className="rounded-full border-2 border-[#253b75] bg-white font-black text-[#253b75]" onClick={() => save(false)} disabled={saving}>
                <CircleSlash className="size-4" />
                Marquer manquante
              </Button>
            </div>

            <Separator />

            <div className="rounded-2xl border-2 border-[#253b75] bg-white p-3 shadow-[0_3px_0_#253b75]">
              <div className="mb-3 flex items-center gap-2 font-black text-[#253b75]">
                <Sparkles className="size-4" />
                Ajouter comme pioche miracle loupée
              </div>
              <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1 font-black text-[#253b75]">
                    <CalendarDays className="size-3.5" />
                    Jour
                  </Label>
                  <Input
                    type="date"
                    value={missedOn}
                    onChange={(event) => setMissedOn(event.target.value)}
                    className="rounded-full border-2 border-[#253b75] bg-white font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-black text-[#253b75]">Contexte</Label>
                  <Input
                    value={missNote}
                    onChange={(event) => setMissNote(event.target.value)}
                    placeholder="Ex: choisi la mauvaise carte, pack avec 2 cartes utiles..."
                    className="rounded-full border-2 border-[#253b75] bg-white font-bold"
                  />
                </div>
              </div>
              <Button type="button" variant="secondary" className="mt-3 rounded-full bg-[#ffcb05] font-black text-[#253b75]" onClick={saveMiss} disabled={saving}>
                <WandSparkles className="size-4" />
                Enregistrer le raté
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default App
