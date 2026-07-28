# Plateforme RH

Cette plateforme gère le recrutement et les RH avec de l'intelligence artificielle : analyse des CV, matching offres/candidats, planification des entretiens, validation des contrats, et tableaux de bord.

## Fonctionnalités principales

- **Authentification & utilisateurs** — gestion des comptes et des rôles (`authController`, `user.controller`)
- **Gestion des offres d'emploi** — création et suivi des offres (`offreController`)
- **Candidatures** — dépôt et suivi des candidatures (`candidatureController`, `uploadController`)
- **Matching inverse** — mise en correspondance candidat → offres compatibles (`matchingInverseController`)
- **Scoring & configuration IA** — paramétrage des modèles de scoring des CV (`scoringConfigController`)
- **Entretiens** — planification interne et publique des entretiens (`entretienController`, `publicEntretienController`)
- **Évaluation période d'essai** — circuit d'évaluation PE (`evaluationPEController`)
- **Contrats & avenants** — gestion des contrats (`contratController`)
- **Circuit de validation** — configuration du circuit de recrutement (`circuitConfigController`)
- **Tableaux de bord** — KPIs et indicateurs RH (`dashboardController`)
- **Demandes internes** — gestion des demandes RH (`demandeController`)
- **Offres d'emploi (jobs)** — module dédié aux annonces
- **Journal d'audit** — traçabilité des actions (`auditLogController`)

## Architecture

Projet full-stack composé de 3 services principaux :

| Service | Stack | Rôle |
|---|---|---|
| `backend/` | Node.js / Express | API métier, auth, gestion RH |
| `frontend/` | React (Vite) | Interface utilisateur |
| `ia_service/` | FastAPI (Python) | Scoring CV, matching offres/candidats |
| `n8n/workflows/` | n8n | Automatisation (circuit de validation, relances, rappels) |

Base de données : PostgreSQL (Neon), file/queue : Redis + BullMQ.

## Module IA

Le `ia_service` est un microservice Python (FastAPI) indépendant du backend. Il extrait automatiquement les informations d'un CV PDF (compétences, expérience, formation, langues...), puis calcule un score de compatibilité CV/offre sur 100 grâce à un modèle hybride M3 : 55% règles expertes pondérées (compétences, expérience, formation...) + 45% embeddings sémantiques (SentenceTransformer). Il gère aussi le matching inverse, qui identifie les meilleurs candidats disponibles pour une offre donnée.

## Installation

### Prérequis
- Node.js 18+
- Python 3.10+ (avec `venv` pour l'environnement virtuel)
- PostgreSQL (ou compte Neon)
- Docker & Docker Compose (optionnel)

### 1. Cloner le repo
```bash
git clone https://github.com/MariemHabouria/Plateforme-Intelligente-Recrutement-Evaluation.git
cd Plateforme-Intelligente-Recrutement-Evaluation
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # puis remplir les variables (voir section Configuration)
npm run dev             # démarre sur le port 5000
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev              # démarre sur le port 5173
```

### 4. IA Service
```bash
cd ia_service
python -m venv venv
source venv/bin/activate   # ou venv\Scripts\activate sous Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### 5. Avec Docker Compose (tous les services)
```bash
docker-compose up --build
```

## Configuration (variables d'environnement)

<details>
<summary>Backend (.env)</summary>

```dotenv
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_db_name
DB_USER=postgres
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRE=7d
FRONTEND_URL=http://localhost:5173
IA_SERVICE_URL=http://localhost:8001
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repo_name
GITHUB_TOKEN=your_github_personal_access_token

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_smtp_email@gmail.com
SMTP_PASS=your_smtp_app_password
SMTP_FROM="RH Platform" <your_smtp_email@gmail.com>

BACKEND_URL=http://localhost:5000
VALIDATION_SECRET=your_validation_secret
N8N_WEBHOOK_SECRET=your_n8n_webhook_secret
N8N_WEBHOOK_URL_CIRCUIT=http://localhost:5678/webhook/recrutement
```
</details>

<details>
<summary>Frontend (.env)</summary>

```dotenv
VITE_APP_NAME=RH Platform
VITE_API_URL=http://localhost:5000/api
VITE_IA_URL=http://localhost:8001
```
</details>

<details>
<summary>IA Service (.env)</summary>

```dotenv
UPLOAD_DIR=./uploads
DEV_MODE=true
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
ALLOWED_ORIGINS=http://localhost:5000,http://localhost:3000
LOG_LEVEL=INFO
LOKY_MAX_CPU_COUNT=4
HF_TOKEN=your_huggingface_token
```
</details>

> Ne jamais commiter de fichier `.env` réel. Utiliser `.env.example` comme référence.

## Dépendances IA Service

```
fastapi==0.110.3
uvicorn[standard]==0.29.0
pydantic==2.7.1
asyncpg==0.29.0
PyMuPDF==1.24.11
pdfplumber==0.11.1
spacy==3.7.4
sentence-transformers==3.0.1
scikit-learn==1.4.2
joblib==1.4.2
numpy==1.26.4
pytest==8.2.0
httpx==0.27.0
python-multipart==0.0.9
```

## Tests

```bash
# Backend / Frontend
npm test

# IA Service
pytest
```

## CI/CD

- **GitHub Actions** : workflow CI (lint, tests, build) opérationnel sur push/PR
- **Docker Compose** : orchestration multi-services en cours de finalisation (build local)
- **Docker Hub** : images à publier pour le déploiement sur l'infrastructure de l'entreprise (à venir)

## Réentraînement automatique du modèle IA

Un workflow GitHub Actions (`retrain-ia-model.yml`, déclenché manuellement) automatise le réentraînement du modèle de scoring :

1. Export des données d'entraînement depuis PostgreSQL
2. Exécution du notebook de réentraînement (papermill)
3. Marquage des feedbacks utilisés
4. Push automatique du modèle mis à jour (`structure_model.pkl`) si amélioration
5. Notification du service IA (FastAPI) une fois le nouveau modèle disponible

Ce workflow est utilisé en complément du circuit n8n (déclenchement de la demande de réentraînement et suivi).




## Licence

Projet interne. Tous droits réservés.