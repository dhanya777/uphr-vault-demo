# uphr-vault-demo

In today’s fragmented healthcare system, our medical history is scattered across emails, WhatsApp, and hospital portals, making it hard to give doctors a complete picture. UPHR-Vault solves this by unifying all records in one place and offering ongoing AI support for patients and caregivers.

## Deployment Guide: UPHR-Vault on Cloud Run

As your senior engineering partner, this guide walks through a full production deployment to Google Cloud Run using Cloud Build, Artifact Registry, and Secret Manager. The repository already contains `Dockerfile`, `cloudbuild.yaml`, and related configuration to automate this pipeline.

Checklist
- Google Cloud project with billing enabled
- Authenticated `gcloud` CLI and correct project set
- Secret for Gemini API key stored in Secret Manager
- Artifact Registry repository created (name: `uphr-repo`)

Prerequisites
- Google Cloud Project: create a project and enable billing.
- gcloud CLI: install and authenticate:

```bash
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]
```

- Gemini API Key: have your Gemini API key ready — we will store it securely in Secret Manager.

Step 1 — Enable Required Google Cloud APIs
Run these commands one by one:

```bash
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

Step 2 — Create an Artifact Registry Repository
Create the Docker registry where Cloud Build will push the image. The repo name matches `cloudbuild.yaml` (`uphr-repo`) and the region used there is `us-central1`:

```bash
gcloud artifacts repositories create uphr-repo \
	--repository-format=docker \
	--location=us-central1 \
	--description="Repository for UPHR-Vault application"
```

Note: If you change the region here, update `cloudbuild.yaml` accordingly.

Step 3 — Securely Store Your API Key in Secret Manager
We never hardcode secrets. Create the secret and add your key:

```bash
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
printf "[YOUR_GEMINI_API_KEY]" | gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

Grant Cloud Build permission to access the secret. First, get your project number:

```bash
gcloud projects describe $(gcloud config get-value project) --format='value(projectNumber)'
```

Then substitute the returned PROJECT_NUMBER into the following command:

```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
	--member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
	--role="roles/secretmanager.secretAccessor"
```

Step 4 — Submit the Build and Deploy
From the project root (where `cloudbuild.yaml` lives) run:

```bash
gcloud builds submit --config cloudbuild.yaml .
```

What this does:
- Packages your project and uploads it to a Cloud Storage staging bucket.
- Triggers Cloud Build to run the steps in `cloudbuild.yaml`.
- Cloud Build will build the Docker image, push it to Artifact Registry, and deploy to Cloud Run.
- Secret Manager will inject `GEMINI_API_KEY` into the build step at runtime (the pipeline uses `secretEnv`).

If you previously saw the error "key in the template \"_GEMINI_API_KEY\" is not matched in the substitution data", ensure your `cloudbuild.yaml` uses Secret Manager with `secretEnv` (the repo contains an updated step that runs the docker build under `bash -c` and uses `$$` to avoid substitution-time interpolation).

Step 5 — Verify Your Deployed Application
When the build completes, Cloud Build output includes the Cloud Run Service URL, e.g.:

```
Service [uphr-vault-frontend] revision [uphr-vault-frontend-00001-xyz] has been deployed and is serving 100 percent of traffic at https://uphr-vault-frontend-xxxxxxxxxx-uc.a.run.app
```

Open that URL in your browser to confirm the app is live.

Troubleshooting & Notes
- Secret not found / permission denied: confirm the secret path and that the Cloud Build service account (PROJECT_NUMBER@cloudbuild.gserviceaccount.com) has `roles/secretmanager.secretAccessor` on the secret.
- Substitution error: Cloud Build treats `${...}` in YAML args as substitutions at submit time. The provided `cloudbuild.yaml` uses `entrypoint: bash` with a `docker build` command that consumes `$$_GEMINI_API_KEY` so Cloud Build injects the secret at runtime; do not pass the secret as a substitution unless you understand the security implications.
- Artifact Registry region must match the region in `cloudbuild.yaml`.

Congratulations
You now have a production-ready CI/CD pipeline that builds, stores, and deploys the UPHR-Vault frontend to Cloud Run, while keeping the Gemini API key secure in Secret Manager. This is the Deployed App link you can submit for the BNB Marathon or other demos.

If you want, I can add a short `docs/` page with screenshots of the Cloud Build logs and the Cloud Run console steps.
