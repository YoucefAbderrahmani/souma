# Seller Helper — Guide technique complet & questions jury

**Vitrina Store · Module Seller Helper (Conception)**

Document de référence pour la soutenance : architecture, flux de données, implémentation par onglet, APIs, base de données, et **réponses types** aux questions techniques qu’un jury peut poser.

---

## Résumé exécutif

Le **Seller Helper** est un module d’aide à la décision pour le vendeur e-commerce, intégré à **Vitrina Store**. Il repose sur une boucle fermée :

1. **Observer** — le navigateur envoie des micro-événements `pa_*` (produit, panier, checkout, heatmap, erreurs).
2. **Analyser** — agrégations SQL + règles + (optionnel) LLM → alertes et recommandations IA.
3. **Recommander** — onglet **Vitrina** : conseils merchandising par produit (couleur par défaut, promo, avis, etc.).
4. **Appliquer** — **quick fixes** en un clic (server actions) qui modifient la table `products`.
5. **Mesurer** — **Timeline** : repères des actions + impact conversion avant/après.

**Trois couches techniques :**

| Couche | Rôle | Fichiers clés |
|--------|------|---------------|
| Client | Tracking, UI 9 onglets | `product-analytics-client.ts`, `useProductAnalyticsTracking.ts`, `SellerHelperDashboard.tsx` |
| API / serveur | Ingestion, agrégation, analyse | `/api/sales-analyst/events`, `/api/admin/conception/*`, `metrics.ts`, `analyze.ts` |
| Persistance | Événements, alertes, actions | `sales_micro_event`, `conception_*`, `seller_helper_applied_action` |

**Point important pour le jury :** les recommandations **Vitrina** sont **déterministes** (règles sur les `pa_*`), pas générées par le LLM à l’exécution. Le LLM sert surtout aux **recommandations IA** et au texte de synthèse dans l’onglet AI Recommendations.

---

## 1. Architecture globale et flux de données

### 1.1 Schéma de flux (boutique → Seller Helper)

```
[Navigateur acheteur]
    │  trackProductAnalytics("pa_*", payload)
    │  batch ~1,8 s, max 40 événements
    ▼
POST /api/sales-analyst/events  (public, sessionKey ≥ 8 car.)
    │  whitelist pa_*, config disabled events
    │  DROP si session dans conception_security_block
    ▼
[PostgreSQL] sales_micro_event
    │
    ├─► buildConceptionOverview()        → Dashboard, Funnel, Behavior
    ├─► listVitrinaProductMarketing...() → Vitrina (agrégats 7 j)
    ├─► runConceptionAnalysisJob()       → Alerts + AI Recs + cache Vitrina
    ├─► buildTimelineSeries()            → Timeline + impact
    └─► buildConceptionSecurityBrief()   → Security

[Vendeur admin] Seller Helper UI
    │  quick fix → applyVitrinaQuickFixesAction / applySecurityQuickFixesAction
    ▼
products (mutation) + seller_helper_applied_action (audit)
    │  revalidateStorefrontCatalogPaths()
    ▼
[Boutique] changement visible + nouveaux pa_* pour mesurer l’effet
```

### 1.2 Accès et sécurité admin

- **Pages :** `/seller-helper` (site) et panneaux admin (`ConceptionIntelligenceDashboard`).
- **API admin :** `requireAdminApi(req)` — session Better Auth + `role === "admin"` ou e-mail dans `ADMIN_EMAILS`.
- **Ingestion événements :** **publique** (pas d’admin) pour ne pas bloquer le tracking visiteurs ; `userId` optionnel si cookie auth présent.

### 1.3 Server actions vs REST

Les **quick fixes** Vitrina et Sécurité passent par des **Server Actions** Next.js (pas des routes REST) :

- `applyVitrinaQuickFixesAction` → `applyVitrinaQuickFixes()`
- `applySecurityQuickFixesAction` → `applySecurityQuickFixes()`

Fichier : `src/app/(site)/(pages)/(admin-shell)/admin/actions.ts`

---

## 2. Les neuf onglets — fonctionnement technique

Navigation : `SELLER_HELPER_NAV` dans `src/components/SellerHelper/nav.ts`.

### 2.1 Dashboard (Overview)

**Composant :** `DashboardMainContent` dans `SellerHelperDashboard.tsx`.

**API :** `GET /api/admin/conception/overview`

**Serveur :** `buildConceptionOverview()` dans `src/server/conception/metrics.ts`.

**Données affichées :**
- KPIs 7 j / 24 h : événements totaux, sessions actives (15 min), trafic.
- Graphique trafic 24 h par tranche horaire.
- Répartition appareils (`pa_global_context` : mobile/desktop).
- Top pages (`page_path` dans `sales_micro_event`).

**Hook client :** `useConceptionAdminData` charge overview + rafraîchit les autres onglets.

---

### 2.2 Conversion Funnel

**Composant :** `ConversionFunnelContent`.

**Source :** `overview.funnelSteps`, `funnelSummary`, `frictionItems` (même overview).

**Étapes funnel (événements) :**
- `pa_product_view` → vue produit
- `pa_add_to_cart` → ajout panier
- `pa_begin_checkout` → début checkout
- `pa_purchase` → achat confirmé

**Calcul :** comptages distincts par session ou par événement sur fenêtre 7 j ; taux de passage entre étapes ; points de friction listés pour cartes `SellerHelperInsightCard`.

---

### 2.3 User Behavior

**Composants :** `UserBehaviorContent`, `ProductPageHeatmap.tsx`, `HeatmapPreviewFrame.tsx`.

**APIs :**
- `GET /api/admin/conception/heatmap/pages` — liste produits avec assez de `pa_pointer_*`
- `GET /api/admin/conception/heatmap?productId=&metric=&windowDays=` — agrégation x_pct/y_pct

**Serveur :** `getProductPageHeatmap()` dans `product-page-heatmap.ts`.

**Autres signaux :**
- Sources de trafic : `referrer` + `pa_global_context`
- Scroll : `pa_scroll` (bandes 25/50/75/100 %)
- Session replays : liens vers funnel / admin (pas d’enregistrement vidéo type FullStory)

---

### 2.4 Vitrina Recommendation

**Composants :** `vitrina-recommendations.tsx`, modales `VitrinaQuickFixConfirmModal`, `VitrinaQuickEditModal`, `VitrinaFixesPerItemSetting`.

**APIs :**
- `GET /api/admin/conception/vitrina-recommendations` — cache ou `?regenerate=1`
- `POST .../clear` — vider cache global
- `POST .../clear-product-data` — supprimer micro-événements d’un produit + rafraîchir carte
- `POST .../reset-catalog-default` — réinitialiser merchandising catalogue

**Moteur :** `product-marketing-recommendations.ts` :
1. `loadSignalAggregates()` — SQL 7 j par `product_local_id`
2. `buildTips()` — règles Prix, Stock, Avis, Countdown, Promo, **couleur par défaut** (`pa_select_option`), taille, carte catalogue
3. `buildQuickFixes()` — map tip → `VitrinaQuickFixId`
4. `opportunityScore()` — tri des cartes produit

**Quick fix IDs :**
- `default_color`, `default_size`, `promo_price`, `availability_note`, `quality_highlight`, `trending_countdown`, `promo_catalog_boost`, `hero_review_snippet`

**Application :** `applyVitrinaQuickFixes()` modifie `products` (prix, JSON contenu structuré `[[PRODUCT_CONTENT_V1]]`), log `vitrina_quick_fix`, `revalidateStorefrontCatalogPaths()`.

**Cache :** `vitrina-recommendations-cache.ts` (serveur + client).

---

### 2.5 AI Recommendations

**Composants :** `AiRecommendationsContent`, `AiRecommendationCard`.

**APIs :**
- `GET /api/admin/conception/recommendations`
- `PATCH` — dismiss
- `DELETE` — tout effacer (+ inbox)
- `POST .../send-email` — Brevo → inbox

**Génération :** bouton **Analyze** → `POST /api/admin/conception/analyze` → `runConceptionAnalysisJob()` :
1. Alertes par règles (5 types)
2. Recommandations funnel (product→cart, cart→checkout, LCP)
3. `runConceptionLlmAnalysis()` — OpenRouter puis Gemini fallback
4. Baseline si LLM vide
5. Régénération liste Vitrina + écriture cache

**Table :** `conception_recommendation` — `workflowStatus`: `active` → après e-mail → `inbox` → `implemented` / dismiss.

---

### 2.6 Inbox

**Composant :** `inbox-tab.tsx`.

**API :** `GET /api/admin/conception/inbox?roleKey=`, `PATCH` (implement / dismiss).

**Rôle :** suivi des recommandations **envoyées par e-mail** à marketing, logistique, etc. (`recommendation_role_email`).

---

### 2.7 Timeline

**Composants :** `timeline-tab.tsx`, `TimelineLogsSection`, `charts.tsx`, `AppliedActionDetailsModal`.

**APIs :**
- `GET /api/admin/seller-helper/timeline?range=&scope=&metrics=&productId=`
- `GET .../timeline/products`
- `POST .../applied-actions/revert` — retour point de blocage Vitrina
- `POST .../reset-default` — reset produit catalogue
- `POST .../request-revert-email` — brouillon LLM + Brevo

**Métriques :** `views`, `uniqueSessions`, `addToCarts`, `purchases`, `conversionRate`.

**Plages :** `24h`, `7d`, `30d`, `90d` — granularité heure ou jour.

**Impact :** `computeAppliedActionConversionImpact()` — fenêtre **égale** avant/après `occurredAt` ; taux = `pa_purchase` / `pa_product_view` (min 15 min après action).

**Kinds d’actions :** `vitrina_quick_fix`, `security_block`, `security_unblock`, `alert_resolved`, `ai_recommendation`.

---

### 2.8 Security

**Composants :** `security-tab.tsx`, `SellerHelperSecurityCard`, `SecurityQuickFixConfirmModal`.

**Source :** `buildConceptionSecurityBrief()` dans `security-intel.ts` (inclus dans overview).

**Détection :**
- Sessions « bot » : forte vélocité `pa_product_view`
- Rafale `pa_js_error` vs sessions checkout
- Graphique menaces 24 h

**Actions :** `block_session` / `unblock_session` → `conception_security_block` ; `DELETE /api/admin/conception/security` — lever tous les blocs.

**Effet blocage :** `insertSalesMicroEvents()` **ignore** les événements des sessions bloquées.

**Script démo :** `npm run db:trigger-security-alerts` → `scripts/trigger-security-alerts.ts`.

---

### 2.9 Alerts

**Composants :** `AlertsContent`, `AlertRuleSettingsModal`.

**APIs :** `GET/PATCH/DELETE /api/admin/conception/alerts`, `POST .../alerts/detail`, `GET/PUT .../alert-rules`.

**Types d’alertes (règles) :**

| Type | Condition (résumé) | Sévérité |
|------|-------------------|----------|
| `CONVERSION_DROP` | `rateNow < rateOld × seuil` (7 j) | critical |
| `TRAFFIC_SPIKE` | events 15 min > baseline × multiplicateur | high |
| `CART_ABANDON_MASS` | paniers 2 h + taux abandon | medium |
| `JS_ERROR_BURST` | pa_js_error / sessions checkout | high |
| `PERF_SLOW` | LCP ou navigation > 4 s, N sessions | low |

**Déduplication :** `fingerprint` unique par jour/heure selon type — `onConflictDoNothing`.

**Détail alerte :** `buildAlertDetailAnalysis()` — **rule-based**, `llmEnhanced: false`.

---

## 3. Micro-événements `pa_*` — ingestion complète

### 3.1 Liste blanche (26 événements)

Fichier : `src/lib/pa-whitelist.ts`

| Événement | Usage principal |
|-----------|-----------------|
| `pa_global_context` | Appareil, UA, source trafic, viewport |
| `pa_product_ident` | Id produit, prix, catégorie |
| `pa_product_view` | Entrée funnel fiche produit |
| `pa_product_view_time` | Temps passé sur fiche |
| `pa_select_option` | Couleur, taille, variante |
| `pa_image_interaction` | Clic galerie |
| `pa_image_view_time` | Temps par image |
| `pa_review_*` | Interactions avis |
| `pa_specs_*` | Onglet caractéristiques |
| `pa_scroll` | Profondeur scroll |
| `pa_pointer_hover` / `pa_pointer_click` | Heatmap (% x, y) |
| `pa_add_to_cart` / `pa_remove_from_cart` | Panier |
| `pa_begin_checkout` / `pa_checkout_step` / `pa_purchase` / `pa_abandon_checkout` | Checkout |
| `pa_search` | Recherche header |
| `pa_add_to_wishlist` | Liste de souhaits |
| `pa_performance` | LCP, load, TTFB |
| `pa_navigation` | Changement route |
| `pa_js_error` | Erreurs client |

### 3.2 Client — batching

Fichier : `src/lib/product-analytics-client.ts`

- Flush toutes les **~1,8 s** ou à la fermeture page (`sendBeacon` / `fetch keepalive`).
- Max **40** événements par batch ; API max **60** par requête.
- Header **`x-sequence-session`** (session navigateur ≥ 8 caractères).
- Config : `GET /api/product-analytics/tracking-config` — événements désactivés côté admin.

### 3.3 Route ingestion

`POST /api/sales-analyst/events` :

1. Valider `sessionKey`, noms `pa_*`, payloads JSON.
2. Filtrer noms dans `product_analytics_tracking_config.disabledEventsJson`.
3. `insertSalesMicroEvents()` — colonnes : `session_key`, `product_local_id`, `product_title`, `page_path`, `referrer`, `event_name`, `payload_json`, `client_event_at`, `sequence_index`.

### 3.4 Émetteurs principaux

- `useProductAnalyticsTracking.ts` — fiche produit (couleur, galerie, scroll, heatmap)
- `ShopDetails`, checkout, panier, `BestSeller`, `QuickViewModal`
- `StorefrontAnalyticsLanding` — premier `pa_global_context`
- `SequenceRouteWatcher` — navigation

---

## 4. Base de données — tables Seller Helper

Fichier schéma : `src/server/db/schema.ts`

### 4.1 `sales_micro_event`

Événements bruts. Index sur `session_key`, `product_local_id`, `event_name`, `created_at`.

### 4.2 `conception_alert`

Alertes actives/résolues : `alert_type`, `severity`, `title`, `description`, `detail`, `fingerprint`, `dismissed_at`.

### 4.3 `conception_recommendation`

Recommandations IA : `priority`, `impact_label`, `analysis`, `recommendation`, `confidence`, `assigned_role_key`, `workflow_status`, `email_sent_at`, `implemented_at`.

### 4.4 `seller_helper_applied_action`

Journal des actions vendeur : `kind`, `title`, `summary`, `product_local_id`, `details_json`, `occurred_at`.

### 4.5 `conception_alert_settings`

Singleton JSON des seuils (5 règles éditables dans UI).

### 4.6 `recommendation_role_email`

Mapping `role_key` → e-mail (marketing, logistics, etc.).

### 4.7 `conception_security_block`

`session_key` PK, `reason`, `blocked_at`, `lifted_at`.

### 4.8 `product_analytics_tracking_config`

Liste JSON des `pa_*` désactivés site-wide.

### 4.9 Tables catalogue liées

`products`, `category`, `product_review` — cibles des quick fixes Vitrina.

---

## 5. Catalogue des APIs (méthodes HTTP)

### 5.1 Public

| Méthode | Route |
|---------|-------|
| POST | `/api/sales-analyst/events` |
| GET | `/api/product-analytics/tracking-config` |

### 5.2 Admin Conception

| Méthode | Route |
|---------|-------|
| GET | `/api/admin/conception/overview` |
| POST | `/api/admin/conception/analyze` |
| GET/PATCH/DELETE | `/api/admin/conception/alerts` |
| POST | `/api/admin/conception/alerts/detail` |
| GET/PUT | `/api/admin/conception/alert-rules` |
| GET/PATCH/DELETE | `/api/admin/conception/recommendations` |
| POST | `/api/admin/conception/recommendations/send-email` |
| GET/PATCH | `/api/admin/conception/inbox` |
| GET | `/api/admin/conception/heatmap/pages` |
| GET | `/api/admin/conception/heatmap` |
| DELETE | `/api/admin/conception/security` |
| GET/POST | `/api/admin/conception/vitrina-recommendations` (+ clear, clear-product-data, reset-catalog-default) |

### 5.3 Admin Seller Helper Timeline

| Méthode | Route |
|---------|-------|
| GET | `/api/admin/seller-helper/timeline` |
| GET | `/api/admin/seller-helper/timeline/products` |
| POST | `/api/admin/seller-helper/applied-actions/revert` |
| POST | `/api/admin/seller-helper/applied-actions/reset-default` |
| POST | `/api/admin/seller-helper/applied-actions/request-revert-email` |

### 5.4 Admin utilitaires

| Méthode | Route |
|---------|-------|
| GET/PATCH | `/api/admin/product-analytics/tracking-config` |
| GET | `/api/admin/sales-micro-events`, `/api/admin/sales-micro-by-product` |
| GET/POST/DELETE | `/api/admin/recommendation-role-emails` |
| GET | `/api/admin/debug/conception-probe`, `seller-helper-parameter-coverage`, `db-target` |

---

## 6. Pipeline « Analyze now »

Fonction : `runConceptionAnalysisJob()` — `src/server/conception/analyze.ts`

**Ordre d’exécution :**

1. `buildConceptionAnalyzeSignals()` — fenêtres 15 min, 2 h, 7 j.
2. Insertion alertes règles (si seuils `conception_alert_settings`).
3. Recommandations règles funnel + LCP.
4. `runConceptionLlmAnalysis()` — max ~6 alertes + ~8 recommandations JSON parsées.
5. Si rien inséré : `insertBaselineRecommendationsIfEmpty()` (stock bas, merchandising).
6. `listVitrinaProductMarketingRecommendations()` + `writeVitrinaRecommendationsCache()`.
7. E-mails : **0 par défaut** sauf `BREVO_AUTO_SEND_ON_ANALYZE=true`.

**Variables LLM :** `OPENROUTER_API_KEY`, `CONCEPTION_OPENROUTER_MODEL`, `GOOGLE_API_KEY`, `CONCEPTION_GEMINI_MODEL`, `CONCEPTION_LLM_GEMINI_FALLBACK`.

---

## 7. Vitrina — règles merchandising (exemples)

| Signal observé | Tip / action | Quick fix |
|----------------|--------------|-----------|
| Beaucoup de `pa_select_option` couleur X, peu d’achats | Mettre X en défaut | `default_color` |
| Vues élevées, peu `pa_add_to_cart` | Clarifier prix / promo | `promo_price`, `promo_catalog_boost` |
| Stock ≤ 3 | Note disponibilité | `availability_note` |
| Peu d’interactions avis | Snippet avis vérifié | `hero_review_snippet` |
| Score interaction faible | Countdown tendance | `trending_countdown` |

**Couleur par défaut :** réordonne le tableau `colors[]` dans le JSON produit pour que la variante la plus cliquée soit en première position (affichage storefront).

**Delete data (produit) :** `clear-vitrina-product-analytics.ts` — DELETE events par alias IDs + titre ; rafraîchit carte Vitrina.

---

## 8. E-mail Brevo — workflow

1. Admin configure rôles : `/api/admin/recommendation-role-emails`.
2. Carte AI → **Send to role** → `sendRecommendationRoleEmail()` → API Brevo `POST /v3/smtp/email`.
3. Recommandation passe en **inbox** (`workflowStatus: inbox`).
4. Inbox → **Mark implemented** ou dismiss.
5. Timeline → **Request revert email** : OpenRouter rédige JSON sujet/corps → Brevo.

**Env :** `BREVO_API_KEY`, `EMAIL_FROM`, `BREVO_TRANSACTIONAL_TEMPLATE_ID` (optionnel).

---

## 9. Variables d’environnement (soutenance)

| Variable | Rôle |
|----------|------|
| `NEON_DATABASE_URL` / `DATABASE_URL` | PostgreSQL |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | Sessions |
| `GOOGLE_CLIENT_ID/SECRET` | OAuth admin |
| `OPENROUTER_API_KEY` | LLM analyse + revert email |
| `GOOGLE_API_KEY` | Gemini fallback |
| `BREVO_API_KEY` | E-mails recommandations |
| `BLOB_READ_WRITE_TOKEN` | Images produit |
| `CHARGILY_*` | Paiement (hors Seller Helper mais même app) |

---

## 10. Fichiers source — index rapide

| Domaine | Chemin |
|---------|--------|
| Dashboard UI | `src/components/SellerHelper/SellerHelperDashboard.tsx` |
| Données admin hook | `src/hooks/useConceptionAdminData.ts` |
| Métriques | `src/server/conception/metrics.ts` |
| Analyse | `src/server/conception/analyze.ts`, `llm-analysis.ts` |
| Vitrina moteur | `src/server/seller-helper/product-marketing-recommendations.ts` |
| Quick fixes | `src/server/seller-helper/apply-vitrina-quick-fixes.ts` |
| Timeline | `src/server/seller-helper/timeline-series.ts` |
| Impact | `src/server/seller-helper/action-conversion-impact.ts` |
| Sécurité | `src/server/conception/security-intel.ts` |
| Ingestion | `src/server/sales-analyst/micro-events-db.ts` |
| Types DTO | `src/types/conception-admin.ts`, `seller-helper-timeline.ts`, `vitrina-product-recommendations.ts` |

---

## 11. Questions jury — Architecture & concept

### Q1. Qu’est-ce que le Seller Helper en une phrase ?

**R :** Un tableau de bord décisionnel branché sur la boutique Vitrina Store qui collecte le comportement acheteur en micro-événements, détecte problèmes et opportunités, propose des corrections merchandising applicables en un clic, et mesure l’effet sur la conversion.

### Q2. En quoi est-ce différent de Google Analytics ?

**R :** GA4 observe le trafic dans un silo externe. Ici les `pa_*` sont dans **notre** PostgreSQL : les mêmes données alimentent funnel, Vitrina, alertes, timeline et impact après quick fix — sans export ni API tierce pour agir sur le catalogue.

### Q3. Pourquoi « Conception » côté serveur ?

**R :** Nom interne du module analytics (`/api/admin/conception/*`) ; l’UI s’appelle Seller Helper pour le vendeur. Même codebase.

### Q4. Quelle est la boucle fermée du projet ?

**R :** Observer (`pa_*`) → Recommander (Vitrina + IA) → Appliquer (quick fix / blocage) → Mesurer (Timeline + `computeAppliedActionConversionImpact`).

### Q5. Le module est-il couplé au reste de Vitrina Store ?

**R :** Oui : même app Next.js, même base `products`, revalidation cache storefront après quick fix. Ce n’est pas un plugin externe.

---

## 12. Questions jury — Données & tracking

### Q6. Comment identifiez-vous une session ?

**R :** `sessionKey` généré côté navigateur (`browser-sequence-session`), envoyé en header `x-sequence-session` et dans le body ; minimum 8 caractères.

### Q7. Pourquoi des événements `pa_` et pas des noms libres ?

**R :** Préfixe `pa_` = product analytics ; whitelist dans `pa-whitelist.ts` pour éviter injection de noms arbitraires et garder un contrat stable.

### Q8. Volume : combien d’événements par requête ?

**R :** Client batch max 40 ; API rejette > 60. Flush ~1,8 s pour limiter la charge sans perdre la granularité produit.

### Q9. Peut-on désactiver certains événements ?

**R :** Oui — admin `product_analytics_tracking_config` ; le client recharge la config toutes les 90 s.

### Q10. Que se passe-t-il si la base Neon est saturée ?

**R :** La route ingestion détecte les erreurs quota (`isNeonDataTransferQuotaError`) et peut répondre en mode dégradé — le tracking peut échouer silencieusement côté client ; à mentionner comme limite ops.

### Q11. Les événements bloqués par sécurité sont-ils stockés ?

**R :** **Non** — filtrés dans `insertSalesMicroEvents()` si `session_key` est dans `conception_security_block` actif.

### Q12. Comment liez-vous un événement à un produit ?

**R :** `product_local_id` dans le body ou `product_id` dans le payload JSON ; résolution alias via `getCatalogProductAliasIds` pour agrégations.

---

## 13. Questions jury — Vitrina & quick fixes

### Q13. Vitrina utilise-t-il l’IA ?

**R :** **Non à l’exécution.** Règles SQL + heuristiques sur agrégats 7 j. Le LLM peut construire un payload documentaire (`vitrina-recommendation-prompt.ts`) mais la liste affichée est déterministe.

### Q14. Comment choisissez-vous la couleur par défaut ?

**R :** Comptage `pa_select_option` où `option_type=color` sur 7 j ; la couleur la plus sélectionnée alimente le tip ; quick fix `default_color` réordonne le tableau `colors` dans le JSON produit.

### Q15. Un quick fix modifie-t-il vraiment la boutique ?

**R :** Oui — UPDATE `products` (prix, contenu structuré, infos additionnelles) puis `revalidateStorefrontCatalogPaths()` pour invalider le cache Next.js.

### Q16. Comment prouvez-vous qu’une action a été faite ?

**R :** Ligne dans `seller_helper_applied_action` avec `kind`, horodatage, `details_json` ; marqueur sur la Timeline.

### Q17. « Delete data » sur une carte Vitrina ?

**R :** Supprime les lignes `sales_micro_event` pour ce produit (alias IDs + match titre), puis régénère la recommandation — utile pour repartir à zéro après tests.

### Q18. Revert / reset ?

**R :** `revertAppliedActionToChokepoint()` restaure un snapshot merchandising ; `reset-default` remet les défauts catalogue ; e-mail revert optionnel via LLM+Brevo.

---

## 14. Questions jury — IA & recommandations

### Q19. Quand le LLM intervient-il ?

**R :** Lors du **Analyze** pour enrichir alertes/recommandations textuelles ; brouillon e-mail revert ; **pas** pour la liste Vitrina temps réel.

### Q20. OpenRouter vs Gemini ?

**R :** OpenRouter en premier (modèle configurable) ; si crédit/402, fallback Gemini si `GOOGLE_API_KEY` et `CONCEPTION_LLM_GEMINI_FALLBACK` actifs.

### Q21. Comment évitez-vous les hallucinations ?

**R :** Prompts nourris de signaux chiffrés (`buildConceptionAnalyzeSignals`, snapshot catalogue) ; JSON strict parsé ; baseline rule-based si LLM échoue ; Vitrina reste 100 % règles.

### Q22. Les recommandations IA sont-elles automatiquement envoyées par mail ?

**R :** **Non par défaut** — envoi manuel depuis la carte ou `BREVO_AUTO_SEND_ON_ANALYZE=true`.

### Q23. Comment assignez-vous un rôle (marketing, etc.) ?

**R :** `attachAssignedRoleToRecommendationRow()` — heuristiques sur titre/impact ; mapping e-mail dans `recommendation_role_email`.

---

## 15. Questions jury — Alertes & sécurité

### Q24. Liste des 5 alertes automatiques ?

**R :** CONVERSION_DROP, TRAFFIC_SPIKE, CART_ABANDON_MASS, JS_ERROR_BURST, PERF_SLOW — seuils éditables dans AlertRuleSettingsModal.

### Q25. Comment évitez-vous les doublons d’alertes ?

**R :** `fingerprint` unique + `onConflictDoNothing` à l’insertion (par jour ou heure selon type).

### Q26. Comment détectez-vous un bot scraper ?

**R :** `security-intel.ts` — sessions avec très nombreux `pa_product_view` et pattern de navigation anormal sur fenêtre glissante.

### Q27. Blocage = ban IP ?

**R :** Blocage par **`session_key`**, pas par IP — adapté au modèle micro-événements ; une session bloquée n’écrit plus en base.

### Q28. Démo sécurité sans attendre un vrai bot ?

**R :** Script `trigger-security-alerts.ts` / `npm run db:trigger-security-alerts` pour injecter un pattern suspect.

---

## 16. Questions jury — Timeline & mesure d’impact

### Q29. Comment calculez-vous l’impact conversion ?

**R :** Deux fenêtres de **même durée** : avant et après `occurred_at` ; taux = achats (`pa_purchase`) / vues produit (`pa_product_view`) ; delta en points de pourcentage.

### Q30. Impact fiable après 10 minutes ?

**R :** Fenêtre minimum 15 min ; l’UI affiche un libellé « since change (<2h) » — il faut expliquer au jury que l’impact early est **indicatif**, pas statistique définitive.

### Q31. Impact global boutique vs par produit ?

**R :** Scope `store` ou `product` ; filtre SQL sur alias IDs du produit pour le scope produit.

### Q32. Quelles métriques sur la Timeline ?

**R :** Vues, sessions uniques, ajouts panier, achats, taux de conversion — buckets horaires ou journaliers selon la plage.

---

## 17. Questions jury — Technique Next.js & déploiement

### Q33. Pourquoi Server Actions pour les quick fixes ?

**R :** Mutation serveur directe avec session admin déjà validée côté serveur ; évite d’exposer une API REST supplémentaire pour des actions internes admin.

### Q34. Où vit le Seller Helper dans l’arborescence ?

**R :** Page `(site)/seller-helper` + composants `src/components/SellerHelper/` ; admin peut embarquer `ConceptionIntelligenceDashboard`.

### Q35. Comment rafraîchir les données après Analyze ?

**R :** `useConceptionAdminData` appelle `analyze()` puis invalide overview, recommendations, vitrina, alerts, timeline.

### Q36. Scripts `ensure-*` au build ?

**R :** Création idempotente des tables si migrations pas encore appliquées sur Neon — fiabilité déploiement Vercel.

---

## 18. Questions jury — Limites, éthique, RGPD

### Q37. Collectez-vous des données personnelles dans `pa_*` ?

**R :** Principalement comportement produit + `session_key` pseudonyme ; `userId` optionnel si utilisateur connecté. Pas de nom acheteur dans les micro-événements standards.

### Q38. Consentement cookies analytics ?

**R :** À aligner avec la politique du site ; techniquement le tracking est configurable (désactivation par type d’événement). Mentionner comme piste d’amélioration juridique si pas de bannière consent.

### Q39. Limites du heatmap ?

**R :** Agrégation de points `%` page produit — pas replay vidéo ; précision dépend du volume `pa_pointer_*`.

### Q40. Biais statistique sur petits échantillons ?

**R :** Oui — peu de vues → tips Vitrina peu fiables ; scores et seuils minimaux dans le moteur ; à verbaliser en soutenance.

### Q41. Dépendance aux crédits LLM ?

**R :** Sans OpenRouter/Gemini, Analyze produit encore alertes règles + baseline + Vitrina ; dégradation gracieuse.

---

## 19. Questions jury — Comparaisons & choix de conception

### Q42. Pourquoi pas Hotjar + Shopify ?

**R :** Hotjar ne modifie pas le catalogue ni ne calcule l’impact sur **nos** KPIs SQL ; Seller Helper intègre action + mesure dans la même app Vitrina.

### Q43. Pourquoi micro-événements maison vs Segment ?

**R :** Coût, contrôle, corrélation directe avec `products` et quick fixes — Segment reste un hub externe.

### Q44. Pourquoi PostgreSQL et pas Mongo pour les events ?

**R :** Agrégations funnel, jointures produit, timeline — SQL relationnel plus simple pour ce volume et ce modèle.

### Q45. Scalabilité si millions d’événements/jour ?

**R :** Piste : partition par date, archivage, TimescaleDB, agrégats matérialisés — l’architecture actuelle vise PFE / PME, pas hyper-scale.

---

## 20. Questions jury — Démo & scénario soutenance

### Q46. Ordre de démo recommandé ?

**R :** (1) Naviguer fiche produit + changer couleur → (2) Dashboard/funnel → (3) Vitrina tip couleur → quick fix → (4) Timeline marqueur + impact → (5) Analyze → AI card → (6) optionnel Security script.

### Q47. Comment générer du trafic de test ?

**R :** `npm run db:simulate-traffic` ou `db:bulk-7d-activity` — scripts `simulate-storefront-analytics.ts`, `bulk-simulate-7d-high-activity.ts`.

### Q48. Que montrer si la base est vide ?

**R :** Lancer simulation ; sinon baseline recommendations au premier Analyze ; message « sparse telemetry » dans l’UI.

### Q49. Comment prouver le lien code ↔ DB ?

**R :** Montrer une ligne `sales_micro_event` en SQL, même `session_key` dans Network tab POST `/api/sales-analyst/events`, puis carte Vitrina qui cite les comptages.

### Q50. Quelle est votre contribution principale ?

**R :** Conception et implémentation de la **boucle décisionnelle complète** (tracking fin → règles → actions merchandising → mesure), pas seulement un dashboard de lecture.

---

## 21. Glossaire

| Terme | Définition |
|-------|------------|
| `pa_*` | Micro-événement product analytics |
| Quick fix | Action one-click modifiant `products` ou sécurité |
| Fingerprint | Clé déduplication alerte/recommandation |
| Conception | Nom serveur du module intelligence vendeur |
| Vitrina | Onglet recommandations merchandising par produit |
| Chokepoint | État merchandising sauvegardé avant revert |

---

## 22. Conclusion pour la soutenance

Préparez trois messages clés :

1. **Données propriétaires** — les `pa_*` dans PostgreSQL alimentent tout le module, pas un analytics externe déconnecté.
2. **Action, pas seulement lecture** — Vitrina et Sécurité modifient la boutique ou filtrent les sessions ; la Timeline prouve le suivi.
3. **IA encadrée** — LLM pour la synthèse et l’e-mail ; décisions merchandising et alertes critiques reposent sur des **règles explicables**.

Ce document couvre l’implémentation réelle du dépôt Vitrina Store au moment de la génération PDF. En cas d’évolution du code, régénérer le PDF après mise à jour du Markdown source.

---

*Régénération : `npm run report:seller-helper-jury-guide-fr:pdf`*
