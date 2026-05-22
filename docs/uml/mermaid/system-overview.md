# Diagrammes système (vue d'ensemble)

Fichiers PlantUML sources (prévisualisation extension **PlantUML** ou `npm run uml:render` si Docker/Java disponible) :

| Diagramme | Fichier |
| --- | --- |
| Séquence global | `../sequence-system-overview.puml` |
| Classes | `../class-system-overview.puml` |
| Cas d'utilisation | `../usecase-system-overview.puml` |
| Activité | `../activity-system-overview.puml` |
| Déploiement | `../deployment-system-overview.puml` |

## Séquence (Mermaid)

```mermaid
sequenceDiagram
  actor V as Visiteur
  actor M as Marchand admin
  participant App as Vitrina Store
  participant API as Routes API
  participant DB as PostgreSQL Neon
  participant LLM as Gemini OpenRouter
  participant Mail as Brevo

  V->>App: Navigation boutique
  App->>API: Micro-événements + séquences
  API->>DB: sales_micro_event, shopping_sequence

  M->>App: Connexion Seller Helper
  App->>API: Analyze now
  API->>DB: Agrégations
  API->>LLM: Snapshot + catalogue
  LLM-->>API: Alertes et recommandations
  API->>DB: conception_alert, conception_recommendation

  M->>App: Send email
  App->>API: send-email
  API->>Mail: Brevo
  API->>DB: Inbox workflow
```

## Cas d'utilisation (Mermaid)

```mermaid
flowchart LR
  subgraph Boutique
    UC1[Parcourir catalogue]
    UC2[Fiche produit]
    UC3[Commande Chargily]
  end
  subgraph Collecte
    UC7[Micro-événements]
    UC8[Tunnel shopping_sequence]
  end
  subgraph SellerHelper
    UC11[Dashboard]
    UC12[Analyze now]
    UC15[Correctifs Vitrina]
    UC16[Envoi e-mail]
    UC17[Inbox]
  end
  V((Visiteur)) --> UC1
  V --> UC2
  V --> UC3
  M((Marchand)) --> UC11
  M --> UC12
  M --> UC15
  M --> UC16
  M --> UC17
  UC2 --> UC7
  UC2 --> UC8
```

## Activité (Mermaid)

```mermaid
flowchart TB
  subgraph Visiteur
    A1[Navigation boutique] --> A2[Fiche produit + tracking]
    A2 --> A3{Checkout ?}
    A3 -->|oui| A4[Paiement Chargily]
    A3 -->|non| A5[Fin séquence]
    A4 --> A6[Achat ou abandon]
  end
  subgraph Marchand
    M1[Connexion Better Auth] --> M2[Seller Helper]
    M2 --> M3[Analyze now]
    M3 --> M4[Règles + LLM]
    M4 --> M5{Action}
    M5 --> Vitrina[Correctif Vitrina]
    M5 --> Email[Send email Brevo]
    M5 --> Inbox[Suivi Inbox]
    M5 --> Sec[Sécurité sessions]
  end
  A2 -.->|Neon| DB[(PostgreSQL)]
  M4 -.-> DB
```

## Déploiement (Mermaid)

```mermaid
flowchart LR
  subgraph Client
    Browser[Navigateur]
  end
  subgraph Vercel
    Next[Next.js App + API]
    Auth[Better Auth]
  end
  subgraph Data
    Neon[(Neon PostgreSQL)]
  end
  subgraph External
    Google[Google OAuth]
    LLM[Gemini / OpenRouter]
    Brevo[Brevo]
    Pay[Chargily]
  end
  Browser --> Next
  Next --> Neon
  Auth --> Google
  Next --> LLM
  Next --> Brevo
  Next --> Pay
```
