import { useState } from "react"
import {
  CalendarDays,
  Check,
  CircleSlash,
  Sparkles,
  WandSparkles,
} from "lucide-react"
import RarityBadge from "@/components/RarityBadge"
import { Button } from "@/components/ui/button"
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
import {
  cardKey,
  displayCardName,
  formatCardNumber,
  limitlessImageUrl,
  type PocketCard,
} from "@/lib/pocket-data"
import {
  type AcquisitionSource,
  type CollectionEntry,
  type Collector,
} from "@/lib/storage"

const sourceLabels: Record<AcquisitionSource, string> = {
  pack: "Pack",
  wonder_pick: "Pioche miracle",
  trade: "Échange",
  unknown: "Autre",
}

const today = () => new Date().toISOString().slice(0, 10)

interface CardDialogProps {
  card: PocketCard
  collectors: Collector[]
  activeCollector: Collector
  entriesByCollector: Map<string, CollectionEntry>
  rarityLabel?: string
  onClose: () => void
  onSave: (entry: CollectionEntry) => Promise<void>
  onMiss: (card: PocketCard, collector: Collector, note: string, missedOn: string) => Promise<void>
}

export default function CardDialog({
  card,
  collectors,
  activeCollector,
  entriesByCollector,
  rarityLabel,
  onClose,
  onSave,
  onMiss,
}: CardDialogProps) {
  const initialEntry = entriesByCollector.get(`${activeCollector.id}:${cardKey(card)}`)

  const [collectorId, setCollectorId] = useState(activeCollector.id)
  const [source, setSource] = useState<AcquisitionSource>(
    initialEntry?.acquisition_source ?? "pack",
  )
  const [note, setNote] = useState(initialEntry?.note ?? "")
  const [obtainedAt, setObtainedAt] = useState(initialEntry?.obtained_at ?? today())
  const [missNote, setMissNote] = useState("")
  const [missedOn, setMissedOn] = useState(today())
  const [saving, setSaving] = useState(false)

  const collector = collectors.find((c) => c.id === collectorId) ?? activeCollector
  const entry = entriesByCollector.get(`${collector.id}:${cardKey(card)}`)

  async function save(owned: boolean) {
    setSaving(true)
    try {
      await onSave({
        id: entry?.id,
        collector_id: collector.id,
        card_key: cardKey(card),
        set_code: card.set,
        card_number: card.number,
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
      await onMiss(card, collector, missNote, missedOn)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92svh] overflow-x-hidden overflow-y-auto rounded-3xl border-4 border-[#253b75] bg-[#fff4bd] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-2xl font-black text-[#253b75]">
            {displayCardName(card)}
            <RarityBadge rarity={card.rarity} variant="dialog" />
          </DialogTitle>
          <DialogDescription className="font-bold text-[#52659b]">
            {card.set}-{formatCardNumber(card)} · {rarityLabel ?? card.rarity} ·{" "}
            {card.packs.join(", ")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          {/* Card image */}
          <div className="aspect-[5/7] overflow-hidden rounded-2xl border-4 border-[#253b75] bg-[#d7e0ff] shadow-[0_5px_0_#253b75]">
            <img
              src={limitlessImageUrl(card, "large")}
              alt={displayCardName(card)}
              className="aspect-[5/7] w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none"
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
                    {collectors.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="font-black text-[#253b75]">Obtenue via</Label>
                <Select
                  value={source}
                  onValueChange={(v) => setSource(v as AcquisitionSource)}
                >
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
              <Label className="font-black text-[#253b75]">Date d'obtention</Label>
              <Input
                type="date"
                value={obtainedAt}
                onChange={(e) => setObtainedAt(e.target.value)}
                className="w-full min-w-0 rounded-full border-2 border-[#253b75] bg-white font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-black text-[#253b75]">Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: pack du matin, pioche miracle sur un ami..."
                className="min-h-20 rounded-2xl border-2 border-[#253b75] bg-white font-bold"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-full bg-[#e33535] font-black text-white border-2 border-[#253b75] shadow-[0_3px_0_#253b75]"
                onClick={() => save(true)}
                disabled={saving}
              >
                <Check className="size-4" />
                Marquer obtenue
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-2 border-[#253b75] bg-white font-black text-[#253b75]"
                onClick={() => save(false)}
                disabled={saving}
              >
                <CircleSlash className="size-4" />
                Marquer manquante
              </Button>
            </div>

            <Separator />

            {/* Wonder miss */}
            <div className="rounded-2xl border-2 border-[#253b75] bg-white p-3 shadow-[0_3px_0_#253b75]">
              <div className="mb-3 flex items-center gap-2 font-black text-[#253b75]">
                <Sparkles className="size-4" />
                Ajouter comme pioche miracle loupée
              </div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-[140px_1fr]">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1 font-black text-[#253b75]">
                    <CalendarDays className="size-3.5" />
                    Jour
                  </Label>
                  <Input
                    type="date"
                    value={missedOn}
                    onChange={(e) => setMissedOn(e.target.value)}
                    className="w-full min-w-0 rounded-full border-2 border-[#253b75] bg-white font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-black text-[#253b75]">Contexte</Label>
                  <Input
                    value={missNote}
                    onChange={(e) => setMissNote(e.target.value)}
                    placeholder="Ex: mauvaise carte choisie..."
                    className="w-full min-w-0 rounded-full border-2 border-[#253b75] bg-white font-bold"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-3 rounded-full bg-[#ffcb05] font-black text-[#253b75]"
                onClick={saveMiss}
                disabled={saving}
              >
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
