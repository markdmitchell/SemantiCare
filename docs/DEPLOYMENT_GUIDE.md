# DevOps & Production Deployment Runbook

This guide covers building, containerizing, hardening, and deploying SemantiCare across local environments, Docker Compose, and cloud platforms (Render, Vercel, Google Cloud Platform, and AWS).

---

## 1. System Requirements

### Development Environment
* **Operating Systems**: Linux (Ubuntu 22.04+), macOS (Apple Silicon / Intel), Windows 10/11 (with PowerShell 7 or WSL2).
* **Python**: 3.12+ (Python 3.14 fully supported).
* **Node.js**: 20+ LTS (with npm 10+).
* **Docker**: Docker Engine 24+ & Docker Compose v2+.

---

## 2. Local Bare-Metal Setup

### 2.1. Backend Setup (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Create isolated Python virtual environment
python -m venv .venv

# Activate virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS / Linux (bash/zsh):
source .venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Start backend ASGI server in development mode
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Verify backend health:
```bash
curl http://127.0.0.1:8000/api/health
```

### 2.2. Frontend Setup (React 19 + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

The application studio will be accessible at:
* **Web UI**: `http://localhost:5173`
* **Vite API Proxy**: In development, `vite.config.ts` automatically proxies `/api/*` to `http://127.0.0.1:8000`.

---

## 3. Production Containerization (Docker Compose)

The repository provides multi-stage, hardened Docker configurations for production execution without local Python or Node dependencies.

### 3.1. Single-Command Launch
From the repository root:
```bash
docker compose up --build -d
```

### 3.2. Architecture of the Container Stack

```
[Host Browser]
      |
      | Port 3000
      v
[Frontend Container: semanticare-frontend]
- Base: nginx:alpine
- Static bundle: /usr/share/nginx/html
- Reverse proxy: /api/* -> http://backend:8000/api/*
      |
      | Docker Bridge Network: semanticare-network
      v
[Backend Container: semanticare-backend]
- Base: python:3.12-slim
- User: appuser (UID 10001, non-root)
- Process: uvicorn app.main:app --host 0.0.0.0 --port 8000
- Healthcheck: curl -f http://localhost:8000/api/health
```

### 3.3. Docker Operations Cheatsheet
```bash
# Inspect container health
docker compose ps

# Stream backend application logs
docker compose logs -f backend

# Stream frontend reverse proxy logs
docker compose logs -f frontend

# Stop containers gracefully
docker compose down

# Stop containers and prune volumes
docker compose down -v
```

---

## 4. Cloud Deployment Blueprints

### 4.1. 1-Click Deployment on Render
The repository includes a ready-to-use [`render.yaml`](file:///c:/Coding/Healthcare/render.yaml) blueprint:

1. Push your code to a GitHub or GitLab repository.
2. Log in to [Render](https://render.com) and navigate to **Blueprints**.
3. Select your repository. Render automatically provisions:
   * **`semanticare-backend`**: A Python Web Service running `uvicorn app.main:app` with automatic health checks against `/api/health`.
   * **`semanticare-frontend`**: A Static Site serving Vite production assets with `/api/*` rewrites routed to the backend web service.

---

### 4.2. Vercel Deployment (Frontend)
The frontend includes [`frontend/vercel.json`](file:///c:/Coding/Healthcare/frontend/vercel.json) configuring Single Page Application (SPA) routing and backend API rewrites:

```bash
cd frontend
npm install -g vercel
vercel deploy --prod
```

Configure environment variable:
* `VITE_API_URL`: URL of your deployed backend service (e.g. `https://semanticare-backend.onrender.com`).

---

### 4.3. Google Cloud Platform (Cloud Run)
Deploying to Google Cloud Run allows zero-scale serverless execution and direct integration with the **Google Cloud Healthcare API FHIR Store**:

#### Backend on Cloud Run:
```bash
# Build and submit backend container to Google Artifact Registry
gcloud builds submit ./backend \
  --tag gcr.io/[PROJECT_ID]/synapse-hl7-backend:latest

# Deploy to Cloud Run
gcloud run deploy synapse-hl7-backend \
  --image gcr.io/[PROJECT_ID]/synapse-hl7-backend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ENVIRONMENT=production
```

#### Frontend on Cloud Run:
```bash
# Build and deploy frontend container
gcloud builds submit ./frontend \
  --tag gcr.io/[PROJECT_ID]/synapse-hl7-frontend:latest

gcloud run deploy synapse-hl7-frontend \
  --image gcr.io/[PROJECT_ID]/synapse-hl7-frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

### 4.4. AWS (ECS Fargate + HealthLake)
1. Push `backend/Dockerfile` and `frontend/Dockerfile` to Amazon Elastic Container Registry (ECR).
2. Provision an AWS ECS Task Definition referencing both containers or deploying them as independent microservices behind an Application Load Balancer (ALB).
3. Connect the Direct FHIR Push feature to an **AWS HealthLake Data Store** by specifying the HealthLake FHIR endpoint and configuring SigV4 / OAuth2 Bearer token authentication.

---

## 5. Security & Production Hardening Checklist

| Area | Best Practice | Implementation in SynapseHL7 |
| :--- | :--- | :--- |
| **User Privileges** | Non-root container process | `appuser` (UID 10001) in `backend/Dockerfile` |
| **Data Protection** | In-flight data encryption | TLS 1.3 termination at Nginx / Ingress |
| **HIPAA Compliance** | Reversible zero-trust de-identification | Pre-flight regex & structural NER token vault |
| **CORS Lockdown** | Restrict permitted origins | Configurable CORS middleware in `backend/app/main.py` |
| **Dependency Auditing**| Freeze and scan dependencies | Frozen `requirements.txt` & pinned `package.json` |
| **Health Probes** | Automated liveness & readiness probes | Docker `HEALTHCHECK` against `/api/health` |

---

## 6. Automated Testing in CI/CD

Integrate these commands into your GitHub Actions or GitLab CI pipeline:

```yaml
# Example GitHub Actions step
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - name: Install backend dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      - name: Run Unit & Conformance Tests
        run: |
          cd backend
          python test_parser.py
          python test_mapper.py
          python test_validator.py
          python test_e2e_pipeline.py
      - name: Verify Frontend Compilation
        run: |
          cd frontend
          npm ci
          npm run build
```
