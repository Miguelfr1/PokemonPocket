import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import RarityBadge from "@/components/RarityBadge"
import { Button } from "@/components/ui/button"
import {
  cardKey,
  displayCardName,
  formatCardNumber,
  limitlessImageUrl,
  type PocketCard,
  type PocketData,
} from "@/lib/pocket-data"
import type { Collector, CollectionEntry } from "@/lib/storage"

interface CardGridProps {
  cards: PocketCard[]
  activeCollector: Collector
  compareCollector: Collector | null
  entriesByCollector: Map<string, CollectionEntry>
  rarities: PocketData["rarities"]
  onOpen: (card: PocketCard) => void
  onQuickToggle: (card: PocketCard, collector: Collector, owned: boolean) => Promise<void>
}

export default function CardGrid({
  cards,
  activeCollector,
  compareCollector,
  entriesByCollector,
  rarities,
  onOpen,
  onQuickToggle,
}: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-[#b8c6ef] bg-[#f7fbff] py-16 text-center">
        <span className="text-4xl">🔍</span>
        <p className="font-black text-[#253b75]">Aucune carte trouvée</p>
        <p className="text-sm font-bold text-[#52659b]">Essaie avec d'autres mots-clés</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 pb-24 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {cards.map((card) => {
        const key = cardKey(card)
        const ownedByActive = Boolean(entriesByCollector.get(`${activeCollector.id}:${key}`)?.owned)
        const ownedByCompare = compareCollector
          ? Boolean(entriesByCollector.get(`${compareCollector.id}:${key}`)?.owned)
          : false
        const hasDiff = compareCollector && ownedByCompare !== ownedByActive

        return (
          <article
            key={key}
            className={`group overflow-hidden rounded-2xl border-2 bg-white shadow-[0_4px_0_#253b75] transition hover:-translate-y-0.5 hover:shadow-[0_7px_0_#253b75] ${
              hasDiff ? "border-[#ffcb05]" : "border-[#253b75]"
            }`}
          >
            <button type="button" onClick={() => onOpen(card)} className="block w-full text-left">
              <div className="relative aspect-[5/7] overflow-hidden bg-[#d7e0ff]">
                <img
                  src={limitlessImageUrl(card)}
                  alt={displayCardName(card)}
                  loading="lazy"
                  className={`size-full object-cover transition duration-300 ${
                    ownedByActive ? "saturate-100" : "grayscale opacity-35"
                  }`}
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
                <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-[#17285b]/75 via-transparent to-[#17285b]/15 p-2 text-white">
                  <div className="flex justify-between">
                    <Badge className="rounded-full border border-[#253b75] bg-white/95 font-black text-[#253b75]">
                      #{formatCardNumber(card)}
                    </Badge>
                    <RarityBadge rarity={card.rarity} variant="grid" />
                  </div>
                </div>
              </div>
            </button>

            <div className="space-y-2 p-2.5">
              <div className="min-h-10">
                <h3 className="line-clamp-2 text-sm font-black leading-tight text-[#253b75]">
                  {displayCardName(card)}
                </h3>
                <p className="text-xs font-bold text-[#52659b]">
                  {rarities[card.rarity]?.label ?? card.rarity}
                </p>
              </div>
              <div className="flex items-center justify-between gap-1">
                <div className="flex -space-x-1">
                  {[activeCollector, compareCollector].filter(Boolean).map((c) => {
                    const person = c as Collector
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
                  <Badge
                    className={`rounded-full text-[10px] font-black ${
                      hasDiff ? "bg-[#ffcb05] text-[#253b75]" : "bg-[#d7e0ff] text-[#253b75]"
                    }`}
                  >
                    {hasDiff ? "diff" : "="}
                  </Badge>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={ownedByActive ? "secondary" : "outline"}
                  className={
                    ownedByActive
                      ? "rounded-full bg-[#ffcb05] font-black text-[#253b75]"
                      : "rounded-full border-2 border-[#253b75] font-black text-[#253b75]"
                  }
                  onClick={() => onQuickToggle(card, activeCollector, !ownedByActive)}
                >
                  {ownedByActive ? <Check className="size-3.5" /> : "Eu"}
                </Button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
