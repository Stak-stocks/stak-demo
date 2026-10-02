#!/usr/bin/env bash
# Deploys the backend to Cloud Run and moves traffic to it only once it's proven healthy.
#
#   npm run deploy:backend        (from the repo root)
#
# 1. Builds and deploys a new revision with no traffic, tagged "canary".
# 2. Checks the canary: /api/health must say the database is connected (several times, so one lucky instance
#    doesn't pass a revision that can't reach Postgres - see 2026-09-28), and a signed-in route must answer 401.
# 3. Passed: all traffic follows the latest revision. Failed: traffic stays where it was, nothing to roll back.
#
# Rollback later: gcloud run services update-traffic stak-backend --region us-central1 --to-revisions <previous>=100
set -euo pipefail

SERVICE=stak-backend
REGION=us-central1
PROJECT=stak-c21a3
CANARY=https://canary---stak-backend-4qfuv2xtxa-uc.a.run.app
LIVE=https://stak-backend-889057229494.us-central1.run.app

cd "$(dirname "$0")/.."

if ! gcloud auth print-access-token >/dev/null 2>&1; then
	echo "gcloud isn't signed in - run: gcloud auth login" >&2
	exit 1
fi

before=$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" --format='value(status.traffic[0].revisionName)')
echo "Live now: $before"

echo "Deploying a new revision with no traffic..."
gcloud run deploy "$SERVICE" --source . --clear-base-image --region "$REGION" --project "$PROJECT" --no-traffic --tag canary --quiet

new=$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" --format='value(status.latestCreatedRevisionName)')
echo "New revision: $new"

healthy() {
	local ok=0
	for i in 1 2 3 4 5; do
		body=$(curl -s --max-time 20 "$CANARY/api/health" || true)
		if [[ "$body" == *'"db":"connected"'* ]]; then
			ok=$((ok + 1))
		else
			echo "  health check $i: ${body:-no response}"
		fi
		sleep 3
	done
	# Allow one miss for a cold start; more means something's wrong.
	[[ $ok -ge 4 ]] || return 1
	code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$CANARY/api/stak-ai/usage" || true)
	[[ "$code" == "401" ]] || { echo "  signed-in route answered $code, expected 401"; return 1; }
}

echo "Checking the canary..."
if ! healthy; then
	echo "Canary failed its checks - traffic stays on $before. Check the logs for $new." >&2
	exit 1
fi

echo "Canary healthy - moving all traffic to the latest revision..."
gcloud run services update-traffic "$SERVICE" --region "$REGION" --project "$PROJECT" --to-latest --quiet

live=$(curl -s --max-time 20 "$LIVE/api/health" || true)
echo "Live health: $live"
echo "Done: $new is live (was $before)."
