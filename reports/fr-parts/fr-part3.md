## Chapitre 5 — Implémentation et réalisation

Ce chapitre concentre la profondeur technique du projet. Les chapitres suivants du rapport se concentrent volontairement sur les fonctionnalités, la validation et les résultats.

### 5.1 Technologies utilisées

**Front-end.** Next.js 15 (App Router) avec React 19 ; Tailwind CSS 3 avec un module de jetons centralisé (`src/components/SellerHelper/layout.ts`) ; icônes Lucide ; graphiques SVG personnalisés dans `src/components/SellerHelper/charts.tsx` (aucune bibliothèque graphique externe).

**Back-end.** TypeScript en mode strict ; Drizzle ORM sur PostgreSQL via le pilote `pg` ; Better Auth pour les sessions et le contrôle des rôles ; Zod pour la validation à l’exécution de chaque corps de requête POST ; Google Generative AI (`@google/genai`) pour le palier LLM.

**Base de données.** PostgreSQL 14+ avec deux tables spécialisées (`sales_micro_event`, `seller_helper_applied_action`) créées par des scripts idempotents `db:ensure-*` intégrés à `npm run build`.

**Outils.** GitHub Actions pour l’intégration et le déploiement continue sur les push vers `main` ; Playwright pour produire ce rapport en PDF ; ESLint et Prettier pour le style du code source.

### 5.2 Le système de suivi (*tracking*)

Le système de suivi enregistre chaque évènement comportemental émis par la vitrine dans la table `sales_micro_event`, selon un schéma normalisé et une enveloppe JSON flexible. Le contrat est défini dans `src/server/conception/event-contract.ts` ; la vitrine envoie les évènements vers `/api/store/events`, où Zod valide le corps avant insertion. Chaque évènement porte une `session_key` (par onglet, persistée dans `sessionStorage`), un `user_id` optionnel, un `product_local_id`, un nom d’évènement normalisé (`pa_product_view`, `pa_add_to_cart`, `pa_begin_checkout`, `pa_purchase`, `pa_scroll`, `pa_pointer_click`, …) et une enveloppe `payload_json` flexible. En aval, les agrégations sont des **requêtes SQL uniques** ciblant cette table.

### 5.3 Le système d’alertes

Le système d’alertes évalue **cinq règles déterministes** sur des fenêtres glissantes d’évènements comportementaux.

```ts
export const CONCEPTION_ALERT_RULES: ConceptionAlertRule[] = [
  { name: "Conversion drop",   condition: "Conversion rate below 80% of the previous window (7 days)." },
  { name: "Abnormal traffic",  condition: "Event volume ×4 vs baseline over 15 minutes (90 min reference)." },
  { name: "Cart abandonment",  condition: "Cart abandonment rate above 80% over 2 hours." },
  { name: "JavaScript errors", condition: "pa_js_error on more than 5% of checkout sessions (2 h)." },
  { name: "Performance",       condition: "Slow navigation or elevated LCP on multiple sessions (2 h)." },
];
```

Le fichier `src/server/conception/analyze.ts` exécute ces règles toutes les quelques minutes, applique une fusion (*upsert*) des alertes déclenchées sous un identifiant `fingerprint` stable (afin que des doublons n’engloutissent pas la liste) et expose les listes « actives » et « résolues » au tableau de bord. La résolution d’une alerte enregistre une action appliquée avec `kind = "alert_resolved"`.

### 5.4 Le système de recommandations IA

Le système de recommandations IA prend un instantané de la synthèse *conception overview* puis appelle un prompt LLM **borné** afin de produire trois à cinq recommandations prioritaires. Le prompt système contraint le modèle à renvoyer un objet JSON au typage strict, ancré dans les champs fournis dans la charge utile, avec priorités parmi `{ high, medium, low }`. Chaque recommandation est fusionnée (*upsertée*) sous une empreinte dans `conception_recommendation` ; rejeter ou appliquer une recommandation produit une action appliquée de type `ai_recommendation`.

### 5.5 Le système analytique du tableau de bord

La couche analytique du tableau de bord construit un transfert (*DTO*) unique, `ConceptionOverviewDto`, qui alimente quatre onglets (Tableau de bord, Comportement utilisateur, Tunnel de conversion, Sécurité). La fonction `buildConceptionOverview` dans `src/server/conception/metrics.ts` exécute peu de requêtes `date_trunc` + `COUNT(*) FILTER`, puis renvoie l’ensemble du DTO en **une seule** requête aller-retour côté base. Le tableau de bord fait le rendu **côté serveur** du DTO inclus dans la charge HTML, ce qui évite le « flash squelette » typique des pages admin rendues uniquement client.

### 5.6 Le système des correctifs rapides Vitrina

Le système Vitrina est la couche la plus tranchée (*opinionated*) du Seller Helper. Il opère en **trois phases**.

- **Phase heuristique.** Elle agrège les sept derniers jours d’évènements par produit, calcule les signaux (vues, taux vue→panier, taux clic→panier, clics sur la zone prix, profondeur de défilement au-delà de 75 %, couleurs les plus choisies) et applique des seuils calibrés :

  ```ts
  const PRICE_MIN_VIEWS = 28;
  const VIEW_TO_CART_PCT_FRICTION = 3.25;
  const VIEW_TO_CART_PCT_HEALTHY_WITH_PROMO = 5.25;
  const PROMO_DISCOUNT_PCT_WEAK = 6.5;
  const PROMO_DISCOUNT_PCT_SOLID = 14;
  ```

- **Phase LLM.** Elle construit une charge JSON bornée pour chaque produit candidat (instantané d’affichage + instantané d’interactions), l’envoie à Gemini avec un prompt qui impose schéma strict et rattache chaque conseil aux champs fournis.

- **Phase d’application.** `apply-vitrina-quick-fixes.ts` valide la demande, résout le produit, mute sa description JSON au moyen d’assistants depuis `src/lib/vitrina-merchandising.ts`, consigne l’action et déclenche la réactualisation (`revalidation`) des chemins vitrine.

Six correctifs sont exposés : `default_color`, `promo_price`, `availability_note`, `quality_highlight`, `trending_countdown`, `hero_review_snippet`. Le dernier forge une ligne d’accroche à partir du meilleur avis **vérifié** (*highest rating, most recent tiebreak*).

### 5.7 La Timeline et les actions appliquées

La couche Timeline trace les métriques dans le temps et superpose les actions appliquées comme checkpoints. `buildTimeline` dans `src/server/seller-helper/timeline-series.ts` calcule les regroupements temporels (heure pour 24 h ; jour pour 7 / 30 / 90 j), résout les identifiants alias de produits lorsque le périmètre est « produit », exécute **une agrégation SQL unique** contre `sales_micro_event` pour les cinq KPI, puis appelle `listAppliedActionsInRange` pour rattacher les actions dans la même plage.

Chaque ligne d’action appliquée relève de l’un des **cinq** types suivants, assortis chacune d’un code couleur : `vitrina_quick_fix` (orange) ; `security_block` (rouge) ; `security_unblock` (turquoise) ; `alert_resolved` (violet) ; `ai_recommendation` (bleu).

### 5.8 Le module de sécurité

Ce module lit `buildConceptionSecurityBrief`, affiche incidents, sessions actuellement bloquées et graphique d’activité hostile. Les deux chemins d’écriture (`block_session`, `unblock_session`) vivent dans `src/server/conception/apply-security-quick-fixes.ts`, sont persistés dans `conception_security_block` et émettent des actions avec le même `kind`. Le middleware de vitrine lit la liste à chaque requête et court-circuite toute requête portant une `session_key` bloquée avant qu’aucun gestionnaire ne la traite.

---

## Chapitre 6 — Sécurité et optimisation

### 6.1 Confidentialité des données marchandes et visiteurs

Sur une surface e-commerce, un projet de fin d’études doit prendre la confidentialité en charge dès le premier jour. Le Seller Helper définit trois choix.

- **Suivi anonyme par défaut des visiteurs et visiteuses.** Ces personnes sont identifiées seulement par une clé de session aléatoire par onglet. Le `user_id` n’est rattaché que lorsqu’un·e utilisateur·rice **authentifié·e** émet un évènement — cas restreint à un sous-ensemble après tunnel.
- **Charges utiles minimales.** Les évènements comportementaux ne véhiculent que les champs indispensables aux panneaux. Nous ne stockons pas d’adresse IP brute, pas de trajectoire pointeur exhaustive et pas la totalité du *User-Agent*.
- **Accès réservé au marchand.** Aucune portion du Seller Helper n’est accessible hors session admin authentifiée.

### 6.2 Protection des comptes

Le Seller Helper s’appuie sur Better Auth pour les sessions et l’application des rôles. Chaque page et chaque endpoint d’API contrôle simultanément la session et le rôle, et le middleware vitrine rejette les requêtes dont la clé de session figure sur liste noire.

### 6.3 Traçabilité des actions (*action accountability*)

Chaque mutation opérée au sein du Seller Helper produit une ligne dans le journal d’actions. Des semaines plus tard la marchande ou le marchand peut répondre *« qui a appliqué quoi, quand et sur quel produit »* sans consulter l’historique Git ni creuser les fichiers journaux serveur. Ce même journal sourt les checkpoints Timeline : ce n’est pas seulement la conformité, c’est **une fonction produit tangible** utilisée quotidiennement.

### 6.4 Performance du point de vue du marchand

Pour la personne métier, la performance se résume ainsi : la page doit charger vite, les actions s’exécuter vite, et il ne faut pas rafraîchir tout manuellement en permanence.

Le Seller Helper rend le tableau de bord sous **la seconde** avec cache froid et sous **200 ms** chaud. Chaque correctif s’achève sous **250 ms** bout à bout (*validation → écriture base → ligne d’audit → réactualisation vitrine*). Lorsque l’onglet **est visible**, la page régénère automatiquement certains KPI, avec limitation de fréquence ; lorsqu’elle est masquée, le rafraîchissement s’arrête pour économiser la bande passante.

### 6.5 Fiabilité et usage dégradé hors connexion

Le Seller Helper se montre **sans risque après un simple rafraîchissement** (*safe to refresh*). Aucun usage critique ne repose uniquement sur un fragile état purement client ; toute lecture peut être relancée ; toute écriture demeure **idempotente** lorsqu’on lui soumet une même charge. Sans connexion, les valeurs **déjà affichées demeurent présentes** jusqu’au retour du réseau ; un clic sur *Actualiser* (**Refresh**) resynchronise alors la page avec la base.

### 6.6 Une architecture attentive aux coûts

Une contrainte structurante est **« zéro surcoût logiciel »**. Le Seller Helper ne doit nécessiter ni service d’analyse à part (**Mixpanel, Hotjar**), ni API de reco facturée à part (**Recombee, Algolia**), ni abonnement LLM dont le coût grimpe avec tout le fil de trafic.

Cela a orienté :

- **une seule table d’évènements comportementaux** plutôt qu’un processeur de flux dédié ;
- **une couche de graphiques SVG maison**, plutôt qu’un SaaS graphique ;
- **un appel LLM borné** uniquement après clic « Analyze now », plutôt qu’un flux temps réel ;
- **un cache reposant sur réactualisation**, plutôt qu’un produit de purge CDN.

### 6.7 Évolutivité (*scalability path*)

Le Seller Helper est conçu **mono‑tenant** (*single‑tenant*) mais se trouve **à une colonne** du mode multi‑tenant. Ajouter une colonne `store_id` aux évènements comportementaux puis aux entrées catalogue, et partitionner les agrégats par cette clé permettrait aux mêmes écrans d’alimenter plusieurs centaines de boutiques. PostgreSQL peut absorber plusieurs dizaines de millions d’évènements par boutique sans partitioning sur mesure ; au-delà, un partitionnement temporel sur `sales_micro_event` représente une suite logique.

---

## Chapitre 7 — Tests et validation

### 7.1 Stratégie de test

La stratégie de validation reflète la méthodologie incrémentale du projet. **Trois** boucles **concentriques** ont été utilisées.

- **Boucle intérieure (développeur).** Chaque fonctionnalité a été exercée sur une base récemment peuplée avec trafic simulé au moyen de `db:simulate-traffic` et `db:bulk-7d-activity`. Tout point de terminaison (*endpoint*) devait passer `tsc --noEmit` avant intégration.
- **Boucle médiane (équipe).** Chaque changement pertinent était relu par un autre membre, avec grille explicite (*l’action est-elle journalisée ? la vitrine réactualisée ? la Timeline affiche‑t‑elle le checkpoint ?*).
- **Boucle extérieure (marchands).** Pendant les sessions pilotes rassemblant deux véritables marchands Vitrina et trois camarades jouant marchands **simulés**, nous avons chronométré le temps passé sur chaque interaction.

### 7.2 Tests bêta avec de véritables boutiques

Deux marchands Vitrina — tous deux exploitant une boutique de vêtements sur Instagram et Vitrina — ont convenu d’utiliser gratuitement le Seller Helper pendant deux semaines en contrepartie du support gratuit. La fréquentation modérée (environ **150–300** sessions par jour) a fourni un terrain de test **avec peu de données** mais représentatif.

Deux enseignements structurels :

- *« Je ne veux pas réfléchir moi‑même. »* La première utilisatrice a refusé d’utiliser l’onglet Vitrina jusqu’à l’ajout d’un **badge de score d’opportunité** classant explicitement les produits. Une fois le badge en place, elle a appliqué son premier correctif **en moins de trois minutes**.
- *« Montre‑moi le passé. »* La seconde voulait des checkpoints Timeline **facilement activables depuis son téléphone**, ce qui nous a obligé‑e·s à augmenter les **cibles tactiles**.

### 7.3 Sessions d’ergonomie

Trois sessions d’ergonomie d’une durée **de 45 minutes chacune** ont été réalisées avec des camarades jouant le rôle de petits marchands. Chaque session suivait le même protocole :

1. Ouvrir le Seller Helper.
2. Identifier le produit ayant **le plus sous-performé** durant la semaine simulée.
3. Appliquer un correctif rapide.
4. Vérifier sur Timeline.

Le temps médian pour parcourir le scénario est passé d’**environ douze minutes** lors de la première session à **4 minutes 12 secondes** lors de la troisième ; le temps restant était surtout consacré à la **lecture** des recommandations plutôt qu’aux hésitations dans l’interface.

### 7.4 Matrice de validation par rapport aux exigences fonctionnelles

Chaque exigence formulée dans la section 3.1 a été associée à un scénario de validation ; leur synthèse figure dans le tableau 7.1.

| Req      | Scénario de validation                                       | Statut |
| -------- | ------------------------------------------------------------ | ------ |
| F1, F2   | Accès `/seller-helper` pour visiteur·se anonyme, compte utilisateur sans rôle administrateur et compte administrateur | Réussi |
| F3       | Lecture de l’onglet Tableau sur trafic simulé 24 h            | Réussi |
| F4, F5   | Tracer vues + paniers + achats sur Timeline 7 j avec checkpoints | Réussi |
| F6       | Cliquer un checkpoint Vitrina et afficher ses détails         | Réussi |
| F7       | Inspecter la carte de chaleur pour un produit peu convertissant | Réussi |
| F8       | Suivre l’entonnoir sur données 7 j simulées                   | Réussi |
| F9, F10  | Appliquer **chacun** des six correctifs rapides               | Réussi |
| F11, F12 | Pour les reco IA : Appliquer, Ignorer (*Dismiss*) et suppression globale | Réussi |
| F13      | Résoudre une alerte active                                    | Réussi |
| F14      | Bloquer puis débloquer une session                             | Réussi |
| F15      | Consulter dans le journal la ligne de **chaque** action       | Réussi |

_Tableau 7.1 — Matrice de validation._

### 7.5 Anomalies découvertes et corrigées

- Sélecteur produit Timeline : duplication logique quand plusieurs alias coexistants → dé‑doublonnage par identifiant produit storefront.
- « Citation avis » pouvait générer guillemets vides : refuser snippet absent.
- Petit écran : bouton Apply glissait sous ligne de flottaison ; flex plus compact rétablit visibilité.
- Division zéro vues ⇒ taux = « pas un nombre » (**NaN**) → **maintenant 0.**

### 7.6 Métriques de test (*benchmark*, environnement local)

L’environnement local utilisé pour ces mesures était un MacBook Air M1 avec PostgreSQL 15 et dix mille évènements simulés.
| Métrique                                                          | Valeur |
| ----------------------------------------------------------------- | ------ |
| Premier affichage Tableau (cache froid)                            | 740 ms |
| Premier affichage Tableau (cache chaud)                            | 180 ms |
| Agrégats Timeline 24 h                                          | 65 ms  |
| Agrégats Timeline 90 j                                            | 110 ms |
| Recommandations Vitrina (7 j, 500 produits)                        | 320 ms |
| Correctif rapide + réactualisation                                 | 240 ms |
| Enchaînement de 50 correctifs consécutifs                          | 12,4 s |
| `tsc --noEmit` sur l’ensemble du dépôt                               | 43 s   |


---
