# SincroMed

SincroMed coordina planes de medicacion y confirmaciones de toma entre
familiares y cuidadores mediante un dashboard web y recordatorios de WhatsApp.

## Funcionalidades

- Perfiles de pacientes con propietarios, colaboradores e invitados.
- Medicamentos con varias horas, dias de la semana, indicaciones y vigencia.
- Resumen de proximas tomas, adherencia e historial.
- Evidencias privadas por texto, fotografia o audio.
- Integracion de WhatsApp mediante Supabase Edge Functions y Jelou.

## Desarrollo local

Requiere Node.js 20.19 o posterior y pnpm.

```bash
pnpm install
pnpm dev
```

Crea `.env.local` a partir de `.env.example`:

```env
VITE_GOOGLE_SCRIPT_URL=
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_KEY=SUPABASE_ANON_OR_PUBLISHABLE_KEY
VITE_DEMO_MODE=false
```

Las variables `VITE_*` son publicas en el navegador. Nunca coloques en ellas
claves `service_role`, secretos de Jelou, tokens multimedia ni claves de Datum.

## Verificacion

Antes de publicar:

```bash
pnpm test
pnpm lint
pnpm build
```

`pnpm test:visual` ejecuta la revision responsive automatizada cuando Chromium
esta instalado para Playwright.

## Supabase

Aplica las migraciones de `supabase/migrations/` en orden de nombre. Las Edge
Functions viven en `supabase/functions/`; su despliegue y secretos requeridos
estan documentados en `supabase/README.md`.

Los secretos privados se configuran en Supabase, no en archivos del frontend.
La integracion de evidencias usa un bucket privado y URLs firmadas.

## Produccion

Publica el resultado de `pnpm build` (`dist/`) o conecta el repositorio a un
proveedor compatible con Vite. Configura allí las tres variables publicas del
archivo de ejemplo y mantén `VITE_DEMO_MODE=false`.
