import { Trash2, Users, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCardNumber } from "@/lib/pocket-data"
import type { CollectionEntry, Collector, WonderMiss } from "@/lib/storage"

interface WonderMissPanelProps {
  collectors: Collector[]
  activeCollector: Collector
  compareCollector?: Collector | null
  entries: CollectionEntry[]
  misses: WonderMiss[]
  onRemove: (id: string) => Promise<void>
}

export default function WonderMissPanel({
  collectors,
  activeCollector,
  compareCollector,
  entries,
  misses,
  onRemove,
}: WonderMissPanelProps) {
  const visible = misses
    .filter(
      (miss) =>
        miss.collector_id === activeCollector.id ||
        (compareCollector && miss.collector_id === compareCollector.id),
    )
    .slice(0, 12)
  const collectorById = new Map(collectors.map((c) => [c.id, c]))
  
  // Calculate success rate for activeCollector
  const successfulPicks = entries.filter(
    (e) => e.collector_id === activeCollector.id && e.owned && e.acquisition_source === "wonder_pick"
  ).length
  const failedPicks = misses.filter((m) => m.collector_id === activeCollector.id).length
  const totalPicks = successfulPicks + failedPicks
  const successRate = totalPicks > 0 ? Math.round((successfulPicks / totalPicks) * 100) : null

  return (
    <Card className="pokedex-panel rounded-3xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#253b75]">
          <WandSparkles className="size-5" />
          Pioches loupées
        </CardTitle>
        <CardDescription className="font-bold text-[#52659b]">
          Le pense-bête des 20 % qui n'ont pas voulu tomber.
          {successRate !== null && (
            <span className="mt-1 flex items-center gap-2 rounded-full bg-[#f0f4ff] px-2 py-1 text-xs font-black text-[#253b75]">
              Taux de réussite réel :{" "}
              <span className={successRate >= 20 ? "text-[#22c55e]" : "text-[#e33535]"}>
                {successRate}%
              </span>
              <span className="text-[10px] text-[#52659b] font-bold">
                ({successfulPicks}/{totalPicks})
              </span>
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#b8c6ef] bg-[#f7fbff] p-4 text-sm font-bold text-[#52659b]">
            Aucun raté enregistré. 🎉
          </div>
        ) : (
          visible.map((miss) => (
            <div key={miss.id} className="rounded-2xl border-2 border-[#d7e0ff] bg-[#f7fbff] p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-black text-[#253b75]">{miss.card_name}</div>
                  <div className="text-xs font-bold text-[#52659b]">
                    {miss.set_code}-{formatCardNumber({ number: miss.card_number })} ·{" "}
                    {miss.missed_on}
                  </div>
                </div>
                {miss.collector_id === activeCollector.id && (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => miss.id && onRemove(miss.id)}
                    aria-label="Supprimer"
                  >
                    <Trash2 className="size-4 text-[#e33535]" />
                  </Button>
                )}
              </div>
              {miss.note && (
                <p className="mt-2 text-sm font-bold text-[#52659b]">{miss.note}</p>
              )}
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
