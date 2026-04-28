# Pokemon Pocket Dex

Web app perso pour suivre deux collections Pokemon TCG Pocket sur une meme vue.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- shadcn/ui
- Supabase optionnel, avec fallback `localStorage`
- Donnees cartes: `pokemon-tcg-pocket-database`

## Lancer

```bash
npm install
npm run dev
```

L'app fonctionne sans Supabase. Dans ce mode, les donnees sont stockees dans le navigateur.

## Brancher Supabase

1. Creer un projet Supabase.
2. Copier `.env.example` vers `.env`.
3. Remplir:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

4. Appliquer la migration:

```bash
npx supabase db push
```

La migration est dans `supabase/migrations/001_initial_schema.sql`.

## Scripts

```bash
npm run dev
npm run lint
npm run build
```

## Notes

Les images passent par TCGdex quand elles existent. Les nouveaux sets comme B3 peuvent avoir les cartes avant les images; dans ce cas la carte reste utilisable avec un visuel placeholder.
