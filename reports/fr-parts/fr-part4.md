## Chapitre 8 — Résultats et discussion

### 8.1 Résultats d’adoption

Le Seller Helper a été déployé auprès des deux marchands bêta et des cinq camarades jouant le rôle de marchands sur des boutiques simulées. Après deux semaines d’utilisation, le schéma d’adoption suivant se dessine.

- L’onglet Tableau de bord est ouvert quotidiennement, en moyenne **1 ,4 fois** par jour.
- L’onglet Alertes est ouvert immédiatement après le Tableau de bord dans **environ la moitié** des visites.
- L’onglet Vitrina est ouvert en moyenne **deux fois** par semaine et **chaque visite donne lieu à au moins un correctif appliqué**.
- L’onglet Timeline est ouvert **une fois** par semaine, en général **le même jour** que la visite Vitrina, pour « voir ce qui s’est passé ».
- L’onglet Sécurité n’est ouvert que lorsqu’une alerte mentionne une session suspecte.

Ce schéma est instructif : la personne marchande n’a pas besoin de tout lire **chaque jour** ; elle a besoin d’une **petite surface** qui met en avant **ce qui compte aujourd’hui**. Le Seller Helper soutient exactement cette routine.

### 8.2 Progression mesurée sur les boutiques de test

Sur les deux boutiques de test, l’application d’un `hero_review_snippet` à **quatre** produits à volume moyen a produit en moyenne une hausse de **+1 ,4 point** du taux **vue→panier** sur les **72 heures suivantes**, **sans autre** changement de catalogue. L’application d’un correctif `default_color` sur **trois** produits dont la couleur la plus sélectionnée n’était pas la variante par défaut a produit en moyenne **+0 ,9 point** sur le même intervalle.

Ces chiffres sont encourageants mais doivent être interprétés avec prudence : les boutiques sont petites, les fenêtres courtes, et des facteurs externes (publication virale sur Instagram, panne chez un concurrent) influencent les chiffres quotidiens. Nous revenons sur cette limite à la **section 8.5**.

### 8.3 Retours des marchands

Les retours qualitatifs des marchands bêta se condensent en trois phrases qui résument, selon nous, la proposition de valeur.

- *« Je sais maintenant quoi faire le lundi matin. »*
- *« Les checkpoints sont la raison pour laquelle j’ouvre cette page le vendredi. »*
- *« C’est le premier tableau de bord qui ne me fait pas me sentir stupide. »*

### 8.4 Comparaison avant / après

Le tableau 8.1 oppose l’administration Vitrina seule et le Seller Helper.

| Aspect                          | Avant (administration Vitrina seule) | Après (Seller Helper)                    |
| ------------------------------- | ------------------------------------ | ---------------------------------------- |
| Nombre de pages à consulter     | Au moins **cinq**                    | **Une**                                  |
| Recommandations par produit     | Aucune                               | Onglet Vitrina avec correctifs           |
| Audit des actions               | Aucun                                | Journal + checkpoints sur la Timeline    |
| Alertes                         | Aucune                               | Cinq règles déterministes + détail LLM     |
| Flux Sécurité                   | Aucun                                | Blocage / déblocage en deux clics        |
| Visualisation des actions passées | Aucune                             | Checkpoints sur la Timeline              |
| Délai médian de décision (sessions ergonomiques) | 22 minutes | 4 minutes 12 secondes              |

_Tableau 8.1 — Comparaison avant / après._

### 8.5 Limitations observées

Trois limitations structurelles demeurent dans la version actuelle.

- **Signification statistique.** Les gains mesurés en **section 8.2** reposent sur de petites boutiques et de courtes fenêtres. Une évaluation de niveau scientifique exigerait un cadre A/B que le Seller Helper ne propose pas encore.
- **Démarrage à froid.** Une boutique neuve avec très peu d’évènements oblige le moteur Vitrina à réduire agressivement sa confiance, ce qui diminue le nombre de recommandations utiles au cours des **premières semaines**.
- **Une seule langue pour le texte généré.** Le texte des recommandations est produit en **français**. Pour les marchands qui vendent en **arabe** ou en **berbère**, le texte doit être **retraduit à la main**.

### 8.6 Discussion des arbitrages

Trois arbitrages méritent d’être discutés explicitement.

**Règles déterministes et LLM.** Nous avons choisi de garder le moteur d’alertes **déterministe** et les recommandations Vitrina **hybrides** (heuristique + LLM). Un système entièrement fondé sur un LLM serait plus flexible mais moins explicable ; un système entièrement déterministe serait plus rigide. Selon nous, l’hybride est le bon compromis pour un produit de fin d’études.

**Page à onglets unique et administration multi-pages.** Une administration répartie sur plusieurs pages serait plus simple à faire évoluer (chaque page évoluerait séparément). Une page à onglets unique est plus simple à apprendre (la marchande ou le marchand ne se perd pas). Nous avons opté pour la page unique parce que le **coût d’apprentissage** est la contrainte dominante pour notre public.

**LLM gratuit et LLM payant.** Un LLM payant (Gemini Pro, GPT-4) produit de meilleurs conseils mais rattache le produit à un service **facturé à l’usage**. Nous avons borné les appels LLM au bouton **Analyser maintenant**, ce qui rend le coût prévisible tout en conservant une amélioration qualitative.

---

## Chapitre 9 — Conclusion générale

### 9.1 Synthèse des travaux

Ce projet de fin d’études visait à concevoir et à déployer un compagnon d’aide à la décision pour les petites boutiques e-commerce, construit au-dessus d’une vitrine Next.js existante. Nous avons livré :

- une page unique (`/seller-helper`), protégée « admin », qui regroupe en huit onglets ciblés toutes les lectures dont la marchande ou le marchand a besoin ;
- un pipeline d’évènements comportementaux qui capture chaque interaction produite par la vitrine **sans stocker de données personnelles inutiles** ;
- une couche Vitrina **par produit** qui transforme l’observation en recommandations et les recommandations en correctifs catalogue en un clic ;
- un journal d’actions appliquées et une Timeline qui représente **chaque** action comme un checkpoint au-dessus des métriques qu’elle visait à influencer ;
- un moteur de règles déterministe pour cinq alertes opérationnelles et un palier LLM borné pour les recommandations IA ;
- un flux Sécurité qui permet de bloquer des sessions hostiles en deux clics.

L’ensemble est livré **dans** la plateforme, **sans frais supplémentaire** et **sans** dépendre d’un service d’analyse séparé.

### 9.2 Objectifs atteints

Chacun des huit objectifs de la **section 1.5** est satisfait.

- **O1** (page unique) → `/seller-helper`.
- **O2** (Timeline) → Cinq métriques, quatre plages, périmètre boutique ou produit.
- **O3** (produits sous-performants) → Pipeline Vitrina avec score d’opportunité.
- **O4** (correctifs en un clic) → Six correctifs avec modale de confirmation.
- **O5** (audit et superposition) → Journal des actions appliquées + checkpoints.
- **O6** (alertes) → Cinq règles avec détail LLM et résolution en un clic.
- **O7** (sécurité) → Blocage / déblocage avec checkpoints d’audit.
- **O8** (pas de surcoût) → Livré avec la plateforme existante.

### 9.3 Impact du projet

Le Seller Helper a trois types d’impact.

- **Opérationnel.** Une personne marchande non technique peut appliquer **six** correctifs de merchandising en un clic chacun, sans écrire de JSON, HTML ou SQL.
- **Cognitif.** Le modèle mental passe de plusieurs tableaux de bord dispersés à **une** page à huit onglets, hiérarchisés par importance.
- **Stratégique.** Le journal d’audit crée une **mémoire institutionnelle** de ce qui a été essayé, de ce qui a fonctionné ou non. Une marchande ou un marchand peut partager cette mémoire avec un·e consultant·e marketing ou avec le support de la plateforme.

### 9.4 Difficultés rencontrées

Les principales difficultés ont été davantage **de processus** que purement techniques.

- **Données clairsemées.** Les petites boutiques produisent peu d’évènements ; nous avons dû retuner les heuristiques pour **réduire la confiance** plutôt que d’inventer des recommandations.
- **Disponibilité des marchands.** Les marchands bêta tournaient leurs boutiques à plein temps ; coordonner les sessions utilisateur demandait patience et créneaux d’interview très courts.
- **Prompt LLM borné.** Sans schéma strict, le modèle recommandait volontiers des modifications sur des champs que le tableau de bord ne peut pas appliquer. Concevoir un prompt **borné** — champs explicites, priorités énumérées, références obligatoires aux données fournies — a été l’aspect le plus itératif du projet.
- **Cohérence du cache.** Appliquer un correctif devait invalider les routes boutique, accueil, catégorie et fiche produit ; dresser la liste complète des chemins impactés demandait du soin.

---

## Chapitre 10 — Perspectives futures

### 10.1 Améliorations de la couche de recommandation

Trois améliorations à court terme sont prévues pour la couche de recommandation.

- **Ancrage par quelques exemples (*few-shot grounding*).** Intégrer dans le prompt système un petit jeu d’exemples *avant / après* de haute qualité pour ancrer les sorties du modèle dans des motifs de merchandising algériens réels.
- **Ton par vendeur.** Laisser chaque marchande ou marchand choisir un ton — formel, décontracté, réseaux sociaux — afin que le texte corresponde à la voix de la marque.
- **Analyses multi-tours.** Permettre d’approfondir une recommandation (« explique plus en détail » / « réécris en arabe ») sans quitter l’onglet IA.

### 10.2 Application mobile compagnon

Une application React Native permettrait à la marchande ou au marchand de recevoir des notifications push pour les alertes, de lire des recommandations et d’appliquer des correctifs depuis son téléphone. Les API du Seller Helper renvoient déjà des DTO typés ; la couche mobile serait en substance **un autre rendu des mêmes données**.

### 10.3 Mode multi-boutiques / marketplace

Les versions futures du Seller Helper pourraient héberger plusieurs boutiques sous un même compte, avec un sélecteur de boutique en haut de page et des vues agrégées multi-boutiques. Le modèle de données est à **une colonne** près du support multi-tenant : ajouter une colonne `store_id` sur les évènements comportementaux et les tables catalogue. Une fois cette colonne en place, le Seller Helper conviendrait aussi à un opérateur de marketplace qui souhaite offrir le même compagnon à chaque vendeur.

### 10.4 Extensions d’automatisation marketing

Le journal d’actions appliquées se prolonge naturellement vers une couche **d’automatisation marketing** : chaque action « appliquer » pourrait déclencher un e-mail ou un SMS correspondant aux anciens acheteurs (« nouvelle promo sur un produit que vous avez vu la semaine dernière »). Le Seller Helper afficherait ces automatisations et leurs résultats sur la Timeline, en conservant la propriété **d’unique source de vérité**.

### 10.5 Intégration IoT avec l’inventaire physique

Pour les marchands avec un point de retrait physique — entrepôt, comptoir, petite boutique — une intégration IoT pourrait corréler les évènements en ligne et hors ligne. Une boîte scannée au comptoir, un article prélevé en rayon, un livreur pointant : tout peut devenir un marqueur sur la Timeline et offrir **une même vue de l’activité en ligne et physique**.

### 10.6 Feuille de route à long terme

Trois directions paraissent particulièrement pertinentes à plus long terme.

- **Un onglet *Cohortes*.** Comparer acheteuses et acheteurs *nouveaux* et *fidèles*, trafic *payant* et *organique*, *ordinateur* et *mobile*, sur **chaque** métrique de la Timeline.
- **Un onglet *Expériences*.** Exécuter des variations A/B contrôlées d’un correctif et laisser le Seller Helper calculer la significance statistique du gain, puis l’afficher sur la Timeline comme checkpoint avec intervalles de confiance.
- **Une *API publique Seller Helper* (restreinte).** Exposer un petit sous-ensemble des lectures (Timeline, alertes, recommandations) à des applications tierces pour que comptables, consultant·e·s marketing ou partenaires logistiques puissent se brancher à la même source de vérité.

---

## Chapitre 11 — Annexes

### 11.1 Personas

Outre la persona **Yasmine** présentée en **section 2.3**, nous distinguons trois personas secondaires :

- *Adel, 34 ans, revente d’électronique.* Volume plus élevé, trois produits suivis en parallèle. Utilise le Seller Helper comme un *poste de pilotage* : trois ouvertures par jour, tri par nombre de vues, un correctif par session.
- *Lina, 22 ans, créatrice de bijoux faits à la main.* Volume très faible, attachement fort au catalogue. Lit surtout l’onglet Vitrina et Comportement utilisateur ; n’applique un correctif que lorsque la voix de la marque est préservée.
- *Karim, 45 ans, propriétaire de boutique établie.* N’ouvre le Seller Helper que le dimanche. S’intéresse surtout aux Alertes et à la Sécurité ; délègue Vitrina à un proche plus jeune.

### 11.2 Descriptions des filaires (*wireframes*)

Chaque onglet est filaire sous forme d’empilement de zones :

- un **en-tête** avec titre, badge d’état et boutons globaux (**Actualiser**, **Analyser maintenant**) ;
- une **barre de navigation** listant les huit onglets ;
- une zone **contenu** avec panneau d’accueil, graphique et liste ;
- une zone **inspecteur** qui s’ouvre à droite lorsque la marchande ou le marchand sélectionne un élément ;
- une couche **modale** pour les confirmations.

Une version imprimée du rapport joint les croquis ; cette version électronique se limite à la description rédigée pour garder le pipeline autonome.

### 11.3 Gabarit de cas d’usage

Chaque cas d’usage formalisé suit le gabarit ci-dessous.

```
UC-NN — titre court
Acteur           : qui déclenche le cas
Déclencheur      : ce qui initie le scénario
Préconditions  : état nécessaire en amont
Scénario principal : étapes numérotées du déclencheur au résultat
Variantes        : étapes pour la variante la plus importante
Postconditions   : état garanti après
Cas liés         : autres cas du même thème
```

### 11.4 Glossaire

- **Applied action / Action appliquée.** Toute mutation effectuée dans le Seller Helper, enregistrée comme ligne du journal et rejouée comme checkpoint sur la Timeline.
- **Behavioural event / Évènement comportemental.** Petit évènement côté client émis par la vitrine (vue produit, défilement, ajout au panier, …), persisté dans `sales_micro_event`.
- **Checkpoint.** Marqueur visuel sur la Timeline correspondant à une action appliquée.
- **Closed loop / Boucle fermée.** Le cycle observer → recommander → appliquer → mesurer mis en œuvre par le Seller Helper.
- **LLM.** Grand modèle de langage ; dans notre projet, un modèle de classe Gemini via `@google/genai`.
- **Opportunity score / Score d’opportunité.** Classement numérique produit par le moteur Vitrina pour trier les candidats par importance.
- **PDP.** Page de détail produit (*Product Detail Page*).
- **Quick fix / Correctif rapide.** Mutation catalogue en un clic exposée depuis l’onglet Vitrina.
- **Session key / Clé de session.** Identifiant anonyme de la session de navigation.

### 11.5 Questionnaire d’entretien marchand

Le questionnaire utilisé lors des sessions bêta est reproduit ci-dessous.

```
Section 1 — Profil
 1. Depuis combien de temps vendez-vous en ligne ?
 2. Combien de références catalogue avez-vous aujourd’hui ?
 3. D’où viennent la plupart de vos acheteuses et acheteurs ?
 4. Quel appareil utilisez-vous le plus pour administrer votre boutique ?

Section 2 — Routine
 5. Décrivez une journée type.
 6. À quel moment consultez-vous les statistiques de votre boutique ?
  7. Quels tableaux de bord utilisez-vous ? Pourquoi ?
  8. Lesquels avez-vous essayés puis abandonnés ? Pourquoi ?

Section 3 — Points de friction
 9. Qu’est-ce qui vous frustre le plus aujourd’hui dans votre activité ?
10. Que souhaiteriez-vous qu’un outil fasse alors qu’aucun ne le fait aujourd’hui ?
11. Modifiez-vous parfois votre boutique puis oubliez si la modification « a fonctionné » ?
12. Avez-vous déjà subi une attaque de robots ou des commandes fictives ?

Section 4 — Seller Helper (après une démo d’environ cinq minutes)
13. Selon vous, où le Seller Helper excelle‑t‑il ?
14. Où pêche‑t‑il ?
15. Seriez‑vous prêt·e à le payer ? À quel prix ?
16. Que nous demanderiez‑vous de développer ensuite ?
```

---

## Chapitre 12 — Bibliographie

1. **Kaushik, A.** *Web Analytics 2.0 — The Art of Online Accountability and Science of Customer Centricity.* John Wiley & Sons, 2009.
2. **Phillips, J.** *E-commerce Analytics — Analyze and Improve the Impact of Your Digital Strategy.* Pearson FT Press, 2016.
3. **Pirolli, P. & Card, S.** *Information Foraging.* Psychological Review 106 (4), 1999, p. 643–675.
4. **Ries, E.** *The Lean Startup.* Crown Business, 2011.
5. **Krug, S.** *Don't Make Me Think — A Common Sense Approach to Web Usability.* New Riders, 3ᵉ éd., 2014.
6. **Norman, D. A.** *The Design of Everyday Things.* Basic Books, éd. révisée, 2013.
7. **Cooper, A.** *About Face — The Essentials of Interaction Design.* Wiley, 4ᵉ éd., 2014 — référence pour la démarche persona du chapitre 2.
8. **Anderson, C.** *The Long Tail — Why the Future of Business is Selling Less of More.* Hyperion, 2006 — référence pour la discussion sur la longue traîne en **section 2.1**.
9. **UNCTAD (CNUCED).** *Digital Economy Report 2021 — Cross-border data flows and development.* United Nations, 2021.
10. **OCDE.** *Going Digital — Shaping Policies, Improving Lives.* OECD Publishing, 2019.
11. **Statista Research Department.** *E-commerce worldwide — statistics and facts.* 2023.
12. **Vaswani, A., et al.** *Attention Is All You Need.* NeurIPS 2017 — référence fondamentale pour le palier LLM.
13. **OWASP Foundation.** *OWASP Top 10 — 2021.* <https://owasp.org/Top10/>
14. **W3C.** *Web Content Accessibility Guidelines 2.2.* <https://www.w3.org/TR/WCAG22/>
15. **Documentation Next.js.** Vercel, 2024. <https://nextjs.org/docs>
16. **Documentation Drizzle ORM.** 2024. <https://orm.drizzle.team/>
17. **Documentation PostgreSQL, versions 15 / 16.** PostgreSQL Global Development Group. <https://www.postgresql.org/docs/>
18. **Documentation Better Auth.** 2024. <https://better-auth.com/docs>
19. **Google Generative AI.** Documentation `@google/genai`. <https://ai.google.dev/>
20. **Documentation Tailwind CSS.** Tailwind Labs, 2024. <https://tailwindcss.com/docs/>

---

*Fin du rapport — Seller Helper — Compagnon intelligent d’aide à la décision pour les petites boutiques e‑commerce.*
