# Motivation des choix technologiques — Vitrina Store & Seller Helper

**Plateforme e-commerce Vitrina Store · Module Seller Helper**

Université des Sciences et de la Technologie Houari Boumediène  
Faculté d'Informatique · Projet pluridisciplinaire / fin d'études  

Année universitaire : 2025 / 2026

---

## Résumé

Ce document justifie chaque technologie retenue en répondant explicitement à la question : **pourquoi celle-ci et pas une autre ?** Pour chaque brique, on indique le problème à résoudre, les **alternatives courantes écartées**, et la raison du rejet (technique, coût, contexte Algérie/USTHB, ou lien avec la boucle vendeur *observer → recommander → appliquer → mesurer*).

---

## Méthode de lecture

Chaque sous-section suit le même schéma :

- **Choix retenu** — technologie effectivement utilisée dans le dépôt.
- **Alternatives écartées** — solutions réalistes qu'une équipe aurait pu prendre.
- **Pourquoi pas l'alternative** — critère décisif (pas une liste exhaustive de tous les frameworks du marché).

---

## 1. Plateforme applicative et langage

### Next.js 15 (App Router)

**Choix retenu :** Next.js 15 avec App Router, Route Handlers et déploiement Vercel.

**Alternatives écartées :** SPA Create React App / Vite seul + API Express séparée ; Remix ; Nuxt (Vue) ; Angular full-stack.

**Pourquoi pas l'alternative :**
- **CRA/Vite + Express** : deux dépôts, deux déploiements, CORS et cookies à gérer entre front et API ; le Seller Helper et l'admin partagent la même session et les mêmes types — un monorepo Next.js évite cette fracture.
- **Remix** : excellent pour le web, mais l'écosystème Vercel + documentation Next.js pour Route Handlers et `revalidate` catalogue est déjà en place dans le projet.
- **Nuxt / Angular** : changement de langage ou de paradigme sans gain pour un équipe déjà sur React/TypeScript ; coût de réécriture des composants boutique et admin.

**Problème résolu :** boutique SEO (SSR), back-office, Seller Helper et APIs (`/api/assistant`, `/api/sales-analyst`, auth, paiements) dans **une seule codebase** et **un seul domaine** de production.

---

### React 19

**Choix retenu :** React 19 (composants client et serveur via Next.js).

**Alternatives écartées :** Vue 3, Svelte, Solid, jQuery/vanilla pour le storefront.

**Pourquoi pas l'alternative :**
- **Vue / Svelte** : incompatibles avec le stack Next.js retenu ; migration = réécriture complète de l'UI.
- **jQuery / vanilla** : acceptable pour une vitrine statique, mais insuffisant pour panier Redux, assistant flottant, onglets Seller Helper, heatmap et formulaires admin complexes — la dette de maintenance exploserait.

**Problème résolu :** UI riche (variantes couleur/taille, carrousels, modales Vitrina) avec composants réutilisables et écosystème mature.

---

### TypeScript

**Choix retenu :** TypeScript sur tout le projet (client, serveur, scripts).

**Alternatives écartées :** JavaScript pur ; Flow ; JSDoc seul.

**Pourquoi pas l'alternative :**
- **JavaScript pur** : erreurs fréquentes sur les DTO admin, les types d'événements `pa_*` et les payloads Vitrina — détectées tard en production plutôt qu'à la compilation.
- **Flow** : adoption en déclin ; moins d'outillage avec Next.js et Drizzle qu'avec TypeScript.

**Problème résolu :** contrats partagés entre `schema.ts`, APIs et composants ; traçabilité pour un rapport de fin d'études.

---

## 2. Données et persistance

### PostgreSQL

**Choix retenu :** PostgreSQL relationnel (via Neon en production).

**Alternatives écartées :** MongoDB ; Firebase Firestore ; MySQL seul ; SQLite en production ; Supabase comme unique couche (sans SQL explicite côté app).

**Pourquoi pas l'alternative :**
- **MongoDB / Firestore** : agrégations funnel, timeline, comptages par `product_local_id` et par couleur (`pa_select_option`) sont naturellement **SQL + GROUP BY + fenêtres temporelles** ; en document store, les pipelines d'agrégation seraient plus lourds et moins lisibles pour le jury.
- **SQLite en prod serverless** : pas de connexions concurrentes adaptées au trafic Vercel + plusieurs Route Handlers en parallèle.
- **MySQL** : équivalent possible, mais l'équipe et Neon ciblent PostgreSQL ; pas de gain fonctionnel pour ce schéma.

**Problème résolu :** une seule source de vérité pour catalogue, commandes, micro-événements, actions Seller Helper et audit sécurité.

---

### Neon (PostgreSQL managé)

**Choix retenu :** Neon (`NEON_DATABASE_URL` / `DATABASE_URL`).

**Alternatives écartées :** PostgreSQL auto-hébergé sur VPS ; AWS RDS ; PlanetScale (MySQL) ; CockroachDB.

**Pourquoi pas l'alternative :**
- **VPS + Postgres** : administration OS, sauvegardes, TLS — hors scope d'un projet étudiant avec déploiement Vercel.
- **RDS** : facturation et configuration AWS plus lourdes pour un MVP.
- **PlanetScale** : MySQL, pas PostgreSQL ; incompatible avec les requêtes et types Drizzle déjà écrits pour Postgres.

**Problème résolu :** Postgres managé, **pooling** compatible serverless, zéro serveur à maintenir.

---

### Drizzle ORM

**Choix retenu :** Drizzle (`src/server/db/schema.ts`, migrations, requêtes typées).

**Alternatives écartées :** Prisma ; TypeORM ; Sequelize ; SQL brut sans ORM ; Knex seul.

**Pourquoi pas l'alternative :**
- **Prisma** : excellent DX, mais client généré plus lourd ; pour heatmap, funnel et recommandations Vitrina par lots d'IDs, l'équipe préfère du **SQL explicite** lisible à côté du schéma Drizzle.
- **TypeORM / Sequelize** : décorateurs et magie runtime moins alignés avec App Router et tree-shaking Next.js.
- **SQL brut seul** : pas de schéma TypeScript unique ; risque de dérive entre tables et code.

**Problème résolu :** schéma versionné, typé, proche du SQL réel ; scripts `ensure-*` idempotents au build.

---

### Vercel Blob

**Choix retenu :** `@vercel/blob` pour images produit admin, avec repli `product_media` + `/api/media/[id]`.

**Alternatives écartées :** Binaires en PostgreSQL ; AWS S3 seul ; Cloudinary ; stockage local disque sur Vercel.

**Pourquoi pas l'alternative :**
- **BYTEA en Postgres** : gonfle la base, ralentit sauvegardes et requêtes catalogue.
- **S3 seul** : intégration correcte mais une config IAM/bucket de plus ; Blob est **natif** au même tableau de bord que le déploiement Vercel.
- **Disque local Vercel** : éphémère en serverless — fichiers perdus entre invocations.
- **Cloudinary** : pertinent pour transformation d'images avancée ; hors budget/complexité pour des photos produit statiques.

**Problème résolu :** URLs CDN publiques pour le storefront sans alourdir PostgreSQL.

---

## 3. Hébergement, authentification et sécurité

### Vercel

**Choix retenu :** Hébergement Vercel (production ex. `souma-zeta.vercel.app`).

**Alternatives écartées :** Netlify ; Railway ; VPS OVH/DigitalOcean ; Docker sur Kubernetes ; GitHub Pages (statique seul).

**Pourquoi pas l'alternative :**
- **Netlify** : viable pour Next.js, mais Blob, previews OAuth et intégration `@vercel/blob` sont **alignés Vercel** dans ce repo.
- **VPS** : nginx, SSL, scaling manuel — temps non investi dans le Seller Helper.
- **GitHub Pages** : pas de Route Handlers ni SSR ; incompatible avec admin et APIs.

**Problème résolu :** `git push` → build → preview URL pour tester Google OAuth avant prod.

---

### Better Auth

**Choix retenu :** Better Auth (sessions, cookies, plugin Google).

**Alternatives écartées :** NextAuth (Auth.js) ; Clerk ; Auth0 ; Supabase Auth ; sessions maison JWT.

**Pourquoi pas l'alternative :**
- **Clerk / Auth0** : SaaS payant et UI imposée ; surplus pour un admin interne et quelques vendeurs testeurs.
- **JWT maison** : risque XSS/refresh, rotation des secrets, pas de plugin OAuth testé — réinventer la roue pour un rapport sécurité.
- **NextAuth** : alternative valide ; Better Auth a été retenu pour intégration Route Handlers et configuration centralisée `BETTER_AUTH_SECRET` déjà en place.

**Problème résolu :** sessions sécurisées admin sans développer un serveur d'auth séparé.

---

### Google OAuth

**Choix retenu :** Connexion Google via Better Auth (`/api/auth/callback/google`).

**Alternatives écartées :** Email/mot de passe seul ; Facebook Login ; magic link ; comptes locaux sans OAuth.

**Pourquoi pas l'alternative :**
- **Email/mot de passe seul** : gestion reset password, hachage, spam d'inscription — charge support pour une équipe projet.
- **Facebook** : moins universel chez les testeurs académiques/pro ; politique API plus restrictive.
- **Magic link** : dépend d'un fournisseur e-mail fiable (Brevo) déjà réservé aux **notifications Seller Helper**, pas à l'auth de masse.

**Problème résolu :** friction minimale à l'entrée admin ; confiance utilisateur sur un compte déjà possédé.

---

## 4. Interface utilisateur et état client

### Tailwind CSS 3

**Choix retenu :** Tailwind (utilitaires, design tokens projet).

**Alternatives écartées :** Bootstrap ; Material UI seul ; CSS Modules volumineux ; styled-components.

**Pourquoi pas l'alternative :**
- **Bootstrap** : look générique « template » ; personnalisation Vitrina (promos, Seller Helper) plus lourde.
- **MUI seul** : bundle et style Material imposé — incohérent avec la charte boutique existante.
- **CSS global massif** : difficile à maintenir entre dizaines de composants admin et storefront.

**Problème résolu :** itération rapide responsive (mobile promo, grilles admin) sans feuille CSS monolithique.

---

### Redux Toolkit

**Choix retenu :** Redux Toolkit pour panier, produit courant, mode prix (detail/jomla).

**Alternatives écartées :** Zustand ; Jotai ; Context API seul ; pas d'état global (props drilling).

**Pourquoi pas l'alternative :**
- **Context seul** : re-renders sur tout l'arbre quand le panier change ; plusieurs pages consomment le panier simultanément.
- **Zustand** : plus léger, mais Redux déjà câblé (`redux-persist` possible) ; migration sans gain métier.
- **Props drilling** : invivable entre layout, header, fiche produit et checkout.

**Problème résolu :** état panier **stable et partagé** entre routes Next.js client.

---

### React Hook Form + Zod

**Choix retenu :** RHF + Zod (admin produit, alertes, quick fixes).

**Alternatives écartées :** Formik + Yup ; validation manuelle ; HTML5 `required` seul.

**Pourquoi pas l'alternative :**
- **Formik** : plus verbeux ; re-renders à chaque frappe sur gros formulaires produit.
- **Validation manuelle** : duplication des règles entre client et API ; Zod peut être **partagé** avec les Route Handlers.

**Problème résolu :** rejeter tôt prix/stock/JSON `[[PRODUCT_CONTENT_V1]]` invalides avant écriture Postgres.

---

### Radix UI, Lucide, toasts

**Choix retenu :** Radix (accessibilité), Lucide (icônes), Sonner / react-hot-toast.

**Alternatives écartées :** Headless UI seul ; Font Awesome ; alertes `window.alert` ; composants maison non a11y.

**Pourquoi pas l'alternative :**
- **Composants maison** : labels ARIA, focus trap modales Vitrina — temps non prioritaire vs métier Seller Helper.
- **Font Awesome** : pack complet plus lourd que Lucide tree-shakable.

**Problème résolu :** patterns UI admin fiables (modales, onglets) sans librairie « full design » imposée.

---

### Swiper

**Choix retenu :** Swiper (accueil, Vitrina).

**Alternatives écartées :** Carrousel CSS pur ; react-slick ; Embla sans touch.

**Pourquoi pas l'alternative :**
- **CSS seul** : swipe tactile et inertie mobile faibles — public mobile important pour e-commerce DZ.
- **react-slick** : dépendance jQuery historique ; maintenance moindre que Swiper pour touch.

**Problème résolu :** carrousels fluides sur mobile sans réimplémenter le geste swipe.

---

## 5. Analytics propriétaires et Seller Helper

### Table `sales_micro_event` (événements `pa_*`)

**Choix retenu :** Micro-événements propriétaires en PostgreSQL (`pa_product_view`, `pa_select_option`, `pa_add_to_cart`, etc.).

**Alternatives écartées :** Google Analytics 4 seul ; Mixpanel ; Hotjar ; Plausible ; Matomo auto-hébergé sans lien base métier.

**Pourquoi pas l'alternative :**
- **GA4 / Mixpanel** : données dans un silo externe ; impossible d'exécuter un **quick fix Vitrina** ni de recalculer l'impact conversion **sur la même ligne SQL** que le catalogue.
- **Hotjar** : heatmap SaaS ; pas de corrélation directe avec `seller_helper_applied_action` ni suppression « Delete data » par produit côté Vitrina.
- **Plausible** : excellent pour trafic agrégé, mais pas d'événements fins couleur/taille ni d'API interne Seller Helper.

**Problème résolu :** boucle fermée **observer → recommander → appliquer → mesurer** dans **une** base.

---

### Séquences `shopping_sequence`

**Choix retenu :** Table / logique de séquences de navigation par session.

**Alternatives écartées :** Pages vues GA4 seules ; parcours reconstruit offline ; pas de modèle de session.

**Pourquoi pas l'alternative :**
- **Pages vues seules** : ne dit pas *dans quel ordre* l'utilisateur a visité produit → panier → abandon.
- **Reconstruction offline** : batch lourd ; pas temps réel pour alertes « abandon panier ».

**Problème résolu :** funnel explicable (où l'acheteur sort) pour Timeline et alertes.

---

### heatmap.js

**Choix retenu :** heatmap.js alimenté par `pa_pointer_*` déjà collectés.

**Alternatives écartées :** Hotjar ; Microsoft Clarity ; canvas maison sans lib.

**Pourquoi pas l'alternative :**
- **Hotjar / Clarity** : scripts tiers, RGPD/consentement, données hors Postgres ; pas de bouton « effacer données produit » unifié Vitrina.
- **Canvas maison** : réimplémentation du rendu heatmap = temps perdu.

**Problème résolu :** heatmap produit **sans abonnement** et avec les **mêmes événements** que le reste du module.

---

### Moteur de règles déterministe

**Choix retenu :** Seuils SQL + règles (alertes, couleur par défaut Vitrina via `pa_select_option`).

**Alternatives écartées :** LLM seul pour toutes les alertes ; tableau Excel exporté ; règles hardcodées sans config admin.

**Pourquoi pas l'alternative :**
- **LLM seul** : réponses non reproductibles, coût par analyse, difficile à défendre devant un jury (« pourquoi cette alerte ? »).
- **Excel** : pas temps réel ; pas de quick fix en un clic dans l'UI.
- **Hardcode sans config** : chaque changement de seuil = redéploiement.

**Problème résolu :** recommandations **actionnables, auditables** et mesurables après application.

---

## 6. Intelligence artificielle et APIs LLM

### OpenRouter

**Choix retenu :** OpenRouter (`ASSISTANT_FREEFLOW_MODEL`, `CONCEPTION_OPENROUTER_MODEL`).

**Alternatives écartées :** Appels directs OpenAI seul ; Anthropic seul ; Ollama local en prod ; pas d'IA (règles uniquement).

**Pourquoi pas l'alternative :**
- **Un seul fournisseur** : rate limit ou panne = assistant et Seller Helper down ; OpenRouter **agrège** plusieurs modèles avec une seule clé HTTP.
- **Ollama en prod Vercel** : pas de GPU serverless ; latence et cold start inadaptés.
- **Pas d'IA** : synthèses textuelles multilingues et matching catalogue flou (darija) nettement moins bonnes.

**Problème résolu :** flexibilité modèle + un point d'intégration pour assistant et analyste.

---

### Google Gemini (secours / normalisation)

**Choix retenu :** `@google/genai` en secours et normalisation FR/AR/arabizi.

**Alternatives écartées :** GPT-4 seul ; traduction DeepL API ; pas de normalisation (recherche exacte).

**Pourquoi pas l'alternative :**
- **Recherche exacte** : « Samsung A54 » vs « سامسونج a54 » vs arabizi — taux d'échec élevé sans couche linguistique.
- **DeepL seul** : traduit mais ne **classifie pas l'intention** acheteur (comparaison, stock, prix).
- **GPT-4 direct** : viable ; Gemini retenu comme **fallback** déjà branché si OpenRouter limite.

**Problème résolu :** assistant utilisable par un public **multilingue** algérien.

---

### Stratégie LLM bornée

**Choix retenu :** LLM = synthèse + suggestions ; décisions merchandising = SQL + quick fixes base.

**Alternatives écartées :** « Copilot » qui ne fait que du texte ; agent autonome qui modifie la prod sans validation ; fine-tuning propriétaire.

**Pourquoi pas l'alternative :**
- **Texte seul** : pas de boucle mesurer ; le vendeur ne voit pas l'effet sur `pa_add_to_cart`.
- **Agent autonome** : risque modification prix/stock non contrôlée ; inacceptable en démo académique.
- **Fine-tuning** : données et GPU insuffisants pour un PFE ; surcoût sans gain vs prompt + contexte `PRODUCT_FACTS`.

**Problème résolu :** IA **complète** les chiffres, ne les remplace pas — explicable au jury.

---

### API `/api/assistant`

**Choix retenu :** Catalogue via `getCatalogProducts()` (DB + `shopData`), contexte fiche produit sur `/shop-details`.

**Alternatives écartées :** `shopData.ts` statique seul ; recherche Elasticsearch ; pas d'assistant.

**Pourquoi pas l'alternative :**
- **shopData seul** : produits créés en admin **invisibles** pour l'assistant (bug constaté type « Samsung A54 ») — rejeté après test.
- **Elasticsearch** : infra supplémentaire, indexation, coût — surdimensionné pour < quelques milliers de SKU.
- **Pas d'assistant** : moins de conversion sur mobile ; pas de démo « IA commerce » du projet.

**Problème résolu :** réponses alignées sur le **catalogue réel** et le **produit affiché**.

---

## 7. Paiements, e-mail et intégrations métier

### Chargily Pay

**Choix retenu :** API Chargily (EDAHABIA, CIB, contexte Algérie).

**Alternatives écartées :** Stripe seul ; PayPal ; virement manuel sans passerelle ; CMI banque directe.

**Pourquoi pas l'alternative :**
- **Stripe seul** : cartes internationales OK, mais **pas** les moyens locaux attendus par une clientèle DZ (EDAHABIA, etc.) — choix produit explicitement local.
- **PayPal** : faible adoption locale e-commerce physique/électronique DZ.
- **Virement manuel** : pas de webhook paiement → pas d'automatisation commande.

**Problème résolu :** passerelle **alignée marché cible** du projet pluridisciplinaire.

---

### Brevo (e-mail transactionnel)

**Choix retenu :** Brevo pour envoi recommandations Seller Helper vers rôles (marketing, logistique…).

**Alternatives écartées :** SendGrid ; Resend ; SMTP Gmail ; notifications in-app seules.

**Pourquoi pas l'alternative :**
- **Gmail SMTP** : quotas, spam, pas d'API transactionnelle propre en prod Vercel.
- **In-app seul** : le responsable logistique peut ne pas être connecté à l'admin au moment de l'alerte.
- **SendGrid/Resend** : équivalents valides ; Brevo retenu pour API simple et volume **faible** (post-analyse, pas newsletter de masse).

**Problème résolu :** **décision dans l'app**, **notification** hors ligne par e-mail.

---

## 8. Utilitaires transverses

### Zod

**Choix retenu :** Zod sur Route Handlers (admin, assistant, micro-événements).

**Alternatives écartées :** Yup ; io-ts ; validation ad hoc `if (!body.price)`.

**Pourquoi pas l'alternative :**
- **Ad hoc** : diverge entre routes ; failles sur champs optionnels nested.
- **Yup** : moins naturel avec TypeScript inféré que Zod dans l'écosystème Next moderne.

**Problème résolu :** même langage de validation que RHF côté formulaires.

---

### transliteration

**Choix retenu :** Librairie `transliteration` pour arabizi / latinisation requêtes assistant.

**Alternatives écartées :** Normalisation manuelle ; ignorer darija ; dictionnaire statique par produit.

**Pourquoi pas l'alternative :**
- **Ignorer darija** : l'assistant échoue sur une part réelle des recherches mobiles DZ.
- **Dictionnaire statique** : non scalable à chaque nouveau SKU.

**Problème résolu :** recherche catalogue **tolérante** aux variantes d'écriture.

---

### Playwright

**Choix retenu :** Playwright pour PDF rapports et tests E2E optionnels.

**Alternatives écartées :** Puppeteer ; wkhtmltopdf ; impression navigateur manuelle ; Cypress seul.

**Pourquoi pas l'alternative :**
- **wkhtmltopdf** : rendu CSS moderne incomplet (flex, gradients couverture rapport).
- **Impression manuelle** : non reproductible en CI / script `npm run report:*:pdf`.
- **Cypress** : orienté tests ; Playwright gère **PDF** et E2E avec une API.

**Problème résolu :** livrables PDF **automatiques** pour USTHB.

---

### Scripts `ensure-*` + `tsx`

**Choix retenu :** Scripts idempotents au `build` Vercel + `tsx` pour seeds/simulations.

**Alternatives écartées :** Migrations Drizzle seules sans garde-fou ; setup SQL manuel obligatoire ; pas de seed.

**Pourquoi pas l'alternative :**
- **SQL manuel seul** : chaque membre oublie une table → 500 en prod sur première route analytics.
- **Pas de seed** : Seller Helper vide en démo jury — pas d'alertes ni Vitrina à montrer.

**Problème résolu :** déploiement **résilient** même si Neon n'a pas reçu toutes les migrations à la main.

---

## 9. Tableau synthétique (choix vs alternatives)

| Couche | Choix retenu | Alternatives écartées (principales) | Raison du rejet |
|--------|--------------|-------------------------------------|-----------------|
| Full-stack | Next.js 15 | CRA+Express, Remix, Nuxt | Un repo, SSR, APIs, déploiement Vercel |
| Langage | TypeScript | JS pur | Contrats `pa_*`, DTO, moins de bugs prod |
| Base | PostgreSQL + Neon | MongoDB, Firestore, SQLite prod | Agrégations funnel, jointures, serverless |
| ORM | Drizzle | Prisma, TypeORM | SQL explicite analytics, schéma léger |
| Fichiers | Vercel Blob | BYTEA Postgres, disque Vercel | CDN, base allégée, éphémère serverless |
| Hébergement | Vercel | VPS, Netlify | Blob, previews OAuth, zero-ops |
| Auth | Better Auth + Google | Clerk, JWT maison | Coût, sécurité, OAuth déjà configuré |
| CSS | Tailwind | Bootstrap, MUI full | Vitesse, charte boutique custom |
| État | Redux Toolkit | Context seul, Zustand | Panier multi-pages déjà en place |
| Forms | RHF + Zod | Formik, validation manuelle | Perf forms, partage schémas API |
| Analytics | `sales_micro_event` | GA4, Hotjar, Mixpanel | Boucle quick fix + même DB |
| Heatmap | heatmap.js | Hotjar, Clarity | Données locales, pas d'abonnement |
| Décision | Règles SQL | LLM seul | Reproductible, auditable, pas de coût/token |
| IA | OpenRouter + Gemini | Un modèle, Ollama prod | Fallback, multilingue, serverless |
| Assistant | DB + contexte produit | shopData seul, Elasticsearch | Catalogue réel, pas d'infra search |
| Paiement | Chargily | Stripe seul | Moyens paiement Algérie |
| E-mail | Brevo | Gmail SMTP, in-app seul | Transactionnel, rôles hors ligne |
| PDF | Playwright | wkhtmltopdf | CSS moderne, script npm reproductible |

---

## 10. Conclusion

Chaque technologie du projet a été choisie **par élimination** : une alternative a été écartée non par ignorance du marché, mais parce qu'elle ne fermait pas la boucle métier (données analytics → recommandation Vitrina → quick fix → mesure d'impact), ou parce qu'elle ajoutait une infra (VPS, Elasticsearch, SaaS analytics) disproportionnée pour un PFE USTHB déployé sur Vercel avec un marché algérien.

La stack retenue n'est pas « la plus hype », mais la plus **cohérente** avec : un seul dépôt Next.js/TypeScript, une seule base PostgreSQL pour le commerce et le Seller Helper, des événements propriétaires plutôt que des silos GA4/Hotjar, un LLM en **complément** des règles SQL, et Chargily/Brevo pour le **contexte local** et la notification d'équipe.

---

*Régénération PDF : `npm run report:technologies-motivation-fr:pdf`*
