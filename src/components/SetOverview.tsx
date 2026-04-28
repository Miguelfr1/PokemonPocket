import { useMemo } from "react"
import { PackageOpen } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { setName, type PocketSet } from "@/lib/pocket-data"
import type { Collector } from "@/lib/storage"

interface SetOverviewProps {
  selectedSet: PocketSet
  stats: { collector: Collector; owned: number; total: number; percent: number }[]
  activeCollector: Collector
  compareCollector: Collector | null
}

export default function SetOverview({
  selectedSet,
  stats,
  activeCollector,
  compareCollector,
}: SetOverviewProps) {
  const visibleStats = useMemo(
    () =>
      stats.filter(
        ({ collector }) =>
          collector.id === activeCollector.id || collector.id === compareCollector?.id,
      ),
    [stats, activeCollector, compareCollector],
  )

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
                <span
                  className="size-3 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: collector.color }}
                />
                {collector.display_name}
              </div>
              <span className="text-sm font-black text-[#253b75]">
                {owned}/{total}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-[#b8c6ef] bg-white">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${percent}%`, backgroundColor: collector.color }}
              />
            </div>
            <div className="mt-1 text-right text-xs font-bold text-[#52659b]">{percent}%</div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
