## Chapitre 6. Collecte des données, groupes, motivations et enregistrement

Avant que le marchand ne voie le moindre graphique ou la moindre recommandation dans Seller Helper, la boutique collecte en continu des signaux issus du comportement réel des visiteurs. Cette étape est indispensable, sans données fiables, aucune alerte ni aucune suggestion ne peut être fondée. Nous précisons quels groupes de données sont enregistrés et pourquoi chacun a été retenu dans le cadre du projet.

### 6.1 Principe, observer la boutique comme un tableau de bord terrain

Chaque visite sur une fiche produit ou chaque passage au panier laisse une trace anonymisée, liée à une session de visite (une visite logique, sans nom ni adresse). L'objectif n'est pas de surveiller des individus, mais de comprendre comment la vitrine fonctionne en agrégat, d'où vient le trafic, où les acheteurs hésitent, quelles pages ralentissent, où les clics se concentrent. Ces réponses orientent ensuite l'analyse et, in fine, les écrans du Seller Helper.

### 6.2 Groupe 1, Contexte et origine du trafic

Données enregistrées. Type d'appareil (mobile, ordinateur, tablette), source de visite (réseaux sociaux, recherche, lien direct), paramètres de campagne, langue, taille de l'écran, page d'entrée.

Intérêt pour le projet :

- Le marchand doit savoir **qui** consulte la boutique et **depuis où** : une campagne Instagram et une recherche Google ne demandent pas les mêmes corrections.
- La répartition par appareil explique des écarts de conversion (formulaire trop long sur mobile, images trop lourdes).
- Ces signaux alimentent le **Dashboard** (segmentation appareils) et enrichissent le contexte envoyé au modèle d'analyse.

Sans ce groupe, les recommandations risqueraient d'être génériques alors que le problème est localisé (par exemple 80 % du trafic sur mobile).

### 6.3 Groupe 2, Engagement sur la fiche produit

Données enregistrées. Ouverture d'une fiche produit, temps passé sur la page, identification du produit consulté (titre, catégorie, prix affiché).

Intérêt pour le projet :

- Une vue produit est la **première étape du tunnel d'achat** : sans volume de vues, impossible de calculer un taux de conversion.
- Le temps de présence distingue un simple survol d'un intérêt réel ; il complète les cartes de chaleur pour repérer les pages « vues mais ignorées ».
- Ces données servent la **Timeline** (courbe des vues), le **tunnel de conversion** (étape initiale) et le classement des **pages les plus actives**.

Ces données permettent de répondre à la question, « Est-ce que les visiteurs regardent vraiment mes produits ? »

### 6.4 Groupe 3, Parcours d'achat et conversion

Données enregistrées. Ajout au panier, entrée dans le tunnel de paiement, étapes du checkout, achat confirmé.

Intérêt pour le projet :

- C'est le cœur du **chiffre d'affaires** : le marchand doit voir où le parcours se brise (panier abandonné, paiement non finalisé).
- Les ratios entre étapes (vue → panier → paiement → achat) alimentent le **Conversion Funnel** et déclenchent des alertes (abandon massif de panier, chute de conversion).
- Le modèle d'analyse reçoit ces ratios pour formuler des recommandations ciblées (frais de port, guest checkout, confiance au paiement).

Sans ce groupe, Seller Helper ne pourrait pas prioriser les actions à impact direct sur les ventes.

### 6.5 Groupe 4, Interactions spatiales (clics et survols)

Données enregistrées. Position relative des clics et des survols sur la surface de la fiche produit (zones de la page, pas d'identité personnelle).

Intérêt pour le projet :

- Les totaux de vues ne disent pas **où** le visiteur clique : un bouton d'achat peut être invisible, une galerie sous-utilisée.
- L'agrégation en **carte de chaleur** permet au marchand de réorganiser visuels, prix et appels à l'action sans supposer le bon emplacement.
- Ce groupe est unique à une aide à la décision **orientée merchandising** ; il justifie l'onglet **Comportement utilisateur**.

Nous collectons ces données pour relier comportement visuel et décision de mise en page, difficile avec de simples compteurs de pages vues.

### 6.6 Groupe 5, Qualité technique (performance et erreurs)

Données enregistrées. Temps de chargement perçu, indicateurs de lenteur d'affichage (dont le rendu principal de la page), erreurs techniques côté navigateur sur le parcours sensible (notamment paiement).

Intérêt pour le projet :

- Une page lente fait fuir avant tout clic ; la performance est un levier de conversion souvent sous-estimé par les petits marchands.
- Les erreurs JavaScript au checkout peuvent bloquer des ventes sans que le marchand en ait connaissance autrement.
- Ces signaux alimentent les **alertes** (lenteur, erreurs techniques) et des recommandations assignées au **support technique**.

Ce groupe garantit que Seller Helper traite aussi les causes techniques, pas uniquement marketing.

### 6.7 Groupe 6, Fiabilité des sessions (sécurité)

Données enregistrées. Vélocité anormale d'événements, incohérences de navigation, motifs de sessions suspectes (bots, trafic artificiel).

Intérêt pour le projet :

- Des métriques faussées par du trafic non humain peuvent entraîner de mauvaises décisions (budget pub gaspillé, fausse alerte de pic).
- Le marchand doit pouvoir **filtrer ou bloquer** des sessions aberrantes et garder confiance dans ses chiffres.
- Ce groupe alimente l'onglet **Sécurité** et complète le contexte d'analyse lors de pics de trafic.

### 6.8 Synthèse et enregistrement

| Groupe | Question métier à laquelle il répond | Onglets Seller Helper principalement concernés |
| --- | --- | --- |
| Contexte et trafic | D'où viennent mes visiteurs et sur quel appareil ? | Dashboard |
| Engagement produit | Mes fiches sont-elles vraiment consultées ? | Dashboard, Timeline, Funnel |
| Parcours d'achat | Où abandonne-t-on avant d'acheter ? | Funnel, Alertes, Recommandations IA |
| Interactions spatiales | Où cliquer et où regarder sur la page ? | Comportement utilisateur |
| Qualité technique | La boutique est-elle lente ou cassée ? | Alertes, Recommandations IA |
| Fiabilité sessions | Mes chiffres sont-ils crédibles ? | Sécurité, Alertes |

Les événements validés sont transmis par lots au serveur, associés à une session et horodatés, puis stockés de manière durable. Les données sensibles sont limitées ; les cartes de chaleur n'affichent que des agrégats par zone, jamais une personne identifiable.

## Chapitre 7. Analyse des données, règles métier et intelligence artificielle (LLM)

Une fois les données collectées et agrégées, elles doivent être interprétées avant d'apparaître sous forme de cartes et de graphiques dans Seller Helper. Cette étape d'analyse combine un moteur de règles déterministes (seuils, comparaisons dans le temps) et un modèle de langage (LLM) qui transforme les signaux en textes utilisable sur le terrains pour le marchand.

### 7.1 De la donnée brute aux signaux exploitables

Le système calcule d'abord des indicateurs synthétiques sur des fenêtres glissantes, quinze minutes pour l'activité en direct, vingt-quatre heures pour le trafic horaire, sept jours pour le tunnel, les pages populaires et le comportement. Il en déduit par exemple :

- le taux de conversion actuel par rapport à la semaine précédente ;
- le volume d'événements sur les quinze dernières minutes par rapport à une baseline ;
- le taux d'abandon entre panier et achat ;
- le nombre de sessions avec lenteur ou erreur au paiement.

Ces signaux constituent l'entrée commune des règles métier et du LLM. Sans cette couche, le modèle recevrait des données trop brutes et peu fiables.

### 7.2 Moteur de règles, alertes et recommandations de base

Avant tout appel à l'intelligence artificielle, un catalogue de règles compare les signaux à des seuils configurables par le marchand :

| Type de détection | Exemple de situation | Intérêt pour le marchand |
| --- | --- | --- |
| Chute de conversion | Taux d'achat nettement inférieur à la période de référence | Réagir vite après une modification de prix ou une campagne ratée |
| Pic de trafic anormal | Afflux soudain d'événements | Distinguer succès viral, campagne ou trafic suspect |
| Abandon massif de panier | Beaucoup de paniers, peu d'achats sur deux heures | Cibler paiement, frais de port, confiance |
| Erreurs techniques | Erreurs fréquentes sur le checkout | Éviter des ventes perdues « silencieuses » |
| Lenteur d'affichage | Pages produit trop lentes sur plusieurs sessions | Améliorer performance mobile |

Les règles produisent des alertes (incidents à traiter) et certaines recommandations structurées (par exemple faible passage vue → panier). Elles sont explicables, chaque alerte indique le ratio ou le volume qui l'a déclenchée. Des empreintes temporelles évitent de spammer le marchand avec le même incident toutes les minutes.

### 7.3 Usage d'un LLM pour l'analyse des données

Pour dépasser des seuils fixes, le projet s'appuie sur un grand modèle de langage (LLM), principalement **Gemini** (Google), avec possibilité de passage par **OpenRouter** selon la configuration de la plateforme.

**Ce qui est envoyé au modèle.** Un instantané structuré, sans données personnelles : résumé de l'activité sur sept jours (sessions, événements, tunnel), signaux de sécurité et de performance, extrait du **catalogue produits** (titres, stocks, prix, catégories). Le modèle reçoit aussi les **profils de rôles** (marketing, support technique) pour formuler des actions adaptées à chaque destinataire.

**Ce que le modèle doit produire.** Une réponse au format structuré (JSON validé) contenant :

- un **résumé** de la situation de la boutique en quelques phrases ;
- jusqu'à six **alertes** complémentaires (titre, gravité, description) ;
- jusqu'à huit **recommandations** (titre, analyse, texte d'action, priorité, score de confiance, rôle suggéré).

Intérêt du modèle de langage

- Les petites boutiques ont des situations **hétérogènes** (secteur, saison, stock) ; le modèle peut **croiser** catalogue et comportement (« stock faible sur le produit le plus vu »).
- Il formule des recommandations en **langage naturel** compréhensible par un marchand non technique.
- Il propose des pistes **contextualisées** que des seuils fixes ne couvrent pas (merchandising, confiance, mobile).

Contrôles prévus, La sortie du LLM est validée (schéma strict, priorités, longueurs, champs obligatoires) avant enregistrement. Si le service est indisponible ou non configuré, des recommandations de secours sont générées à partir du catalogue et des signaux déjà calculés, le marchand n'est jamais face à un écran vide. L'envoi par e-mail et le déplacement vers l'Inbox restent manuels, le LLM suggère, le marchand décide.

### 7.4 Compléments d'analyse, catalogue Vitrina

En parallèle du LLM, un module dédié analyse chaque produit du catalogue (présentation, prix, stock, signaux de vue) pour alimenter l'onglet Recommandation Vitrina. Cette couche est plus opérationnelle par article ; elle complète les recommandations transverses du LLM.

### 7.5 Du résultat de l'analyse à l'application

Lorsque le marchand clique sur **Analyze now**, la chaîne s'exécute, agrégation → règles → appel LLM → enrichissement (rôles, indices économiques) → enregistrement des alertes et recommandations. Ce n'est qu'ensuite que l'interface Seller Helper affiche les résultats, cartes dans Recommandations IA, liste dans Alertes, courbes déjà alimentées par la collecte continue.

Les sections suivantes présentent comment ces résultats sont présentés et utilisés dans l'application proprement dite.

## Chapitre 8. Présentation générale de l'application

### 8.1 Définition et rôle

Le Seller Helper est un compagnon d'aide à la décision pour les petits marchands e-commerce. Il centralise en un seul espace :

- une **vue d'ensemble** de l'activité de la boutique ;
- des **analyses comportementales** (cartes de chaleur, parcours, tunnel d'achat) ;
- des **recommandations** issues de règles métier, du catalogue et de l'intelligence artificielle ;
- un **suivi opérationnel** des actions envoyées à l'équipe (Inbox) ;
- la **surveillance des incidents** (alertes, sécurité).

Son rôle n'est pas de remplacer un outil statistique externe, mais de réduire le temps entre un signal faible et une décision concrète sur la vitrine.

### 8.2 Intégration dans Vitrina Store

L'application est accessible depuis l'espace administrateur de la boutique, en page dédiée ou en module intégré au panneau d'administration. Elle s'alimente automatiquement des événements générés par les visites sur les pages produit et le parcours d'achat de la même boutique. Aucune configuration analytique complexe n'est requise du marchand, le suivi est actif dès que la boutique reçoit du trafic.

### 8.3 Public cible

| Profil | Usage principal |
| --- | --- |
| Propriétaire de boutique | Vision globale, priorisation des actions à fort impact. |
| Responsable marketing | Merchandising, tunnel de conversion, recommandations catalogue. |
| Support technique | Alertes incidents, erreurs de paiement, performance, sécurité. |

L'accès est réservé aux comptes administrateurs authentifiés.

### 8.4 Les neuf modules de navigation

| Module | Intitulé | Mission |
| --- | --- | --- |
| Dashboard | Overview | Synthèse : trafic, appareils, pages populaires, indicateurs clés. |
| Timeline | Timeline | Évolution des métriques dans le temps et repères d'actions. |
| User Behavior | Behavior | Cartes de chaleur, parcours, engagement sur les fiches produit. |
| Conversion Funnel | Funnel | Abandons entre vue produit, panier, paiement et achat. |
| Vitrina Recommendation | Vitrina | Suggestions merchandising produit par produit. |
| AI Recommendations | AI | Actions priorisées avant envoi par e-mail. |
| Inbox | Inbox | Suivi des recommandations déjà communiquées à l'équipe. |
| Alerts | Alerts | Incidents actifs et historique des résolutions. |
| Security | Security | Sessions suspectes et fiabilité des données. |

### 8.5 Valeur ajoutée

Trois points forts ressortent :

- **Centralisation** : neuf écrans couvrant tout le cycle décisionnel du marchand.
- **Priorisation** : tri par importance, scores de confiance, assignation marketing ou support technique.
- **Boucle fermée** : analyse, envoi d'e-mail, suivi Inbox, mesure sur la Timeline, le marchand voit si son action a porté ses fruits.

## Chapitre 9. Architecture de restitution et flux dans l'interface

Après la collecte et l'analyse (chapitres 6 et 7), les étapes collecte et analyse. Le présent chapitre décrit comment les résultats sont restitués dans Seller Helper et maintenus à jour.

### 9.1 Chaîne complète en cinq temps

1. **Collecte** sur la boutique (chapitre 6).
2. **Transmission et stockage** sécurisés des événements.
3. **Analyse** par règles et LLM (chapitre 7).
4. **Restitution** dans les neuf modules de l'interface.
5. **Actualisation** continue jusqu'à la prochaine analyse.

### 9.2 Agrégation continue pour l'affichage

Même sans lancer **Analyze now**, l'interface s'appuie sur des agrégats recalculés, indicateurs du Dashboard, courbes de la Timeline, cartes de chaleur, entonnoir du Funnel. Les fenêtres temporelles (quinze minutes, vingt-quatre heures, sept jours) sont les mêmes que celles utilisées pour l'analyse, ce qui garantit la cohérence entre un graphique et une alerte.

### 9.3 Affichage et actualisation

L'interface charge en parallèle la vue d'ensemble, les alertes, les recommandations actives et la boîte de réception. Un rafraîchissement automatique (environ toutes les cinq secondes) maintient les chiffres à jour ; pendant une analyse en cours, l'actualisation est suspendue pour garantir un affichage cohérent.


### 9.1 Modélisation UML du système

Les schémas suivants résument l'architecture globale de Vitrina Store et Seller Helper.

#### Figure 9.1. Diagramme de déploiement

{{PLACEHOLDER:Figure 9.1 — Diagramme de déploiement (Vercel, Neon, services externes)}}

*Figure 9.1.* Le navigateur du visiteur et du marchand communique en HTTPS avec l'application Next.js hébergée sur Vercel. Les routes API et la couche serveur s'appuient sur Neon (PostgreSQL). Les services externes (Google OAuth, Gemini ou OpenRouter, Brevo, Chargily) sont appelés selon le besoin.

#### Figure 9.2. Diagramme de classes

{{PLACEHOLDER:Figure 9.2 — Diagramme de classes (couches et tables PostgreSQL)}}

*Figure 9.2.* Trois couches applicatives (présentation, API Next.js, domaine serveur) s'appuient sur les tables PostgreSQL (événements, séquences, alertes, recommandations, actions Seller Helper) et sur les services externes.

#### Figure 9.3. Diagramme de séquence

{{PLACEHOLDER:Figure 9.3 — Diagramme de séquence (visiteur, collecte, marchand, analyse, action)}}

*Figure 9.3.* Le parcours visiteur alimente la collecte ; le marchand déclenche l'analyse (règles + LLM), consulte les onglets Seller Helper et peut envoyer des e-mails, appliquer des correctifs ou gérer l'Inbox.

#### Figure 9.4. Diagramme de cas d'utilisation

{{PLACEHOLDER:Figure 9.4 — Diagramme de cas d'utilisation}}

*Figure 9.4.* Les cas d'utilisation couvrent la boutique, la collecte comportementale, le Seller Helper (analyse, recommandations, Inbox, sécurité) et les services système (règles métier, LLM, Brevo).

#### Figure 9.5. Diagramme d'activité

{{PLACEHOLDER:Figure 9.5 — Diagramme d'activité (parcours visiteur et marchand)}}

*Figure 9.5.* Deux couloirs d'activité (visiteur et marchand admin) se rejoignent sur la persistance Neon ; la boucle marchand relie consultation, analyse, action et mesure sur la Timeline.



### 9.6 Chaîne complète en cinq temps

1. **Collecte** sur la boutique (chapitre 6).
2. **Transmission et stockage** sécurisés des événements.
3. **Analyse** par règles et LLM (chapitre 7).
4. **Restitution** dans les neuf modules de l'interface.
5. **Actualisation** continue jusqu'à la prochaine analyse.

### 9.7 Agrégation continue pour l'affichage

Même sans lancer **Analyze now**, l'interface s'appuie sur des agrégats recalculés, indicateurs du Dashboard, courbes de la Timeline, cartes de chaleur, entonnoir du Funnel. Les fenêtres temporelles (quinze minutes, vingt-quatre heures, sept jours) sont les mêmes que celles utilisées pour l'analyse, ce qui garantit la cohérence entre un graphique et une alerte.

### 9.8 Affichage et actualisation

L'interface charge en parallèle la vue d'ensemble, les alertes, les recommandations actives et la boîte de réception. Un rafraîchissement automatique (environ toutes les cinq secondes) maintient les chiffres à jour ; pendant une analyse en cours, l'actualisation est suspendue pour garantir un affichage cohérent.


## Chapitre 10. Workflow et parcours utilisateur

### 10.1 Le cycle observer – analyser – agir – mesurer

En pratique, le marchand commence par consulter le Dashboard, Consulter le Dashboard et, si besoin, les onglets Comportement ou Tunnel pour identifier un signal (baisse de conversion, zone peu cliquée sur une fiche produit).

Il lance ensuite Lancer **Analyze now** pour générer alertes et recommandations à jour. Les nouvelles cartes apparaissent dans Recommandations IA et les alertes dans l'onglet Alertes.

Pour la mise en œuvre, Choisir une recommandation, lire le détail, puis **Send email** pour l'adresser au rôle concerné (marketing ou support). La carte migre vers l'**Inbox**. Pour le catalogue, appliquer un correctif rapide Vitrina ou modifier la fiche produit.

Enfin, il Sur la Timeline, comparer l'évolution des ventes ou du taux de conversion avant et après l'action ; les repères d'actions appliquées marquent la date des interventions.

### 10.2 Actions transversales de l'en-tête

| Action | Effet |
| --- | --- |
| Indicateur Live data | Confirme que la boutique envoie des événements récents. |
| Sessions / 15 min | Montre l'activité immédiate. |
| Refresh | Recharge manuellement toutes les données. |
| Analyze now | Lance le job d'analyse complet. |

### 10.3 Recommandations et boîte de réception

Les recommandations IA restent dans l'onglet AI Recommendations tant qu'elles n'ont pas été envoyées. **Send email** :

1. transmet le contenu par e-mail au destinataire du rôle assigné ;
2. enregistre la date d'envoi ;
3. déplace la carte vers l'**Inbox** pour suivi.

L'analyse automatique n'envoie jamais d'e-mail sans validation humaine. Dans l'Inbox, le marchand peut marquer une action comme implémentée ou la classer sans suite.

### 10.4 Répartition par rôles

Deux rôles par défaut structurent la collaboration :

- **Agent marketing**, Merchandising, conversion, catalogue, comportement acheteur.
- **Support technique**, Performance, erreurs, sécurité, incidents de paiement.

Le routage s'effectue selon le thème de chaque recommandation. Des filtres par rôle dans l'Inbox permettent à chaque membre de l'équipe de suivre ses tâches.

### 10.5 Classement et priorisation

Alertes et recommandations sont triées par niveau d'importance (critique, élevée, moyenne, faible) afin que le marchand traite en premier les leviers à fort impact commercial estimé.

## Chapitre 11. Description des modules de l'interface

Nous décrivons ci-dessous chaque écran, son rôle, ses éléments principaux et son apport pour la boutique.

### 11.1 Dashboard, vue d'ensemble

Point d'entrée de Seller Helper, répondre à « Que se passe-t-il sur ma boutique maintenant et cette semaine ? »

**Éléments principaux.**

- Bandeau d'état (données en direct ou en attente, sessions sur quinze minutes).
- Cartes d'indicateurs : sessions sept jours, volume d'événements, visiteurs actifs, taux de conversion et évolution.
- Graphique de trafic sur vingt-quatre heures.
- Classement des pages les plus consultées.
- Répartition mobile, ordinateur, tablette.
- Renvoi vers les fiches produit les plus actives.

{{CAPTURE:Figure 11.1 — Capture d'écran, onglet Dashboard}}

Usage attendu, Lecture immédiate sans export complexe ; détection rapide d'un trafic anormal ou d'une chute de conversion.

### 11.2 Timeline, suivi temporel

Suivre l'évolution des métriques dans le temps, pour toute la boutique ou un produit choisi, et visualiser les actions déjà menées.

**Éléments principaux.**

- Choix de période : 24 heures, 7 jours, 30 jours.
- Métriques sélectionnables : vues, sessions, ajouts panier, ventes, taux de conversion.
- Filtre boutique entière ou produit ciblé.
- Courbes lissées avec infobulles au survol.
- Repères d'actions avec fenêtre de détail (titre, date, objectif).

{{CAPTURE:Figure 11.2 — Capture d'écran, onglet Timeline}}

Usage attendu, Relier cause et effet entre une modification de vitrine et l'évolution des ventes.

### 11.3 Comportement utilisateur

Montrer où les visiteurs regardent et cliquent sur les fiches produit, et comment ils avancent dans la session.

**Éléments principaux.**

- Aperçu de la page produit avec superposition colorée (vues, survols ou clics).
- Liste des pages pour choisir le produit à analyser.
- Synthèse : types de parcours, profondeur de défilement, indicateurs de session.

{{CAPTURE:Figure 11.3 — Capture d'écran, onglet Comportement utilisateur}}

Usage attendu, Repositionner boutons et contenus ; augmenter les clics vers le panier sans refonte complète du site.

### 11.4 Tunnel de conversion

Visualiser les pertes entre consultation produit, panier, passage au paiement et achat final.

**Éléments principaux.**

- Graphique en entonnoir avec volumes par étape.
- Taux de passage entre étapes.
- Cartes de friction lorsque le système détecte un goulet (explication et piste d'action).

{{CAPTURE:Figure 11.4 — Capture d'écran, onglet Conversion Funnel}}

Usage attendu, Diagnostic lisible des abandons ; ciblage des corrections (frais de port visibles, paiement invité, formulaire mobile simplifié).

### 11.5 Recommandation Vitrina

Proposer des améliorations concrètes par produit, titre, description, images, prix, stock.

**Éléments principaux.**

- Liste de suggestions par produit avec priorité et impact.
- Actions de correctif rapide ou marquage « appliqué ».
- Mise à jour après chaque analyse.

{{CAPTURE:Figure 11.5 — Capture d'écran, onglet Recommandation Vitrina}}

Usage attendu, Actions opérationnelles au niveau de chaque article ; meilleure présentation catalogue et gestion des ruptures.

### 11.6 Recommandations IA

Afficher les recommandations issues de l'analyse encore non envoyées par e-mail.

**Éléments principaux.**

- Cartes avec priorité, recommandation utilisable sur le terrain, impact estimé, confiance, délai suggéré.
- Rôle destinataire (marketing ou support).
- Bouton **Send email** et panneau **Details** pour l'analyse complète.

{{CAPTURE:Figure 11.6 — Capture d'écran, onglet Recommandations IA}}

Usage attendu, Plan d'action stratégique validé humainement avant communication à l'équipe.

### 11.7 Inbox

Gérer les recommandations déjà communiquées, suivi d'exécution et clôture.

**Éléments principaux.**

- Filtres par rôle avec compteurs.
- Actions **Mark implemented** et **Dismiss**.
- Historique des dates d'envoi et de clôture.

{{CAPTURE:Figure 11.7 — Capture d'écran, onglet Inbox}}

Usage attendu, Outil de suivi d'équipe léger ; réduction du délai entre recommandation et mise en ligne.

### 11.8 Alertes

Signaler les anomalies récentes nécessitant une attention immédiate.

**Éléments principaux.**

- Liste par sévérité.
- Paramétrage des seuils (conversion, trafic, panier, erreurs, performance).
- Historique des alertes résolues avec détail (volumes, sessions concernées).

{{CAPTURE:Figure 11.8 — Capture d'écran, onglet Alertes}}

Usage attendu, Réactivité pendant les campagnes ; limitation des pertes liées aux incidents techniques.

### 11.9 Sécurité

Surveiller les sessions suspectes ou automatisées et documenter la fiabilité du suivi.

**Éléments principaux.**

- Synthèse des sessions à risque et motifs.
- Liste détaillée et action de remise à zéro des signaux affichés.
- Recommandations pour un suivi fiable.

{{CAPTURE:Figure 11.9 — Capture d'écran, onglet Sécurité}}

Usage attendu, Confiance dans les métriques ; évitement de dépenses publicitaires sur trafic non qualifié.



## Chapitre 12. Confidentialité, sécurité et politiques d'usage

### 12.1 Accès réservé aux administrateurs

Le Seller Helper vérifie le rôle de l'utilisateur avant d'exposer toute donnée analytique. Un visiteur non administrateur n'accède pas aux métriques ni aux recommandations, seuls les comptes autorisés de la boutique consultent et déclenchent les actions.

### 12.2 Minimisation des données personnelles

Les micro-événements comportementaux s'appuient sur des identifiants de session opaques, générés aléatoirement. Aucune adresse IP, aucun nom ni e-mail n'est stocké dans ces événements. Les cartes de chaleur et les agrégats n'affichent que des totaux par zone, jamais une personne identifiable.

### 12.3 Réversibilité et traçabilité

Les actions du Seller Helper sont conçues pour rester réversibles lorsque c'est pertinent, correctifs Vitrina annulables, blocages de sessions levables, historique des alertes et recommandations conservé. Chaque mutation significative peut être reliée à un repère sur la Timeline pour audit et mesure d'impact.

### 12.4 Mutations limitées et contrôlées

L'interface ne permet pas de supprimer arbitrairement produits, commandes ou historique. Les correctifs rapides Vitrina ne modifient qu'un ensemble restreint d'attributs merchandising ; les actions sécurité se limitent au blocage ou déblocage de sessions signalées. Cette conception limite les risques d'erreur humaine tout en laissant au marchand une marge d'action opérationnelle.

### 12.5 Lien avec l'onglet Sécurité

L'onglet Security de l'application matérialise ces principes, synthèse des sessions suspectes, motifs d'alerte, recommandations pour préserver la fiabilité des métriques utilisées dans tout le reste du système (chapitre 11, section 11.9).


## Chapitre 13. Impacts et bénéfices pour le marchand

### 13.1 Expérience utilisateur

| Dimension | Apport |
| --- | --- |
| Simplicité | Une seule application, libellés orientés action. |
| Rapidité | Données en direct, analyse et e-mail en quelques clics. |
| Collaboration | Rôles, Inbox et e-mails pour petites équipes. |
| Pédagogie | Chaque module répond à une question métier précise. |

### 13.2 Performance commerciale

- **Conversion** : Tunnel et recommandations sur les étapes faibles.
- **Ventes** : Merchandising Vitrina et optimisation des zones cliquables.
- **Marketing** : Alertes trafic et sécurité pour un budget publicitaire mieux ciblé.
- **Réactivité** : Correctifs catalogue sans intervention développeur systématique.

### 13.3 Indicateurs de succès observables

- Amélioration des taux entre étapes du tunnel (visible sur la Timeline).
- Diminution des alertes performance et erreurs techniques.
- Taux de clôture des tâches dans l'Inbox.
- Volume de suivi stable, signe d'une boutique correctement instrumentée.


## Chapitre 14. Conclusion générale

Ce projet a abouti à un système d'analyse et de recommandation pour les boutiques en ligne, déployé via Seller Helper sur Vitrina Store. L'essentiel ne se limite pas à l'interface, la chaîne complète, problèmes marchands, collecte ciblée, analyse par règles et par modèle de langage, restitution dans l'application et règles de confidentialité, constitue la valeur du travail.

En combinant Dashboard, Timeline, Comportement, Funnel, optimisation produit (Vitrina et correctifs rapides), recommandations IA, Inbox, alertes et sécurité, Seller Helper va au-delà de la simple visualisation de métriques pour aider le marchand à prioriser ses décisions.

Retenons notamment, une réponse coordonnée aux six freins majeurs des e-commerçants ; six groupes de signaux, chacun lié à une question commerciale ; des seuils explicables complétés par le modèle de langage ; des actions possibles depuis l'interface (correctifs Vitrina, e-mails par rôle, Inbox) ; un suivi dans le temps via la Timeline ; des politiques de confidentialité et un module Sécurité pour des métriques fiables ; enfin une chaîne technique cohérente (TypeScript, Next.js, Neon, Vercel, Better Auth, Google, Brevo).

Le travail a permis de formaliser un modèle d'événements, des règles d'alerte, un pipeline de recommandations et une interface pensée pour les micro-marchands, sur une infrastructure cloud éprouvée. Le prototype reste évolutif (montée en charge, modèles plus avancés, validation sur davantage de boutiques), mais constitue déjà une base solide pour accompagner les vendeurs en ligne.

En bref, langages, frameworks, base Neon, déploiement Vercel, authentification Google, e-mails Brevo, analyse de données et interface ont été mobilisés de façon cohérente afin d'aider le marchand à prioriser ce qu'il change sur sa boutique.

*Fin du rapport, Application Seller Helper, Vitrina Store.*
