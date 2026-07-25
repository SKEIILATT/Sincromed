# Repository Guidelines

## Project Structure & Module Organization

SincroMed is a Vite React application backed by Supabase. Application code lives in `src/`: reusable UI in `src/components/`, shared data in `src/data/`, and API/domain helpers in `src/lib/`. Tests are colocated as `*.test.js`. Supabase migrations and Edge Functions live in `supabase/`. Brand images are under `src/assets/`, static browser files under `public/`, and visual QA automation under `scripts/`. `dist/` is generated and must not be edited.

## Build, Test, and Development Commands

Use pnpm, matching the existing `pnpm-lock.yaml`.

- `pnpm install`: install dependencies.
- `pnpm dev`: start the local Vite development server.
- `pnpm build`: create the production build in `dist/`.
- `pnpm preview`: serve the production build locally for verification.
- `pnpm lint`: run ESLint across the repository.
- `pnpm test`: run the Node unit test suite.
- `pnpm test:visual`: verify key screens at desktop, tablet, and mobile sizes.

## Coding Style & Naming Conventions

Write function components in `.jsx` files. Name components in PascalCase, utilities in camelCase, and constants in UPPER_SNAKE_CASE. Follow the existing ES module style and two-space indentation. Keep user-facing copy in Spanish. Use Lucide icons rather than custom SVG markup. Run `pnpm lint` before submitting changes.

## Testing Guidelines

Use Node's built-in test runner. Name tests `*.test.js` and keep them beside the module under test. Cover schedule calculations, validation, authentication parsing, evidence mapping, and other domain behavior. UI changes must also pass `pnpm test:visual`; inspect generated screenshots when layout or responsive behavior changes.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries in Spanish or English, for example `Implement notification system with success and error messages` and `Boton "Simular toma": abre WhatsApp y envia el recordatorio por API`. Keep subjects concise and focused on the user-visible change. Pull requests should include a brief description, validation commands run, linked issue or task when available, and screenshots for UI changes. Note API, environment, or configuration changes explicitly.

## Security & Configuration Tips

Local frontend configuration belongs in `.env.local`; production values belong in the hosting provider. Only public Supabase URL and anon/publishable key may use `VITE_*`. Keep service-role, Jelou, Datum, and webhook secrets in Supabase Edge Function secrets. Apply migrations in filename order and never commit generated artifacts or credentials.
