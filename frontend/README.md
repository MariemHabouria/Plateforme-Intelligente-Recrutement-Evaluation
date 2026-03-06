# Kilani RH Platform — Frontend React

> Stack : **React 18 + Vite + TypeScript**  
> Style : Light Executive / SAP-style / Institutionnel — palette or Kilani

---

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Copier les variables d'environnement
cp .env.example .env

# 3. Lancer en développement
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

---

## 📁 Structure du projet

```
src/
├── App.tsx                     ← Router principal + gestion des rôles
├── main.tsx                    ← Point d'entrée React
├── index.css                   ← Variables CSS + Design system global
│
├── types/
│   └── index.ts                ← Tous les types TypeScript
│
├── lib/
│   ├── data.ts                 ← Données mockées (rôles, nav, demandes…)
│   └── utils.ts                ← Helpers (cn, badges couleurs…)
│
├── hooks/
│   └── useRole.ts              ← Hook gestion du rôle
│
└── components/
    ├── ui/                     ← Composants réutilisables
    │   ├── index.ts            ← Barrel exports
    │   ├── Badge.tsx
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   ├── Table.tsx
    │   ├── Modal.tsx
    │   ├── Avatar.tsx
    │   ├── Alert.tsx
    │   ├── FormField.tsx       ← Input, Select, Textarea, FormGroup…
    │   ├── ScoreBar.tsx        ← Barre de score IA
    │   └── CircuitSteps.tsx    ← Visualisation circuit de validation
    │
    ├── layout/                 ← Composants de mise en page
    │   ├── index.ts
    │   ├── Sidebar.tsx         ← Navigation latérale (par rôle)
    │   ├── Header.tsx          ← Barre supérieure
    │   └── RoleSwitcher.tsx    ← Switcher de rôle (dev/demo)
    │
    └── pages/
        ├── dashboard/          ← DashboardPage.tsx
        ├── demandes/           ← DemandesPage.tsx + modal création
        ├── offres/             ← OffresPage.tsx
        ├── candidats/          ← CandidatsPage.tsx (scoring IA)
        ├── entretiens/         ← EntretiensPage.tsx
        ├── evaluation/         ← EvaluationPage.tsx (Processus 2 PE)
        ├── contrats/           ← ContratsPage.tsx
        ├── validation/         ← ValidationPage.tsx (circuit)
        └── candidat/           ← CandidatFormPage.tsx (formulaire public)
```

---

## 👥 Rôles disponibles

| Rôle | Pages accessibles |
|------|-------------------|
| **Manager (N+1)** | Dashboard, Demandes, Entretiens, Évaluation PE, Circuit |
| **Directeur (N+2)** | Dashboard, À valider, Demandes, Évaluation PE N+2 |
| **RH / DRH** | Dashboard, Demandes, Offres, Candidatures IA, Entretiens, Éval. PE, Contrats |
| **DAF** | Dashboard, À valider (budget), Demandes |
| **DGA / DG** | Dashboard, À valider (final), Vue globale |
| **Resp. Paie** | Dashboard, Contrats, Données PE |
| **Candidat** | Formulaire public + feedback IA temps réel |

---

## 🎨 Design System

- **Couleur principale** : Or Kilani `#A8935A`
- **Sidebar** : `#1D2235` (dark institutional)
- **Contenu** : Blanc / gris clair — respirable, aéré
- **Typographie** : DM Sans + DM Serif Display (Google Fonts)
- **Style** : Light Executive · SAP-style · ERP institutional

---

## 🔗 Variables d'environnement

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL du backend NestJS (ex: `http://localhost:4000/api`) |
| `VITE_IA_URL` | URL du service IA FastAPI (ex: `http://localhost:8000`) |

---

## 📦 Build production

```bash
npm run build
# Output dans dist/
```
