# Vitrina Store — UML sequence diagrams

These diagrams are generated from the **actual** codebase (Next.js App Router, Better Auth, Drizzle/PostgreSQL).  
This project does **not** use Express, Passport, MongoDB, or Multer.

| File | Scope |
|------|--------|
| `sequence-auth.puml` | Email sign-in / sign-up server actions → Better Auth → Postgres |
| `sequence-google-oauth.puml` | Google OAuth via Better Auth (`/api/auth/*`) |
| `sequence-profile.puml` | My Account view, profile fields update, password change |
| `sequence-session.puml` | Auth session cookies, middleware, browsing `sq_*` session |
| `sequence-main-flow.puml` | Storefront lifecycle: browse → PDP → analytics → checkout |
| `sequence-tracking.puml` | `pa_*` micro-events + `shopping_sequence` funnel |
| `sequence-admin-upload.puml` | Admin product image upload (`writeFile` → `public/uploads`) |
| **`sequence-system-overview.puml`** | **Vue d'ensemble** : visiteur, collecte, marchand, analyse LLM, Brevo, Chargily |
| **`class-system-overview.puml`** | **Classes / couches** : UI, API, domaine, tables PostgreSQL, services externes |
| **`usecase-system-overview.puml`** | **Cas d'utilisation** : boutique, Seller Helper, équipes, services système |
| **`activity-system-overview.puml`** | **Activité** : parcours visiteur (collecte, achat) + boucle marchand (analyse, actions) |
| **`deployment-system-overview.puml`** | **Déploiement** : navigateur, Vercel, Neon, Google, LLM, Brevo, Chargily |

## Render in VS Code / Cursor

1. Install extension **PlantUML** (jebbs.plantuml).
2. Open any `.puml` file → `Alt+D` preview, or export PNG.

## Render PNG/SVG (CLI)

```bash
node scripts/render-uml.mjs        # PNG → docs/uml/out/
node scripts/render-uml.mjs --svg  # SVG
```

Requires **Docker** (`plantuml/plantuml` image) or **Java + PlantUML** on PATH.  
(This environment had neither; use the PlantUML extension for instant preview.)

Previews may also be opened via [plantuml.com](https://www.plantuml.com/plantuml/uml/) by pasting file contents.

## Mermaid copies

See `docs/uml/mermaid/*.md` for embedded Mermaid versions (GitHub/Cursor markdown preview).
