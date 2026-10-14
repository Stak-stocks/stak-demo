# Keys and secrets

Every key lives in one place: **Google Secret Manager** in the `stak-c21a3` Google Cloud project. Nothing secret is
committed to this repo (it's public); the repo only has example files that name the keys.

## Getting set up (new developer)

1. Ask for the **Secret Manager Secret Accessor** role on `stak-c21a3`.
2. `gcloud auth login`
3. `scripts/pull-secrets.sh` - writes `backend/.env`, `frontend/.env`, `android/local.properties` and
   `ios/Secrets.xcconfig` (all gitignored). Existing files are kept; `--force` replaces them.

App users never need any of this: the app's values are built into it when it's built.

## Where each key is used

| Secret | Used by |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_ANON_KEY` | Backend (Cloud Run) |
| `GEMINI_API_KEY` (+`_2`, `_3`), `FINNHUB_API_KEY` (+`_2`, `_3`), `FMP_API_KEY` (+`_2`), `NEWSAPI_KEY`, `YOUTUBE_API_KEY` | Backend |
| `REDIS_URL`, `ADMIN_SECRET`, `WARM_SECRET`, `WAITLIST_TOKEN_SECRET`, `TALLY_SIGNING_SECRET`, `TALLY_FORM_URL` | Backend |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Backend (web push) |
| `EARLY_ACCESS_RESEND_KEY`, `ANALYTICS_EXCLUDED_EMAILS` | Backend |
| `dev-backend-env` | `backend/.env` for local development |
| `dev-frontend-env` | `frontend/.env` |
| `dev-android-local-properties` | `android/local.properties` |
| `dev-ios-secrets-xcconfig` | `ios/Secrets.xcconfig` |

The backend reads its keys from Secret Manager directly (Cloud Run secret references), so a deploy never needs a
key on the machine that deploys.

## Changing a key

```sh
# a backend key: add a version, then deploy (or roll a new revision) so Cloud Run picks up :latest
printf '%s' 'NEW_VALUE' | gcloud secrets versions add GEMINI_API_KEY --project stak-c21a3 --data-file=-

# a whole local file
gcloud secrets versions add dev-ios-secrets-xcconfig --project stak-c21a3 --data-file=ios/Secrets.xcconfig
```

## Adding a backend key

```sh
printf '%s' 'VALUE' | gcloud secrets create NEW_KEY --project stak-c21a3 --replication-policy=automatic --data-file=-
gcloud secrets add-iam-policy-binding NEW_KEY --project stak-c21a3 \
  --member=serviceAccount:889057229494-compute@developer.gserviceaccount.com --role=roles/secretmanager.secretAccessor
gcloud run services update stak-backend --region us-central1 --project stak-c21a3 --update-secrets=NEW_KEY=NEW_KEY:latest
```

Add the name to `backend/.env.example` too.

## Never

- Commit a real `.env`, `local.properties` or `Secrets.xcconfig`.
- Paste a key into chat or an issue.
- Set a key as a plain Cloud Run environment variable: anyone who can view the service can read those.
