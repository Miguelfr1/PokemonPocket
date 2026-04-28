/**
 * Rarity display — official Pokemon TCG Pocket symbols, filled variants.
 *
 * ◆  filled diamond  → C (×1), U (×2), R (×3), RR (×4)
 * ★  filled star     → AR (×1), SR (×2), SAR (×2 violet), IM (×3)
 * ✦  sparkle star    → S (×1), SSR (×2)  [rainbow animated]
 * ♛  crown          → UR (×1)
 */

export type RarityConfig = {
  symbol: string
  count: number
  colorClass: string
  shiny?: boolean
  label: string
}

export const RARITY_CONFIG: Record<string, RarityConfig> = {
  C:   { symbol: "◆", count: 1, colorClass: "text-[#cbd5e1]", label: "Common" },
  U:   { symbol: "◆", count: 2, colorClass: "text-[#cbd5e1]", label: "Uncommon" },
  R:   { symbol: "◆", count: 3, colorClass: "text-[#cbd5e1]", label: "Rare" },
  RR:  { symbol: "◆", count: 4, colorClass: "text-[#cbd5e1]", label: "Double Rare" },
  AR:  { symbol: "★", count: 1, colorClass: "text-[#fbbf24]", label: "Art Rare" },
  SR:  { symbol: "★", count: 2, colorClass: "text-[#fbbf24]", label: "Super Rare" },
  SAR: { symbol: "★", count: 2, colorClass: "text-[#c084fc]", label: "Special Art Rare" },
  IM:  { symbol: "★", count: 3, colorClass: "text-[#fbbf24]", label: "Immersive" },
  UR:  { symbol: "♛", count: 1, colorClass: "text-[#fbbf24]", label: "Crown Rare" },
  S:   { symbol: "✦", count: 1, colorClass: "text-[#22d3ee]", label: "Shiny", shiny: true },
  SSR: { symbol: "✦", count: 2, colorClass: "text-[#22d3ee]", label: "Shiny SR",  shiny: true },
}

/** Ascending rarity order (common → crown) */
export const RARITY_ORDER: Record<string, number> = {
  C: 0, U: 1, R: 2, RR: 3,
  AR: 4, SR: 5, SAR: 6,
  S: 7, SSR: 8,
  IM: 9, UR: 10,
}

interface RarityBadgeProps {
  rarity: string
  /**
   * "grid"   – compact pill on card thumbnails
   * "dialog" – larger badge in card detail header
   * "chip"   – flat chip for filter buttons
   */
  variant?: "grid" | "dialog" | "chip"
}

export default function RarityBadge({ rarity, variant = "grid" }: RarityBadgeProps) {
  const cfg = RARITY_CONFIG[rarity]

  if (!cfg) {
    return (
      <span className="rounded-full bg-[#e33535] px-1.5 py-0.5 text-xs font-black text-white">
        {rarity}
      </span>
    )
  }

  const symbols = Array.from({ length: cfg.count }, (_, i) => i)

  // ── grid: pill on top of card image ──────────────────────────────────────
  if (variant === "grid") {
    return (
      <span
        className="inline-flex items-center gap-px rounded-full bg-black/80 px-2 py-1 shadow-[0_1px_4px_rgba(0,0,0,0.6)] backdrop-blur-sm"
        title={cfg.label}
      >
        {symbols.map((i) => (
          <span
            key={i}
            className={`text-sm leading-none drop-shadow-sm ${cfg.shiny ? "rarity-shiny" : cfg.colorClass}`}
          >
            {cfg.symbol}
          </span>
        ))}
      </span>
    )
  }

  // ── dialog: badge next to card name ─────────────────────────────────────
  if (variant === "dialog") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-[#1e2d5a] px-2.5 py-1 shadow-sm">
        {symbols.map((i) => (
          <span
            key={i}
            className={`text-base leading-none drop-shadow ${cfg.shiny ? "rarity-shiny" : cfg.colorClass}`}
          >
            {cfg.symbol}
          </span>
        ))}
      </span>
    )
  }

  // ── chip: filter button ───────────────────────────────────────────────────
  return (
    <span className="inline-flex items-center gap-0.5">
      {symbols.map((i) => (
        <span
          key={i}
          className={`text-base leading-none ${cfg.shiny ? "rarity-shiny" : cfg.colorClass}`}
        >
          {cfg.symbol}
        </span>
      ))}
    </span>
  )
}
