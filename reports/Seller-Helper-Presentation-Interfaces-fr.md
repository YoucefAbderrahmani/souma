# Guide de présentation — Interfaces du Seller Helper

**Vitrina Store · Module Seller Helper**

Document pour la soutenance : pour **chaque interface**, ce qu’elle montre, ce qu’il faut expliquer, et **un script oral en français** (ce que vous pouvez dire mot pour mot ou en vous adaptant).

**Accès :** page `/seller-helper` (admin connecté) ou panneau admin « E-Commerce Intelligence ».

---

## Avant de commencer — message d’ouverture (30 secondes)

**Ce que vous devez dire :**

> « Le Seller Helper est le tableau de bord du vendeur sur Vitrina Store. Il ne se contente pas d’afficher des statistiques : il collecte le comportement réel des acheteurs sur la boutique, détecte les problèmes, propose des actions — y compris des corrections en un clic sur le catalogue — et permet de mesurer l’effet dans le temps. Tout repose sur des micro-événements enregistrés dans notre base PostgreSQL, pas sur un Google Analytics externe. »

**Ordre de démo recommandé :** Dashboard → Funnel → Behavior → Vitrina (quick fix) → Analyze → AI → Timeline → Alerts → Security → Inbox.

**Durée indicative :** 12 à 18 minutes pour les 9 onglets + bandeau.

---

## Bandeau global (toujours visible en haut)

### Éléments à montrer

- Logo **Seller Helper** / « E-Commerce Intelligence » en admin.
- Indicateur **Live data** (point vert) ou **Waiting for data** (gris).
- **Sessions actives** — nombre de sessions sur les **15 dernières minutes**.
- Boutons **Refresh**, **Analyze now**, lien **Open admin** (version standalone).

### Ce qu’il faut expliquer

- Les données se **rafraîchissent automatiquement** (toutes les 5 s sur `/seller-helper`, 60 s en embed admin).
- **Live data** = au moins des micro-événements `pa_*` ont été reçus récemment.
- **Analyze now** lance le moteur d’analyse : alertes par règles, recommandations IA, régénération Vitrina.

### Script oral — bandeau

> « En haut, on voit si la boutique envoie bien des données en temps réel. Le compteur de sessions sur 15 minutes donne une idée du trafic actuel. Le bouton “Analyze now” déclenche l’analyse complète : alertes automatiques, recommandations IA, et mise à jour des cartes Vitrina. “Refresh” recharge les chiffres sans relancer l’analyse. »

### Si le jury demande

- **« D’où viennent les données ? »** — Du navigateur acheteur, via `POST /api/sales-analyst/events`, stockées dans `sales_micro_event`.

---

## 1. Dashboard (Overview)

### Rôle de l’interface

Vue **synthétique** : santé de la boutique sur 7 jours / 24 h — KPIs, trafic horaire, appareils, pages les plus performantes.

### Éléments à montrer

1. **Cartes KPI** — libellé, valeur, delta « vs previous period » (vert = positif, rouge = négatif).
2. **Traffic & Sales (24h)** — graphique en barres (activité normalisée par heure).
3. **Devices** — barres mobile / desktop / tablette (depuis `pa_global_context`).
4. **Top Performing Pages** — tableau : Page, Views, Conversions, Rate %.

### Ce qu’il faut expliquer

- C’est la **porte d’entrée** du vendeur : « Est-ce que ma boutique va bien ? »
- Les KPIs sont calculés côté serveur à partir des micro-événements (pas de chiffres inventés).
- Le tableau des pages aide à voir quelles URLs convertissent le mieux.

### Script oral — Dashboard

> « Le premier onglet, Dashboard, résume l’activité du magasin. Les cartes en haut montrent les indicateurs clés sur la période récente, avec la variation par rapport à la période précédente. Le graphique “Traffic & Sales” sur 24 heures permet de repérer les heures de pic. La partie “Devices” montre si nos acheteurs sont surtout sur mobile ou desktop — important pour adapter le merchandising. En bas, “Top Performing Pages” classe les pages par vues et taux de conversion : on voit tout de suite quelles pages méritent une optimisation. »

### Transition

> « Une fois qu’on a la vue globale, on descend dans le tunnel d’achat avec l’onglet Conversion Funnel. »

### Questions jury possibles

| Question | Réponse courte |
|----------|----------------|
| Période des KPIs ? | Principalement 7 jours ; trafic 24 h pour le graphique horaire. |
| Que compte une « conversion » ici ? | Événement `pa_purchase` (achat confirmé) par rapport aux vues produit. |

---

## 2. Conversion Funnel (Funnel)

### Rôle de l’interface

Visualiser **où les acheteurs abandonnent** entre la fiche produit et le paiement.

### Éléments à montrer

1. **Étapes du funnel** — barres de progression avec :
   - nombre à l’étape ;
   - % depuis l’étape précédente ;
   - % depuis le début du funnel ;
   - libellé d’**abandon** si pertinent.
2. **Cartes résumé** (3 colonnes) — synthèse chiffrée.
3. **Detected Friction Points** — cartes priorité (critical / high / medium) avec titre, constat, recommandation.

### Ce qu’il faut expliquer

- Étapes typiques : **Vue produit** → **Ajout panier** → **Checkout** → **Achat**.
- Chaque baisse forte entre deux étapes = **point de friction** à traiter.
- Les cartes en bas proposent déjà une **piste d’action** (merchandising, formulaire, mobile…).

### Script oral — Conversion Funnel

> « L’onglet Conversion Funnel répond à la question : où perd-on les clients ? Chaque étape correspond à un événement réel sur la boutique — vue produit, ajout au panier, début de checkout, achat. Les pourcentages entre étapes montrent les fuites du tunnel. Les cartes “Friction Points” priorisent les problèmes détectés automatiquement, par exemple un faible passage produit → panier ou panier → checkout. Le vendeur sait ainsi sur quoi agir en priorité, que ce soit via Vitrina pour le catalogue ou via les recommandations IA pour le parcours. »

### Transition

> « Pour comprendre *comment* les utilisateurs se comportent sur la page, on ouvre User Behavior. »

### Questions jury possibles

| Question | Réponse courte |
|----------|----------------|
| Différence avec Dashboard ? | Dashboard = vue macro ; Funnel = séquence d’achat et abandons. |
| Données vides ? | Peu de trafic ou tracking désactivé — simuler avec les scripts de démo. |

---

## 3. User Behavior (Behavior)

### Rôle de l’interface

Comportement **qualitatif** : heatmap, sources de trafic, scroll, aperçu des sessions.

### Éléments à montrer

1. **Heatmap par bandes de scroll** — intensité 0–100 % sur la hauteur de page (événements `pa_scroll`).
2. **Heatmap produit détaillée** — sélecteur produit, métrique hover/click (`pa_pointer_*`) via `ProductPageHeatmap`.
3. **Sources de trafic** — referrer / contexte global.
4. **Session replays** — liste de sessions ; modal avec durée, appareil, statut ; liens vers funnel (pas de vidéo enregistrée).

### Ce qu’il faut expliquer

- On ne filme pas l’écran : on reconstruit l’intérêt via **positions de clic/survol** et **profondeur de scroll**.
- Utile pour placer le CTA, les avis, ou la galerie images sur mobile.
- Complète le funnel : le funnel dit *où* on perd ; le behavior dit *où sur la page* on regarde.

### Script oral — User Behavior

> « L’onglet User Behavior complète le funnel avec le détail du comportement sur la page. La heatmap de scroll montre jusqu’où les visiteurs descendent — si personne ne passe 50 %, le prix ou le bouton panier est peut-être trop bas. On peut aussi ouvrir une heatmap par produit basée sur les clics et survols de la souris ou du doigt. Les sources de trafic indiquent d’où viennent les visites. La section sessions donne un aperçu des parcours récents : ce n’est pas un enregistrement vidéo Hotjar, mais une synthèse issue de nos micro-événements, ce qui respecte mieux la confidentialité et reste intégré à notre base. »

### Transition

> « Quand on sait quel produit poser problème, l’onglet Vitrina propose des corrections concrètes sur le catalogue. »

### Questions jury possibles

| Question | Réponse courte |
|----------|----------------|
| Hotjar ? | Non — heatmap maison à partir de `pa_pointer_*` et `pa_scroll`. |
| Précision heatmap ? | Dépend du volume d’événements sur le produit choisi. |

---

## 4. Vitrina Recommendation (Vitrina)

### Rôle de l’interface

Recommandations **merchandising par produit** : conseils + **quick fixes** applicables en un clic (modification réelle en base).

### Éléments à montrer

1. **Carrousel / cartes produit** — image, titre, prix, score d’opportunité, bandeau priorité.
2. **Tips** — libellés (Prix, Couleur par défaut, Promo, Avis, Stock…).
3. **Quick fix** — bouton d’application avec modale de confirmation.
4. **Filtres** — recherche, tri (opportunity, interaction, priority), nombre de fixes par produit.
5. **Actions globales** — Clear all, Reset catalog defaults ; par carte : **Delete data**, édition manuelle.

### Ce qu’il faut expliquer (important pour le jury)

- **Ce n’est pas du texte IA générique** : règles sur les stats 7 j (`pa_select_option`, vues, paniers…).
- Exemple phare : **couleur par défaut** si les acheteurs cliquent souvent une couleur mais n’achètent pas — le quick fix réordonne les variantes sur la fiche produit.
- Après application : revalidation du storefront + entrée dans la **Timeline**.

### Script oral — Vitrina (à répéter clairement)

> « Vitrina est le cœur actionnable du projet. Pour chaque produit du catalogue, le système analyse les signaux des sept derniers jours : vues, clics, choix de couleur ou de taille, ajouts au panier. Il génère des conseils priorisés — par exemple “mettre en avant la couleur la plus sélectionnée” ou “renforcer la promo”. La différence avec un simple rapport, c’est le bouton Quick fix : en un clic, on applique la modification sur le produit en base de données — prix promo, couleur par défaut, extrait d’avis, note de disponibilité — et la boutique publique est mise à jour. Ce n’est pas une suggestion ChatGPT : ce sont des règles déterministes, reproductibles, que je peux expliquer au jury. Le bouton “Delete data” sur une carte permet de repartir de zéro sur les statistiques d’un produit après des tests. »

### Démo à faire en live (si possible)

1. Ouvrir un produit avec tip **couleur** ou **promo**.
2. Cliquer **Apply quick fix** → confirmer.
3. Dire : « L’action est journalisée ; on la verra sur la Timeline. »

### Transition

> « Pour les recommandations plus globales et rédigées par l’IA, on passe à AI Recommendations après avoir cliqué Analyze. »

### Questions jury possibles

| Question | Réponse courte |
|----------|----------------|
| L’IA génère Vitrina ? | **Non** — règles SQL + heuristiques ; LLM pour l’onglet AI seulement. |
| Quick fix dangereux ? | Modale de confirmation ; admin seulement ; revert possible via Timeline. |

---

## 5. AI Recommendations (AI)

### Rôle de l’interface

Recommandations **textuelles priorisées**, issues de l’analyse (règles + **LLM** OpenRouter / Gemini).

### Éléments à montrer

1. Cartes **AiRecommendationCard** — priorité, impact estimé, analyse, recommandation, confiance %, délai de mise en œuvre.
2. Boutons — **Dismiss**, **Send to role** (e-mail), lien vers section d’implémentation.
3. **Clear all** — vider les recommandations actives.

### Ce qu’il faut expliquer

- Nécessite d’abord **Analyze now** (ou analyse déjà faite).
- Le LLM **complète** les chiffres ; il ne remplace pas Vitrina pour le catalogue.
- **Send to role** envoie un e-mail Brevo au marketing / logistique → recommandation part en **Inbox**.

### Script oral — AI Recommendations

> « L’onglet AI Recommendations affiche les actions prioritaires produites par le moteur d’analyse. Une partie vient de règles fixes — par exemple si trop peu de visiteurs passent du panier au checkout. Une partie vient du modèle de langage, nourri avec nos vrais chiffres et un extrait du catalogue, pour rédiger une analyse compréhensible en français. Chaque carte indique la priorité, l’impact estimé et un niveau de confiance. Le vendeur peut écarter une carte, ou l’envoyer par e-mail à un rôle — marketing ou logistique — ce qui alimente l’onglet Inbox pour le suivi d’équipe. Je précise : l’IA propose et explique ; les modifications catalogue passent surtout par Vitrina en quick fix. »

### Transition

> « Quand une recommandation est envoyée par mail, elle est suivie dans l’Inbox. »

### Questions jury possibles

| Question | Réponse courte |
|----------|----------------|
| Sans clé API ? | Alertes règles + baseline + Vitrina fonctionnent ; texte IA réduit. |
| Hallucinations ? | Prompt avec signaux chiffrés ; fallback baseline si échec LLM. |

---

## 6. Inbox

### Rôle de l’interface

**Suivi des recommandations envoyées par e-mail** — workflow équipe.

### Éléments à montrer

1. Liste filtrable par **rôle** (marketing, logistics, etc.).
2. Statut — à traiter / implémenté / dismiss.
3. Actions — **Mark implemented**, **Dismiss**.

### Ce qu’il faut expliquer

- Séparation : **décision dans l’app**, **notification par e-mail** pour les personnes qui ne sont pas connectées à l’admin.
- Fermeture de la boucle organisationnelle, pas seulement technique.

### Script oral — Inbox

> « L’Inbox est le tableau de suivi après envoi d’une recommandation IA par e-mail. Par exemple, une action “réapprovisionner tel produit” part au responsable logistique. Il reçoit le mail via Brevo, et dans l’application on garde la trace : la carte apparaît ici jusqu’à ce qu’on la marque comme implémentée ou qu’on la rejette. Cela montre que le Seller Helper s’adresse aussi à une petite équipe, pas uniquement au vendeur seul devant l’écran. »

### Transition

> « Pour voir l’effet des actions dans le temps, on utilise la Timeline. »

### Questions jury possibles

| Question | Réponse courte |
|----------|----------------|
| Configuration e-mails ? | Admin : mapping rôles → adresses (`recommendation_role_email`). |
| Envoi auto ? | Non par défaut ; manuel depuis la carte ou variable `BREVO_AUTO_SEND_ON_ANALYZE`. |

---

## 7. Timeline

### Rôle de l’interface

**Évolution temporelle** des métriques + **repères** des actions appliquées (quick fix, alerte, sécurité…) + **impact conversion**.

### Éléments à montrer

1. Sélecteurs — plage **24h / 7j / 30j / 90j**, scope **boutique / produit**, métriques (vues, paniers, achats, taux conversion).
2. **Graphique** multi-séries avec marqueurs d’actions.
3. **Timeline logs** — liste des actions ; modale détail avec impact avant/après.
4. Actions — **Revert**, **Reset default**, **Request revert email**.

### Ce qu’il faut expliquer

- Chaque quick fix Vitrina laisse un **marqueur** daté.
- **Impact** = comparaison fenêtres égale avant/après : taux achat / vues produit.
- Honnêteté : il faut **du trafic et du temps** pour un impact significatif.

### Script oral — Timeline

> « La Timeline répond à la question du jury : “Comment savez-vous que votre quick fix a servi à quelque chose ?” On choisit la période et éventuellement un produit. Le graphique montre les vues, les ajouts panier, les achats et le taux de conversion. Chaque action du vendeur — quick fix Vitrina, blocage sécurité, résolution d’alerte — apparaît comme un repère sur la courbe. En ouvrant le détail, on compare la conversion avant et après l’action, sur une fenêtre de même durée. C’est la preuve de la boucle observer → agir → mesurer, au cœur de notre contribution. »

### Démo

- Montrer un marqueur après un quick fix fait plus tôt dans la démo.

### Transition

> « Les incidents automatiques remontent dans l’onglet Alerts. »

### Questions jury possibles

| Question | Réponse courte |
|----------|----------------|
| Impact après 10 min ? | Indicateur indicatif ; minimum ~15 min ; plus fiable après quelques heures. |
| Causalité ? | Corrélation avant/après, pas preuve A/B scientifique — à assumer clairement. |

---

## 8. Security

### Rôle de l’interface

Surveillance **sessions suspectes** (bots, scraping), erreurs JS, graphique d’activité menaces.

### Éléments à montrer

1. **KPIs sécurité** — sessions suspectes, erreurs, etc.
2. **Threat activity chart** — activité 24 h.
3. **Cartes incidents** — quick fix **Block session** / **Unblock**.
4. **Table sessions bloquées** — **Clear all blocks**.

### Ce qu’il faut expliquer

- Session bloquée = **plus aucun événement** enregistré pour cette session (intégrité des stats).
- Détection heuristique (volume `pa_product_view`, `pa_js_error`), pas IA.
- Script de démo : `npm run db:trigger-security-alerts`.

### Script oral — Security

> « L’onglet Security protège la qualité des données analytics. Si une session envoie un volume anormal de vues produit — typique d’un bot ou d’un scraper — ou si trop de sessions au checkout ont des erreurs JavaScript, une alerte remonte ici. Le vendeur peut bloquer une session : dès lors, ses événements ne polluent plus le funnel ni Vitrina. On voit aussi l’historique des sessions bloquées et on peut tout débloquer. C’est important pour un petit site : quelques bots peuvent fausser les recommandations merchandising. »

### Transition

> « Les alertes métier plus larges — chute de conversion, pic de trafic — sont dans l’onglet Alerts. »

### Questions jury possibles

| Question | Réponse courte |
|----------|----------------|
| Blocage par IP ? | Par **session_key**, pas par IP. |
| RGPD ? | Pas de vidéo ; session pseudonyme ; à coupler avec politique cookies du site. |

---

## 9. Alerts

### Rôle de l’interface

**Incidents actifs** et **alertes résolues** ; réglage des **seuils** ; analyse détaillée par alerte.

### Éléments à montrer

1. Liste alertes **actives** — type, sévérité, titre, description, dismiss.
2. Historique **résolues**.
3. **Alert rule settings** (engrenage) — 5 types : Conversion drop, Traffic spike, Cart abandon, JS errors, Performance.
4. **Detail analysis** — modal POST `/alerts/detail` (analyse rule-based).

### Ce qu’il faut expliquer

| Type | Signification oral |
|------|-------------------|
| CONVERSION_DROP | Taux d’achat bien plus bas que la référence 7 j |
| TRAFFIC_SPIKE | Pic d’événements en 15 min (bot ou campagne) |
| CART_ABANDON_MASS | Beaucoup de paniers, peu d’achats sur 2 h |
| JS_ERROR_BURST | Trop de `pa_js_error` sur sessions checkout |
| PERF_SLOW | LCP ou chargement > 4 s sur plusieurs sessions |

- Fingerprints évitent les doublons jour/heure.
- Dismiss = alerte traitée sans supprimer les données brutes.

### Script oral — Alerts

> « L’onglet Alerts centralise les incidents détectés automatiquement. Par exemple “chute de conversion” compare le taux actuel à la moyenne des sept derniers jours. “Pic de trafic anormal” peut signaler une campagne — ou un bot. “Abandon massif du panier” aide à réagir sur le checkout. Les erreurs JavaScript et la performance lente sont aussi surveillées. Le vendeur peut ajuster les seuils dans les paramètres des règles, ouvrir une analyse détaillée, puis marquer l’alerte comme traitée. Les alertes résolues restent visibles pour l’historique. C’est la couche “surveillance” du magasin, en complément de Vitrina qui agit produit par produit. »

### Clôture de la démo Seller Helper

> « En résumé : le Dashboard et le Funnel observent, User Behavior précise le geste utilisateur, Vitrina et les quick fixes agissent sur le catalogue, l’IA et l’Inbox coordonnent l’équipe, la Timeline mesure, Security et Alerts protègent la fiabilité des données. Tout est alimenté par nos micro-événements `pa_*` dans PostgreSQL — c’est l’originalité de notre solution par rapport à un simple plugin analytics. »

---

## Annexe A — Tableau récapitulatif (antisèche)

| Onglet | Une phrase | Mot-clé à dire au jury |
|--------|------------|-------------------------|
| Dashboard | Vue globale KPI + trafic + pages | « Santé du magasin » |
| Conversion Funnel | Tunnel produit → achat | « Où on perd les clients » |
| User Behavior | Heatmap, scroll, sources | « Comment ils utilisent la page » |
| Vitrina | Quick fixes catalogue | « Action en un clic, règles + données » |
| AI Recommendations | Texte IA + priorités | « Synthèse intelligente, pas le catalogue » |
| Inbox | Suivi e-mails équipe | « Workflow humain » |
| Timeline | Courbes + impact | « Preuve mesurer l’effet » |
| Security | Bots, erreurs JS | « Qualité des données » |
| Alerts | 5 règles automatiques | « Surveillance proactive » |

---

## Annexe B — Phrases utiles si problème en démo

| Situation | Ce que dire |
|-----------|-------------|
| « Waiting for data » | « La boutique n’a pas encore envoyé d’événements ; je peux lancer le script de simulation de trafic. » |
| Erreur base / quota | « La connexion Neon est limitée ; en conditions normales les chiffres se chargent depuis `sales_micro_event`. » |
| Liste Vitrina vide | « Il faut du trafic produit sur 7 jours ; je relance Analyze ou la simulation. » |
| Pas de recommandation IA | « Sans clé OpenRouter/Gemini, les règles et Vitrina restent actives — c’est voulu en dégradation gracieuse. » |

---

## Annexe C — Durée par onglet (présentation 15 min)

| Onglet | Minutes |
|--------|---------|
| Intro + bandeau | 1 |
| Dashboard | 1,5 |
| Funnel | 2 |
| Behavior | 1,5 |
| Vitrina + quick fix | 3 |
| AI + Analyze | 2 |
| Timeline | 2 |
| Alerts + Security | 1,5 |
| Inbox | 0,5 |

---

*Régénération PDF : `npm run report:seller-helper-presentation-interfaces-fr:pdf`*
