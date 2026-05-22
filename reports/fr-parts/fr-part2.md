## Chapitre 3 — Analyse des besoins

### 3.1 Exigences fonctionnelles

Le Seller Helper doit satisfaire aux exigences fonctionnelles suivantes. Elles sont organisées en **six familles fonctionnelles**.

**Thème A — Accès et vue d’ensemble.**

- **F1.** Authentifier le marchand et n’autoriser que les utilisateurs administrateurs.
- **F2.** Fournir une page unique (`/seller-helper`) d’où tout élément lisible et toute action sont accessibles.
- **F3.** Afficher un onglet Tableau de bord avec des KPI en temps réel (visiteurs, sessions par tranche de 15 minutes, panier moyen, chiffre d’affaires), un graphique du trafic sur 24 h, un panneau de répartition par appareil et les pages les plus performantes.

**Thème B — Timeline et audit.**

- **F4.** Tracer chacune des cinq métriques canoniques (vues, sessions uniques, ajouts au panier, achats, taux de conversion) sur quatre plages temporelles (24 h, 7 j, 30 j, 90 j), pour l’ensemble de la boutique ou pour un produit individuel.
- **F5.** Représenter chaque action appliquée sur la plage sélectionnée comme point de passage (*checkpoint*), codé couleur selon son type.
- **F6.** Ouvrir une fenêtre détaillée lorsque la marchande ou le marchand clique sur un checkpoint, présentant le titre, l’horodatage, le résumé, les données structurées et un lien raccourci vers la page produit le cas échéant.

**Thème C — Comportement et entonnoir.**

- **F7.** Rendre une carte de chaleur du défilement sur la page produit, un résumé du parcours client et une carte de chaleur interactive de la page produit avec superposition des densités de survol et de clic.
- **F8.** Rendre les quatre étapes canoniques de l’entonnoir (vue produit → panier → paiement → encaissement) avec ratios inter-étapes, pourcentages de conversion globaux, ratios d’abandon et points de friction détectés.

**Thème D — Merchandising Vitrina.**

- **F9.** Lister les produits candidats classés selon un score d’opportunité, chacun assorti d’une recommandation principale, d’une liste de conseils et de jusqu’à quatre boutons de correctifs rapides.
- **F10.** Proposer six correctifs rapides : `default_color`, `promo_price`, `availability_note`, `quality_highlight`, `trending_countdown`, `hero_review_snippet`. Chacun doit modifier le catalogue, consigner une action appliquée dans le journal et rafraîchir immédiatement la vitrine.

**Thème E — Recommandations IA et alertes.**

- **F11.** Charger des recommandations produites par un LLM avec actions *Apply* (/ *Appliquer*) et *Dismiss* (/ *Ignorer*) ligne par ligne, plus une fonction *Clear all* (/ *Tout effacer*).
- **F12.** Fournir une action *Analyze now* (/ *Analyser maintenant*) déclenchant un nouveau cycle d’analyse.
- **F13.** Afficher les alertes actives produites par un moteur de règles déterministes (conversion en baisse, trafic anormal, abandon de panier, erreurs JS, performance) et permettre à la marchande ou au marchand de les résoudre en un clic ; conserver l’historique des alertes résolues.

**Thème F — Sécurité.**

- **F14.** Lister les sessions suspectes avec code tonalité gravité « risque », « attention » ou « orientation », et permettre blocage / déblocage en deux clics ; afficher un graphique d’activité menaçante dans le temps.
- **F15.** Auditer **chaque** mutation réalisée par le Seller Helper comme une ligne dans le journal des actions appliquées.

### 3.2 Exigences non fonctionnelles

- **NF1. Sécurité.** Chaque endpoint du Seller Helper doit exiger un administrateur authentifié ; chaque écriture doit être validée contre un schéma strict.
- **NF2. Confidentialité.** Aucune donnée nominative : aucune donnée personnelle au-delà d’une clé de session anonymisée n’est nécessaire pour alimenter un onglet ; un identifiant utilisateur authentifié n’est conservé que s’il est présent lors de l’évènement.
- **NF3. Performance.** Chaque agrégation doit répondre en quelques centaines de millisecondes. Le tableau de bord doit s’afficher en **moins d’une seconde** avec cache froid.
- **NF4. Résilience.** L’absence de tables facultatives ne doit pas casser la page ; des scripts d’assistant doivent pouvoir les créer à la demande.
- **NF5. Maintenabilité.** Tous les composants du Seller Helper doivent partager un même module de jetons de mise en page afin de centraliser les changements visuels.
- **NF6. Auditabilité.** L’onglet Timeline doit être la source de vérité unique pour la question : « que s’est-il passé cette semaine dans cette boutique ? ».
- **NF7. Évolutivité.** Le modèle de données doit permettre une évolution multi-locataire (*multi-tenant*).
- **NF8. UX / UI.** Le tableau de bord doit suivre un langage de conception homogène et une palette de couleurs cohérente entre les onglets.
- **NF9. Accessibilité.** Chaque élément interactif doit être atteignable au clavier ; la couleur ne doit pas être la seule porteuse d’un statut ; infobulles et interactions au survol doivent avoir un équivalent textuel.
- **NF10. Langue.** La surface doit pouvoir être présentée **en français** pour le public marchand local ; quelques étiquettes techniques peuvent demeurer en anglais pour le public développeurs.

### 3.3 Acteurs du système

Quatre acteurs entrent en interaction avec le Seller Helper — deux principaux et deux secondaires.

- **La marchande ou le marchand (admin).** Utilisateur principal. Dispose du rôle administrateur et est la **seule** personne autorisée à appliquer les correctifs rapides, les blocages de sécurité et les résolutions d’alerte.
- **Le visiteur de la vitrine.** N’a pas accès au Seller Helper directement ; il ou elle émet les évènements comportementaux qui alimentent chaque panneau. Son identité est anonymisée.
- **Le service de recommandation.** Un LLM borné qui reçoit un instantané par produit et renvoie une courte liste de conseils de merchandising.
- **Les processus d’arrière-plan.** Travaux façon cron qui ré-agrègent les vues synthétiques, rafraîchissent le cache et prennent des instantanés de KPI.

### 3.4 Cas d’usage et scénarios

#### 3.4.1 Table synthétique des cas d’usage

Nous retenons dix cas d’usage représentatifs (tableau 3.1).

| CU   | Acteur                         | Cas d’usage                                      |
| ---- | ------------------------------ | ------------------------------------------------ |
| UC1  | Marchand                       | S’authentifier                                   |
| UC2  | Marchand                       | Lire la vue synthétique de la boutique           |
| UC3  | Marchand                       | Tracer les métriques sur la Timeline             |
| UC4  | Marchand                       | Ouvrir le détail d’une action appliquée          |
| UC5  | Marchand                       | Consulter les recommandations Vitrina par produit |
| UC6  | Marchand                       | Appliquer un correctif rapide                    |
| UC7  | Marchand                       | Déclencher « Analyze now » (/ Analyser maintenant) |
| UC8  | Marchand                       | Résoudre une alerte active                       |
| UC9  | Marchand                       | Bloquer / débloquer une session suspecte         |
| UC10 | Visiteur ou visiteuse vitrine | Émettre des évènements comportementaux           |

_Tableau 3.1 — Cas d’usage du Seller Helper._

#### 3.4.2 Diagramme de cas d’usage

```
                                +----------------------------+
                                |        Seller Helper       |
                                +----------------------------+
                                |                            |
   +---------+   UC1            |     UC2 read overview      |
   |         |----------------->|     UC3 plot timeline      |
   |         |                  |     UC4 open action details|
   |         |                  |     UC5 read Vitrina       |
   | Seller  |----------------->|     UC6 apply quick fix    |
   | (admin) |                  |     UC7 analyze now        |
   |         |----------------->|     UC8 resolve alert      |
   |         |                  |     UC9 block / unblock    |
   +---------+                  |                            |
                                |                            |
   +---------+   UC10           |   behavioural events       |
   | Visitor |----------------->|   feed every panel         |
   +---------+                  +----------------------------+
```

_Figure 3.1 — Diagramme de cas d’usage du Seller Helper._

#### 3.4.3 Scénario — « Sauver mon samedi matin » (UC2, UC3, UC8, UC6)

Nous sommes samedi, 09h15. Yasmine ouvre le Seller Helper. Le tableau de bord affiche quatre KPI et montre une baisse de **12 %** des visiteurs par rapport au samedi précédent. Le badge d’état indique *Live data · auto-refresh* (/ données live · rafraîchissement auto).

Elle ouvre l’onglet Alertes. La première ligne est une alerte active *Cart abandonment ↑* (/ abandon panier en hausse). Elle lit « *Taux d’abandon panier au-dessus de 80 % sur les deux dernières heures* », plus une courte explication générée par LLM mentionnant un problème probable sur un produit récemment publié. Elle clique *Resolve* (/ *Régler*) ; la ligne passe sous *Recently resolved* (/ *Récemment résolu*) et un checkpoint violet apparaît sur l’onglet Timeline.

Elle passe sur Timeline, sélectionne *last 24 hours* (/ les dernières 24 h) et zoome sur le produit suspect. Le checkpoint créé lors de la résolution est visible. Elle le sélectionne, lit le détail, puis ouvre l’onglet Vitrina. Le produit en tête de liste propose la recommandation principale : *Promote the colour the visitors actually select.* (/ *Mettre en avant la couleur que les visiteurs sélectionnent réellement.*)

Elle clique le correctif *Default colour* (/ couleur par défaut), confirme dans la modale, puis reprend son téléphone. Vingt minutes plus tard, le lot suivant d’achats fait monter le taux de conversion d’**1,2 point** — visible sur **le même graphique Timeline**.

#### 3.4.4 Scénario — « Je me méfie de cette session » (UC9)

Un pic de trafic apparaît sur le tableau de bord à 14h00. Yasmine ouvre l’onglet Sécurité. Le graphe d’activité malveillante montre une bosse nette ; dans la liste d’incidents figure une ligne *risk* (/ risque) avec une clé de session. Elle clique *Block* (/ Bloquer), valide dans la modale ; la session est ajoutée à la liste noire (*blocklist*) et la vitrine la rejette immédiatement. Un checkpoint rouge apparaît sur la Timeline pour conserver une trace après coup.

#### 3.4.5 Scénario — « Brief IA du lundi matin » (UC7, UC8)

Le lundi matin, Yasmine clique *Analyze now*. Après quelques secondes, trois nouvelles recommandations IA s’affichent dans l’onglet IA :

1. *Reorganise the price visibility of "abaya rouge".*
2. *Add a quality highlight to "robe blanche".*
3. *Investigate a sudden mobile drop-off on the shipping screen.*

Elle applique les deux premières en ouvrant les fiches Vitrina correspondantes ; elle laisse la troisième à son équipe. Deux jours plus tard elle ouvre la Timeline avec une fenêtre **7 j** et voit deux checkpoints de ces actions alignés avec les métriques qu’elles visaient à faire bouger.

---

## Chapitre 4 — Conception du système

### 4.1 Principes de conception

Quatre principes de conception orientent chaque décision dans le Seller Helper.

- **Action d’abord.** Chaque écran doit répondre à la question *« que dois-je faire ? »* avant *« qu’est-ce qui s’est passé ? »*. Chaque métrique affichée doit, à terme, amener une action que la marchande ou le marchand peut entreprendre **sur la même surface**.

- **Boucle d’audit fermée.** Chaque action réalisée dans le Seller Helper est enregistrée comme ligne dans un journal d’audit et rejouée sur la Timeline comme checkpoint. Le tableau de bord n’est donc pas un *rapport* : c’est un *outil doté de mémoire*.

- **Classement par importance.** Recommandations et points de friction sont classés selon leur *importance*, et non seulement selon la proéminence visuelle. La marchande ou le marchand lit de haut en bas et s’arrête lorsqu’elle juge en avoir assez fait.

- **Intelligence bornée.** Les recommandations s’appuient sur une télémétrie réelle. Lorsque les données sont clairsemées, la recommandation doit abaisser son niveau de confiance et s’abstenir d’inventer.

### 4.2 Architecture fonctionnelle

Du point de vue de la marchande ou du marchand, le Seller Helper est **une page** divisée en **huit onglets** (figure 4.1).

```
                +-----------------------------+
                |   Storefront events stream  |
                +--------------+--------------+
                               |
                               v
                +--------------+--------------+
                |     Telemetry layer (DB)    |
                +--------------+--------------+
                               |
                               v
   +---------------------------+----------------------------+
   |                  Seller Helper (admin)                 |
   |  Dashboard | Timeline | Behavior | Funnel | Vitrina |  |
   |  AI         | Alerts  | Security                      |
   +-----+--------------+--------------+--------+----------+
         |              |              |        |
         v              v              v        v
   reads metrics  applied actions  storefront  audit log
   (read-only)   (mutations)      revalidation (Timeline)
```

_Figure 4.1 — Architecture fonctionnelle telle que la voit l’utilisateur._

Les cinq onglets « qui lisent » (Tableau de bord, Timeline, Comportement, Tunnel, liste Vitrina) consomment des vues agrégées des évènements comportementaux. Les trois onglets « qui écrivent » (application Vitrina, résolution d’alertes, blocage Sécurité) renvoient leurs effets vers la vitrine et vers le journal d’audit, lequel réapparaît à son tour sur la Timeline.

### 4.3 Architecture de l’information et navigation

La page Seller Helper suit trois principes.

- **Point d’entrée unique.** Toute lecture et toute action sont accessibles depuis `/seller-helper`.
- **Navigation horizontale.** Huit onglets, avec un libellé court et une description d’une ligne, sont listés en haut de page.
- **En-tête persistant.** Deux boutons restent visibles en haut : *Refresh* (/ *Actualiser*, rechargement des données) et *Analyze now* (/ *Analyser maintenant*, nouveau cycle de recommandation).

À l’intérieur de chaque onglet, la disposition suit une progression *indicateurs clés → graphique → liste → détail*. Les indicateurs sont en cartes colorées en tête ; suivent un graphique ou une visualisation ; puis une liste de fiches (produits, alertes, incidents) ; chaque fiche peut ouvrir un panneau de détail ou une modale.

### 4.4 Schémas conceptuels

#### 4.4.1 Séquence — « Appliquer un correctif rapide »

```
Seller       Dashboard          API           Server        Storefront
  |   click Apply  |              |              |              |
  |--------------->|              |              |              |
  |                | POST apply   |              |              |
  |                |------------->|              |              |
  |                |              |  validate    |              |
  |                |              |------------->|              |
  |                |              |              |  mutate prod |
  |                |              |              |---->         |
  |                |              |              |  log action  |
  |                |              |              |---->         |
  |                |              |              |  revalidate  |
  |                |              |              |------------->|
  |                |              |    200 OK    |              |
  |                |<-------------|              |              |
  |   toast        |              |              |              |
  |<---------------|              |              |              |
```

_Figure 4.2 — Diagramme de séquence pour « Appliquer un correctif rapide »._

#### 4.4.2 Activités — « Lancer une analyse du lundi matin »

```
   (start)
     |
     v
   open Seller Helper -> Dashboard
     |
     v
   click Analyze now
     |
     v
   wait for new recommendations
     |
     v
   open AI tab -> read top 3
     |
     v
   apply each -> Vitrina -> confirm modal
     |
     v
   open Timeline -> 7 d scope -> read checkpoints
     |
     v
   close the page
     |
     v
   (end)
```

_Figure 4.3 — Diagramme d’activités pour un usage typique du lundi matin._

#### 4.4.3 Diagramme d’états — « Une alerte »

```
                          fire
              +---------------------------+
              |                           |
   (idle) ----+-> (active) ---- resolve --+-> (resolved)
              ^                           |
              |       refire (window)     |
              +---------------------------+
```

_Figure 4.4 — Cycle de vie d’une alerte._

### 4.5 Choix UX

Trois choix ergonomiques méritent une attention particulière.

- **Une source de vérité unique : la Timeline.** Chaque action accomplie dans le Seller Helper figure sur **le même graphique** qui affiche la métrique que l’action visait à influencer. La marchande ou le marchand est ainsi incitée à *voir* les conséquences de ses décisions ; nous considérons cet aspect comme le plus pédagogique de la surface.

- **Checkpoints colorés.** Chaque famille d’action appliquée a une couleur propre : orange pour les correctifs Vitrina ; rouge pour les blocages de session ; turquoise (*teal*) pour les déblocages ; violet pour les résolutions d’alertes ; bleu pour les recommandations IA appliquées. En un coup d’œil, on distingue le type d’intervention et le moment.

- **Modales de confirmation.** Toute mutation passe par une modale qui affiche côte à côte la valeur *actuelle* et la valeur *proposée*. Aucune correction n’est appliquée par accident, et la proposition reste lisible pour la personne métier.

---
