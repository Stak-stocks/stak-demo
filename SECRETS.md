# Keys and secrets

Every key lives in one place: **Google Secret Manager** in the `stak-c21a3` Google Cloud project. Nothing secret is
committed to this repo (it's public); the repo only has example files that name the keys.

## Getting set up (new developer)

1. Ask for the **Secret Manager Secret Accessor** role on `stak-c21a3`.
2. `gcloud auth login`
3. `scripts/pull-secrets.sh` - writes `backend/.env`, `frontend/.env`, `android/local.properties` and
   `ios/Secrets.xcconfig` (all gitignored). Existing files are kept; `--force` replaces them with the latest values -
   run it after anyone changes a key.

`backend/.env` is built from the backend's own keys (the ones `backend/.env.example` names) plus
`dev-backend-local`, so it is never a second copy that can fall behind. Keys `.env.example` doesn't name (like
`REDIS_URL`) stay off development machines, so a local run never touches the live cache.

App users never need any of this: the app's values are built into it when it's built.

## Where each key is used

| Secret | Used by |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`, `SUPABASE_ANON_KEY` | Backend (Cloud Run) |
| `GEMINI_API_KEY` (+`_2`, `_3`), `FINNHUB_API_KEY` (+`_2`, `_3`), `FMP_API_KEY` (+`_2`), `NEWSAPI_KEY`, `YOUTUBE_API_KEY` | Backend |
| `REDIS_URL`, `ADMIN_SECRET`, `WARM_SECRET`, `WAITLIST_TOKEN_SECRET`, `TALLY_SIGNING_SECRET`, `TALLY_FORM_URL` | Backend |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Backend (web push) |
| `EARLY_ACCESS_RESEND_KEY`, `ANALYTICS_EXCLUDED_EMAILS` | Backend |
| `APPLE_SIGNIN_KEY_P8` (secret `apple-signin-key-p8`), `SUPABASE_MANAGEMENT_TOKEN` | Backend - the monthly renewal of the website's Sign in with Apple secret (below) |
| `GEMINI_EVAL_API_KEY` | The STAK AI test script only (`backend/src/scripts/stakAiEval.ts`) - a billed key kept apart from the live ones |
| `dev-backend-local` | Settings only a development machine has (`PORT`, the Supabase CLI token, and `GEMINI_DEV_API_KEY` - a Gemini key for local runs, used instead of the live ones whenever it's set) |
| `dev-frontend-env` | `frontend/.env` |
| `dev-android-local-properties` | `android/local.properties` |
| `dev-ios-secrets-xcconfig` | `ios/Secrets.xcconfig` |
| `dev-ios-google-service-info` | `ios/StakDemo/GoogleService-Info.plist` - Firebase's iOS config; push stays off without it |

The backend reads its keys from Secret Manager directly (Cloud Run secret references), so a deploy never needs a
key on the machine that deploys.

## Sign in with Apple on the website

Supabase's Apple provider (Authentication -> Sign In / Providers -> Apple) needs a "Secret Key (for OAuth)": a JWT
signed with the Sign in with Apple key, which Apple accepts for **at most 6 months**. When it lapses, Apple sign-in on
the website stops working (the iPhone app is unaffected).

It renews itself: Cloud Scheduler's `stak-apple-secret-renew` calls `POST /api/internal/apple-secret/renew` on the
1st of each month, which makes a fresh secret and sets it on Supabase (`services/appleClientSecret.ts`). Each run
logs `[apple-secret] renewed; expires <date>` - the latest one is the current expiry. A failed run shows in Cloud
Scheduler and logs `[apple-secret] renewal failed: <reason>` (usually the Supabase token was revoked). Five monthly
runs can fail before the secret actually lapses.

One-time setup (done 2026-11):

```sh
# a Supabase access token (Account -> Access Tokens): Project = STAK only, Auth read & write only, no expiry -
# stored as SUPABASE_MANAGEMENT_TOKEN in Secret Manager. Then:
SA=serviceAccount:889057229494-compute@developer.gserviceaccount.com
gcloud secrets add-iam-policy-binding apple-signin-key-p8 --project stak-c21a3 --member=$SA --role=roles/secretmanager.secretAccessor
gcloud secrets add-iam-policy-binding SUPABASE_MANAGEMENT_TOKEN --project stak-c21a3 --member=$SA --role=roles/secretmanager.secretAccessor
gcloud run services update stak-backend --region us-central1 --project stak-c21a3   --update-secrets=APPLE_SIGNIN_KEY_P8=apple-signin-key-p8:latest,SUPABASE_MANAGEMENT_TOKEN=SUPABASE_MANAGEMENT_TOKEN:latest
gcloud scheduler jobs create http stak-apple-secret-renew --project stak-c21a3 --location us-central1   --schedule "0 9 1 * *" --time-zone America/New_York --http-method POST --max-retry-attempts 3   --uri https://stak-backend-889057229494.us-central1.run.app/api/internal/apple-secret/renew   --headers "x-warm-secret=$(gcloud secrets versions access latest --secret=WARM_SECRET --project stak-c21a3)"
```

If either secret is deleted or made unreadable, Cloud Run won't start a new revision (the deploy's canary check fails
and traffic stays on the old one). To renew right now, run the job: `gcloud scheduler jobs run stak-apple-secret-renew
--project stak-c21a3 --location us-central1`. By hand, without the backend:

```sh
gcloud secrets versions access latest --secret=apple-signin-key-p8 --project=stak-c21a3 > AuthKey.p8
node scripts/apple-client-secret.mjs AuthKey.p8 | clip    # paste into Supabase, then:
rm AuthKey.p8
```

| What | Value |
|---|---|
| Services ID (the website's client ID) | `com.stak.demo.web` |
| Supabase Apple "Client IDs" | `com.stak.demo.web,com.stak.demo` - the website's first (Supabase uses the first for the web sign-in) |
| Key | "STAK Sign in with Apple", Key ID `5NH9HT5BA3` (Apple Developer -> Keys); the `.p8` is `apple-signin-key-p8` |
| Team ID | `P6442U4672` |
| Current expiry | The latest `[apple-secret] renewed` log line (the first, made by hand 2026-10-31, expires 2027-04-29) |

## Changing a key

Where a change lands:

| Where | Picks it up |
|---|---|
| Live backend | At its next new revision (`npm run deploy:backend`) - Cloud Run reads `:latest` when an instance starts |
| Developer machines | `scripts/pull-secrets.sh --force` |
| iOS and Android apps | The next app build (the values are built in) |
| Website | Vercel's own environment settings - change it there too |

```sh
# a backend key: add a version, then deploy so Cloud Run picks up :latest
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
