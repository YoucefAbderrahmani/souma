# Seller Helper — Un compagnon intelligent d’aide à la décision pour les petits marchands e-commerce

**Projet de fin d’études**

Université des Sciences et de la Technologie Houari Boumediène  
Faculté d’Informatique

Thème : *Conception et déploiement d’un compagnon intelligent d’aide à la décision (« Seller Helper ») destiné aux petits marchands en ligne, intégré à la plateforme e-commerce Vitrina Store.*

Année universitaire : 2025 / 2026

---

## Remerciements

Nous tenons à remercier sincèrement toutes les personnes qui ont contribué, directement ou indirectement, à la réalisation de ce projet de fin d’études.

Nous remercions nos encadrant·e·s pour leurs conseils, leurs relectures patientes et leur disponibilité tout au long de l’année. Ils et elles nous ont aidé·e·s à transformer une intuition — *les petits marchands en ligne ont besoin d’un assistant, pas d’un tableau de bord* — en un projet académique défendable et en un logiciel concret.

Nous remercions la Faculté d’Informatique de l’USTHB pour le cadre académique qui a rendu ce travail possible, ainsi que les membres du jury pour le temps qu’ils et elles consacreront à la lecture de ce manuscrit.

Nous sommes profondément reconnaissant·e·s envers les petits commerçant·e·s algérien·ne·s qui ont accepté de tester le Seller Helper sur leurs boutiques réelles. Leur réalité quotidienne — faire tourner une boutique depuis un smartphone, entre deux livraisons — a été l’apport le plus déterminant sur la forme du produit.

Nous remercions enfin nos familles et nos ami·e·s pour leur soutien indéfectible durant les phases les plus exigeantes de cette année de fin de cycle.

---

## Résumé

Vendre en ligne n’a jamais été aussi accessible, mais rester *visible* et *rentable* sur la vitrine est plus difficile que jamais. Chaque semaine, un·e petite marchand·e doit décider quel produit mettre en avant, quelle couleur afficher par défaut, quel avis mettre en évidence, quelle promotion rendre plus visible, quelle alerte traiter en premier et quelle session suspecte bloquer. Les suites d’analyse traditionnelles — Google Analytics 4, Hotjar, Mixpanel — décrivent ce qui s’est produit sur la boutique ; elles disent très rarement au marchand *quoi faire ensuite*. Les suites de personnalisation d’entreprise recommandent bien des actions, mais coûtent plusieurs milliers de dollars par mois et visent les grands retailers de premier plan. La petite boutique, qui est le moteur du e-commerce dans les marchés émergents, se retrouve sans outil vraiment adapté.

Ce projet de fin d’études comble cet écart avec le **Seller Helper**, un compagnon intelligent d’aide à la décision construit au-dessus de la plateforme Vitrina Store. Le Seller Helper est une page réservée aux administrateurs qui regroupe **huit onglets ciblés** — Tableau de bord, Timeline, Comportement utilisateur, Tunnel de conversion, Recommandation Vitrina, Recommandations IA, Alertes, Sécurité — et transforme des données comportementales continues en un petit ensemble *priorisé* d’**actions** que la vendeuse ou le vendeur peuvent appliquer en un clic. La contribution décisive est la boucle **observer → recommander → appliquer → mesurer** : chaque action passée par le Seller Helper est conservée dans un journal d’audit et rejouée comme **point de passage (checkpoint)** sur la même Timeline qui affiche la métrique que l’action visait à faire évoluer.

Le rapport est organisé en douze chapitres selon une logique problème → analyse → solution → architecture → implémentation → résultats. Le **chapitre 5** concentre la profondeur technique ; tous les autres chapitres sont volontairement centrés sur les fonctionnalités, le marché, l’expérience utilisateur, la validation, les résultats et les perspectives, en cohérence avec le public d’un jury de fin d’études.

---

## Table des matières

1. **Introduction générale**
   1. Présentation du domaine
   2. Contexte du projet
   3. Importance du sujet
   4. Problématique générale
   5. Objectifs du projet
   6. Organisation du rapport
2. **Étude et analyse de l’existant**
   1. Panorama du marché mondial du e-commerce
   2. Le paysage du e-commerce algérien et nord-africain
   3. La petite boutique en ligne — persona
   4. Outils d’analyse existants
   5. Outils de personnalisation et de recommandation existants
   6. Points de friction rapportés par les marchands
   7. Comparaison des solutions existantes
   8. Positionnement de notre solution
3. **Analyse des besoins**
   1. Exigences fonctionnelles
   2. Exigences non fonctionnelles
   3. Acteurs du système
   4. Cas d’usage et scénarios
4. **Conception du système**
   1. Principes de conception
   2. Architecture fonctionnelle
   3. Architecture de l’information et navigation
   4. Schémas conceptuels
   5. Choix UX
5. **Implémentation et réalisation**
   1. Technologies utilisées
   2. Le système de suivi (*tracking*)
   3. Le système d’alertes
   4. Le système de recommandations IA
   5. Le système analytique du tableau de bord
   6. Le système des correctifs rapides Vitrina
   7. La Timeline et les actions appliquées
   8. Le module de sécurité
6. **Sécurité et optimisation**
   1. Confidentialité des données marchand et visiteur
   2. Protection des comptes
   3. Traçabilité des actions
   4. Performance du point de vue du marchand
   5. Fiabilité et résilience hors connexion
   6. Architecture soucieuse du coût
   7. Piste d’évolutivité
7. **Tests et validation**
   1. Stratégie de test
   2. Tests bêta avec de vraies boutiques
   3. Sessions d’utilisabilité
   4. Matrice de validation par rapport aux exigences fonctionnelles
   5. Anomalies trouvées et corrigées
   6. Métriques de test
8. **Résultats et discussion**
   1. Résultats d’adoption
   2. Progression mesurée sur boutiques de test
   3. Retours marchands
   4. Comparaison avant / après
   5. Limites observées
   6. Discussion des compromis (*trade-offs*)
9. **Conclusion générale**
   1. Synthèse des travaux
   2. Objectifs atteints
   3. Impact du projet
   4. Difficultés rencontrées
10. **Perspectives futures**
    1. Améliorations de la couche de recommandation
    2. Application mobile compagnon
    3. Mode multi‑boutiques / marketplace
    4. Extensions d’automatisation marketing
    5. Intégration IoT avec inventaire physique
    6. Feuille de route à long terme
11. **Annexes**
    1. Personas
    2. Descriptions de filaires (*wireframes*)
    3. Gabarit de cas d’usage
    4. Glossaire
    5. Questionnaire d’entretien marchand
12. **Bibliographie**

---

## Chapitre 1 — Introduction générale

### 1.1 Présentation du domaine

Le commerce en ligne est devenu **le canal retail dominant de la décennie écoulée**. Acheter sur Internet n’est plus une habitude marginale réservée à une minorité technophile : c’est un comportement par *défaut* sur plusieurs continents. Selon la CNUCED, la part du commerce de détail mondial réalisée en ligne serait passée de 7,4 % en 2015 à plus de 19 % en 2022, et cette tendance s’est accélérée sur les marchés où la **pénétration mobile** est élevée mais l’**infrastructure retail physique** est limitée.

Dans notre région, ce schéma est encore plus marqué. Une génération de **petites boutiques en ligne** a émergé sur Instagram, Facebook Marketplace et TikTok Shop, puis a progressivement migré vers de vraies vitrines — Shopify, WooCommerce, ou des plates-formes locales telles que **Vitrina Store** — au fur et à mesure que leurs volumes augmentaient. Ces marchand·e·s partagent un profil commun : une ou deux personnes opérationnelles, un seul ordinateur souvent, pas d’équipe marketing, un budget contraint, une forte incitation à réagir le **jour même** à tout ce qui arrive sur leur boutique, et presque aucun temps pour interpréter un flot de chiffres.

Le Seller Helper est conçu **exactement** pour ce profil de marchand. Le public **n’est pas** le retailer de premier plan doté d’une équipe data et d’un abonnement Looker ; c’est la personne qui gère la boutique depuis son téléphone, entre deux livraisons, et qui a besoin que la **prochaine décision lui soit présentée** plutôt qu’elle doive tout déduire seule·e.

### 1.2 Contexte du projet

Ce travail a été réalisé dans le cadre du projet de fin d’études de la Faculté d’Informatique de l’USTHB. La plateforme d’accueil — **Vitrina Store** — est une boutique Next.js que l’équipe développe depuis deux semestres. Elle comprend un catalogue produits complet, un panier, un tunnel d’achat multi‑étapes, l’intégration de paiement Chargily, un circuit de commandes, un système d’avis, un module de suivi de commande, une page d’accueil marketing statique et une petite administration.

Au fil de la croissance de la plateforme, nous avons observé un paradoxe interne : **plus nous ajoutions de télémétrie, plus la console administrateur devenait difficile à lire**. La vue « admin » commençait à ressembler à *un tableau de bord des tableaux de bords*, et toute décision nécessitait **de passer d’un écran à l’autre** — souvent cinq fois. La marchande ou le marchand — l’utilisateur réel pour lequel nous concevons — **se perdait**.

Le Seller Helper est la réponse à ce paradoxe : une surface **unique** et **orientée action** qui rassemble les indicateurs nécessaires, les classe par priorité, propose des corrections, permet de les appliquer **en un clic**, puis montre si la correction a fait bouger la métrique ciblée.

### 1.3 Importance du sujet

Trois raisons font du Seller Helper un projet de fin d’études non trivial.

La raison **économique** est la plus concrète. Les petites boutiques en ligne vivent sur des **marges fines**. Un produit qui se vend **cinq fois moins** qu’il ne le pourrait à cause d’un mauvais ordre des pastilles « couleur », d’une promotion peu visible ou d’une notation peu apparente représente une perte de revenus qui **se cumule** semaine après semaine. Réduire cette perte est *directement* mesurable en argent ; quelques dixièmes de point de conversion sur un produit à volume moyen peuvent modifier le **revenu mensuel**.

La raison **cognitive** est, selon nous, la plus mal couverte par les outils existant·s. Une personne marchande **non technique** ne peut pas supporter la charge mentale des entonnoirs façon GA4, des appareils, des fenêtres d’attribution et des taux de rebond. Une surface qui **nomme** le goulot d’étranglement et **propose** la correction est, pour elle, **qualitativement différente** d’un tableau qui se contente d’**afficher** des métriques.

La raison **méthodologique** est la plus pertinente pour le public académique. La plupart des produits d’analyse sont *descriptifs*. Lier une **écriture** (le correctif rapide) à une **lecture** (la même métrique ensuite, avec l’action visible comme checkpoint) illustre une discipline d’ingénierie **peu courante** dans les suites d’analyse et qui, selon nous, devrait devenir standard. Cette boucle est la **contribution méthodologique centrale** du projet.

### 1.4 Problématique générale

Réduite à l’essentiel, la question que le Seller Helper adresse est la suivante.

> *Étant donné un flux continu de données comportementales sur une boutique en ligne et un·e marchand·e non expert·e en analyse comme utilisateur·rice, concevoir un compagnon logiciel qui, sur **une seule page**, permet à la marchande ou au marchand (a) de lire la **santé actuelle** de la boutique, (b) d’identifier **quel produit spécifique** sous-performe et **pourquoi**, (c) d’**appliquer une correction concrète en un clic**, et (d) de **vérifier** si la correction a amélioré la métrique visée.*

Le Seller Helper doit être **sûr** (les mutations doivent être auditable·s et récupérable·s), **rapide** (chaque lecture doit répondre en quelques centaines de millisecondes), **explicable** (chaque recommandation doit s’appuyer sur un élément réel de télémétrie, pas sur un *a priori* du modèle) et **économique** (il doit fonctionner sur l’infrastructure existante de la vitrine **sans** service d’analyse séparé ni abonnement SaaS payant).

### 1.5 Objectifs du projet

Les objectifs du projet, dérivés de la problématique, sont formulés ci-dessous en termes **fonctionnels** ; les moyens techniques pour les atteindre sont documentés au **chapitre 5**.

- **O1.** Centraliser **toutes** les lectures dont un·e marchand·e a besoin sur **une seule** page protégée « admin ».
- **O2.** Fournir une **Timeline** qui trace les métriques qui comptent pour le marchand sur des échelles heures / jours / mois, pour **toute la boutique** ou **un produit**.
- **O3.** Repérer les produits qui sous-performent et proposer, pour chacun, jusqu’à **quatre** correctifs merchandising en un clic.
- **O4.** Appliquer chaque correctif comme **action en un clic** et rendre le résultat **immédiatement visible** sur la vitrine.
- **O5.** Enregistrer **chaque** action appliquée et la superposer sur la **même Timeline** pour que cause et effet se lisent sur **un seul** graphique.
- **O6.** Exécuter une couche d’**alertes** qui déclenche les **cinq** incidents qui intéressent une petite boutique : chutes de conversion, trafic anormal, abandon de panier, erreurs JavaScript et problèmes de performance.
- **O7.** Proposer un **flux Sécurité** permettant de bloquer des sessions hostiles **en deux clics**.
- **O8.** Livrer l’ensemble du module **dans** la plateforme existante, **sans** frais supplémentaire et **sans** dépendre d’un service d’analyse séparé.

### 1.6 Organisation du rapport

Le reste de ce rapport s’organise en **onze** chapitres (chapitres 2 à 12).

- Chapitre 2 — *Étude et analyse de l’existant* — étudie le paysage global et local du e-commerce et les outils d’analyse existants.
- Chapitre 3 — *Analyse des besoins* — recense les exigences fonctionnelles et non fonctionnelles, les acteurs et les cas d’usage.
- Chapitre 4 — *Conception du système* — présente la conception fonctionnelle, l’architecture de l’information et les choix UX.
- Chapitre 5 — *Implémentation et réalisation* — concentre la profondeur technique (technologies, modules, algorithmes).
- Chapitre 6 — *Sécurité et optimisation* — aborde sûreté, performance et coût du point de vue du marchand.
- Chapitre 7 — *Tests et validation* — décrit la stratégie de test et la validation sur le terrain avec de vrais marchands.
- Chapitre 8 — *Résultats et discussion* — présente les résultats obtenus et discute les compromis.
- Chapitre 9 — *Conclusion générale* — synthétise la contribution et les objectifs atteints.
- Chapitre 10 — *Perspectives futures* — ouvre la feuille de route à long terme.
- Chapitre 11 — *Annexes* — rassemble personas, descriptions de filaires, gabarits et questionnaire d’entretien.
- Chapitre 12 — *Bibliographie* — clôt par les références.

---

## Chapitre 2 — Étude et analyse de l’existant

### 2.1 Panorama du marché mondial du e-commerce

Le marché mondial du e-commerce est aujourd’hui évalué à **environ 6 000 milliards de dollars US par an** et devrait continuer à croître à un **taux annuel à deux chiffres** au moins jusqu’en 2027. Trois **changements structurels** redessinent le marché et justifient le Seller Helper en tant que projet.

Le premier est la **croissance de la longue traîne**. Les places de marché telles qu’Amazon, AliExpress et Jumia ont absorbé une grande partie de la demande des grandes marques ; ce qui reste, c’est un nombre **croissant** de vendeurs de niche sur le social commerce, des vitrines façon Shopify et des plates-formes locales. **Individuellement** chacun représente des volumes modestes ; **collectivement** ils forment une part non négligeable du marché.

Le second est l’**effondrement du coût d’ouverture d’une boutique**. L’hébergement, le paiement, les modèles et même le texte généré par IA sont devenus des **commodités**. Le nouveau **avantage concurrentiel** est *opérationnel* : à quelle vitesse un·e marchand·e **lit** sa boutique, **décide**, **agit** et **mesure**.

Le troisième est la **fragmentation de l’attention** des acheteur·se·s. Un·e visiteur·e arrive souvent depuis une pub sociale, ne passe que **quelques secondes** sur la page produit, et **convertit sur place** ou **part**. Le **premier écran** de la fiche — titre, image, visibilité du prix, couleur par défaut, extrait de note — est devenu **disproportionné** par rapport au reste de la page.

Ensemble, ces tendances font des décisions tactiques de **merchandising par produit** le **goulot le moins bien servi** du e-commerce petite et moyenne taille. Le Seller Helper est construit **pour cette couche**.

### 2.2 Le paysage du e-commerce algérien et nord-africain

Le e-commerce algérien a longtemps été contraint par **trois** facteurs : infrastructure de paiement par carte limitée, logistique faible hors grandes villes, et forte tradition du **paiement à la livraison**. Ces contraintes se **desserrent** rapidement. L’arrivée de passerelles telles que **Chargily** et **Satim**, la modernisation progressive des réseaux postaux et logistiques privés, et l’explosion du social commerce sur Instagram et TikTok ont produit une **micro‑économie vivante** de petits commerçant·e·s qui *agissent d’abord comme opérateur·rice·s de réseaux sociaux* et *seulement ensuite comme opérateur·rice·s e-commerce*. La même dynamique s’observe au Maroc et en Tunisie, avec des spécificités de paiement et de logistique.

Le schéma typique est le suivant : un·e vendeur·euse commence sur Instagram, vend par messages directs, puis migre vers une **vraie vitrine** lorsque le volume **dépasse** ce qu’elle peut gérer à la main. À cette transition, sa **plus grande difficulté** n’est plus *d’attirer des acheteur·se·s* mais *de comprendre ce qui se passe une fois qu’ils et elles arrivent sur la boutique*. C’est **précisément** à ce moment qu’intervient le Seller Helper.

### 2.3 La petite boutique en ligne — persona

Pour ancrer les choix de conception, nous formalisons un *persona* du marchand Vitrina typique. Ce persona est une **synthèse** des entretiens menés avec **cinq** vrais·es marchand·e·s.

**Persona — Yasmine, 26 ans, fondatrice d’une marque mode monoboutique**

- *Parcours.* Yasmine a fait tourner sa marque sur Instagram *deux ans* avant d’ouvrir une boutique Vitrina il y a *six mois*.
- *Appareils.* Smartphone *80 %* du temps, ordinateur portable *20 %*.
- *Journée type.* Elle se lève, vérifie les commandes de la nuit, répond aux messages directs, prépare les envois du jour, va à la poste, revient, photographie les nouveautés, publie sur Instagram, mange, gère le stock, répond aux commandes en fin de soirée.
- *Points de friction.* « Je n’ai pas le temps de lire cinq tableaux de bord chaque matin. » — « J’ai changé le titre de mon best-seller hier mais je ne me souviens plus si le trafic a augmenté après. » — « Je ne sais pas **quel** produit me fait mal cette semaine. »
- *Outils actuels.* L’admin Vitrina, les statistiques Instagram, le portail marchand Chargily, Google Analytics occasionnel.
- *Outils qu’elle n’utilise pas.* Mixpanel (« trop technique »), Hotjar (« trop cher »), GA4 (« je ne comprends jamais l’entonnoir »).
- *Critère de décision.* Si un outil demande **plus de cinq minutes** de lecture, elle ne s’en sert pas.

Le Seller Helper est entièrement pensé autour de Yasmine : **peu de clics** par interaction, recommandations **courtes**, actions **réversibles** et **traçables**.

### 2.4 Outils d’analyse existants

Le paysage actuel des outils d’analyse se décline en **quatre familles**.

**Famille A — suites analytiques descriptives.** Google Analytics 4, Mixpanel, Plausible, Fathom, Matomo. Elles enregistrent des évènements, construisent sessions et entonnoirs, et laissent l’utilisateur·rice explorer. Elles sont **précises** et, pour l’essentiel, **gratuites ou peu coûteuses**. Elles **ne recommandent pas**, elles **n’agissent pas**, et elles restent **cognitivement coûteuses** pour un·e utilisateur·rice non technique.

**Famille B — cartes de chaleur et rejeu de session.** Hotjar, FullStory, LogRocket, Microsoft Clarity. Elles donnent au marchand un *ressenti* de ce que font les utilisateur·rice·s sur une page produit, mais elles **n’agrègent pas** le comportement en **diagnostic par produit**, elles **ne nomment pas** un goulot précis et elles **n’agissent pas**.

**Famille C — suites de personnalisation d’entreprise.** Dynamic Yield (racheté par Mastercard), Bloomreach, Algolia Recommend. Elles **observent** et **agissent**, avec une personnalisation sophistiquée. Elles coûtent **entre 2 000 et 20 000 dollars US par mois** et visent les retailers de premier plan avec une **équipe opérations** dédiée.

**Famille D — assistants IA pour vitrines.** Shopify Magic, Bold Brain, Sidekick. Ils génèrent du texte, suggèrent des descriptions, recommandent des images. Ils sont **utiles** et **faciles à adopter**, mais ils ferment rarement la boucle sur une **métrique** et restent **centrés texte**.

### 2.5 Outils de personnalisation et de recommandation existants

Au-delà de l’analyse stricte, plusieurs produits attaquent la couche **recommandation**. Les plus visibles sont : Optimizely (tests A/B + personnalisation), Klaviyo (automatisation e-mail et SMS à partir de signaux comportementaux), Rebuy (recommandations Shopify) et Recombee (API de recommandation généraliste). Chacun est un produit solide, mais chacun partage l’**angle mort** que nous voulons combler :

- ils recommandent du *contenu* (produit à *upsell*, e-mail à envoyer), pas des *changements de catalogue* (couleur par défaut, promotion à mettre en avant) ;
- ils n’enregistrent pas *ce que le marchand a fait en réponse* d’une façon qui **réapparaît sur le graphique analytique** ;
- et ils sont tarifés pour des retailers qui ont **déjà** un budget analyse, pas pour les **200** premières commandes mensuelles qu’un·e marchand Vitrina peut traiter.

### 2.6 Points de friction rapportés par les marchands

À partir d’entretiens avec les **cinq** premiers·ères marchand·e·s Vitrina, nous avons recueilli les énoncés récurrents suivants. Ils se mappent **directement** aux **huit** onglets du Seller Helper.

- *« Mon entonnoir dit que je perds des acheteur·se·s entre la vue produit et l’ajout au panier mais je ne sais pas **sur quel** produit. »* → **Vitrina** + **Timeline (périmètre produit)**.
- *« J’ai changé le titre hier mais je ne me souviens pas si le trafic a augmenté après. »* → **Timeline + checkpoints d’actions appliquées**.
- *« Je n’ai pas le temps de lire cinq tableaux de bord chaque matin. »* → **Tableau de bord (vue synthétique unique)**.
- *« Ma promo est sur le produit mais les visiteur·se·s ne la voient pas. »* → **Correctifs rapides Vitrina** : `promo_price`, `quality_highlight`, `trending_countdown`, `hero_review_snippet`.
- *« Je ne sais pas qui bloquer quand les bots attaquent. »* → **Sécurité**.
- *« Je veux une IA qui me donne trois choses à corriger cette semaine. »* → **Recommandations IA** + **Analyser maintenant**.

### 2.7 Comparaison des solutions existantes

Les capacités des solutions existantes par rapport au Seller Helper sont résumées dans le **tableau 2.1**.

| Outil                 | Prix / mois   | Orienté action | Par produit | Boucle fermée | Public cible              |
| --------------------- | ------------- | :------------: | :---------: | :-----------: | ------------------------- |
| Google Analytics 4    | Gratuit       |        —       |      —      |      —        | Toutes tailles            |
| Mixpanel              | Gratuit → 1 000 $ |        —       |      —      |      —        | Équipes produit           |
| Hotjar                | 0 → 200 $     |        —       |      —      |      —        | UX / marketing            |
| Microsoft Clarity     | Gratuit       |        —       |      —      |      —        | Toutes tailles            |
| Plausible / Matomo    | 10 → 50 $     |        —       |      —      |      —        | Boutiques soucieuses vie privée |
| Shopify Magic         | Inclus        |   Texte seul   |    Partiel  |      —        | Marchands Shopify         |
| Klaviyo               | 30 → 1 000 $+ |   E-mail seul  |    Partiel  |      —        | Retail Shopify / SaaS     |
| Optimizely            | ~2 000 $+     |        ✓       |      ✓      |   Partiel     | Retail PME / grands comptes |
| Dynamic Yield         | ~3 000 $+     |        ✓       |      ✓      |   Partiel     | Retail premier plan       |
| Bloomreach            | ~5 000 $+     |        ✓       |      ✓      |   Partiel     | Retail PME / grands comptes |
| **Seller Helper**     | Inclus        |        ✓       |      ✓      |    **Pleine** | Petits marchands Vitrina  |

_Tableau 2.1 — Comparaison des solutions existantes._

La colonne la plus importante est **boucle fermée** : aucune des solutions existantes ne lie une **action appliquée** à la **métrique** qu’elle devait faire bouger. C’est **précisément** là que notre projet est unique.

### 2.8 Positionnement de notre solution

Le Seller Helper ne cherche pas à rivaliser avec l’analyse descriptive sur le **volume** de métriques, avec les cartes de chaleur sur le **ressenti visuel**, ni avec la personnalisation d’entreprise sur la **sophistication** des algorithmes. Il occupe une niche précise : un compagnon admin *opérationnel*, *orienté action*, *par produit*, pour la **petite boutique Vitrina**, livré **dans** la plateforme **sans coût additionnel**, avec la propriété que **chaque action appliquée est mesurable sur le même graphique** que celui qui l’a suggérée.

À notre connaissance, aucune plateforme e-commerce largement déployée ne combine, **dans un seul module admin**, des **recommandations par produit guidées par le comportement**, des **correctifs catalogue en un clic** et une **chronologie d’actions appliquées** superposée aux **mêmes métriques**. Cette combinaison est la **contribution** de ce projet de fin d’études.

---
