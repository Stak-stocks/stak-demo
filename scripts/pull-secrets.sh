#!/usr/bin/env bash
# Writes this machine's local config files from Google Secret Manager (project stak-c21a3), so a new developer gets
# set up with one command instead of files passed around in chat. Nothing here is committed: every file it writes is
# gitignored. Needs `gcloud auth login` with an account that has "Secret Manager Secret Accessor" on the project.
#
#   scripts/pull-secrets.sh          writes the files that don't exist yet
#   scripts/pull-secrets.sh --force  overwrites them too
#
# The backend itself never reads these files: Cloud Run reads each key from Secret Manager directly.
# To change a value: gcloud secrets versions add <name> --project stak-c21a3 --data-file=<file>
set -euo pipefail

PROJECT=stak-c21a3
ROOT=$(cd "$(dirname "$0")/.." && pwd)
FORCE=${1:-}

if ! gcloud auth print-access-token >/dev/null 2>&1; then
	echo "gcloud isn't signed in - run: gcloud auth login" >&2
	exit 1
fi

# secret name -> file it becomes
pull() {
	local secret=$1 file=$2
	local path="$ROOT/$file"
	if [ -e "$path" ] && [ "$FORCE" != "--force" ]; then
		echo "  $file: already there (--force to replace)"
		return
	fi
	if ! gcloud secrets describe "$secret" --project "$PROJECT" >/dev/null 2>&1; then
		echo "  $file: no secret '$secret' yet (see SECRETS.md)"
		return
	fi
	gcloud secrets versions access latest --secret "$secret" --project "$PROJECT" > "$path.tmp"
	mv "$path.tmp" "$path"
	echo "  $file: written"
}

# backend/.env is built from the shared keys themselves (the ones backend/.env.example names), so a rotated key reaches
# this machine on the next --force run - no second copy to keep in step - plus dev-backend-local: settings only a
# development machine has (PORT, the Supabase CLI token...). Keys .env.example doesn't name (REDIS_URL...) stay off
# dev machines, so local runs never touch the live cache.
backend_env() {
	local path="$ROOT/backend/.env"
	if [ -e "$path" ] && [ "$FORCE" != "--force" ]; then
		echo "  backend/.env: already there (--force to replace)"
		return
	fi
	local available
	available=$(gcloud secrets list --project "$PROJECT" --format='value(name)')
	{
		echo "# Written by scripts/pull-secrets.sh from Secret Manager - change keys there, not here (SECRETS.md)."
		for name in $(grep -oE '^[A-Z0-9_]+=' "$ROOT/backend/.env.example" | tr -d =); do
			if grep -qx "$name" <<<"$available"; then
				printf '%s=%s\n' "$name" "$(gcloud secrets versions access latest --secret "$name" --project "$PROJECT")"
			fi
		done
		if grep -qx dev-backend-local <<<"$available"; then
			gcloud secrets versions access latest --secret dev-backend-local --project "$PROJECT"
		fi
	} > "$path.tmp"
	mv "$path.tmp" "$path"
	echo "  backend/.env: written"
}

echo "Local config from Secret Manager ($PROJECT):"
backend_env
pull dev-frontend-env frontend/.env
pull dev-android-local-properties android/local.properties
pull dev-ios-secrets-xcconfig ios/Secrets.xcconfig
