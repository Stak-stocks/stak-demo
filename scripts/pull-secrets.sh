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
	# Read straight away: the Secret Accessor role can read a secret's value but not list or describe secrets.
	if gcloud secrets versions access latest --secret "$secret" --project "$PROJECT" > "$path.tmp" 2>/dev/null; then
		mv "$path.tmp" "$path"
		echo "  $file: written"
	else
		rm -f "$path.tmp"
		echo "  $file: couldn't read '$secret' - no access, or not created yet (see SECRETS.md)"
	fi
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
	# Each key read straight away (Secret Accessor can't list secrets). A name dev-backend-local already sets (PORT,
	# GEMINI_DEV_API_KEY...) comes from there; any other it can't read is left out and named.
	local value missing="" localcfg
	localcfg=$(gcloud secrets versions access latest --secret dev-backend-local --project "$PROJECT" 2>/dev/null) || missing=" dev-backend-local"
	{
		echo "# Written by scripts/pull-secrets.sh from Secret Manager - change keys there, not here (SECRETS.md)."
		for name in $(grep -oE '^[A-Z0-9_]+=' "$ROOT/backend/.env.example" | tr -d =); do
			if grep -q "^$name=" <<<"$localcfg"; then continue; fi
			if value=$(gcloud secrets versions access latest --secret "$name" --project "$PROJECT" 2>/dev/null); then
				printf '%s=%s\n' "$name" "$value"
			else
				missing="$missing $name"
			fi
		done
		if [ -n "$localcfg" ]; then printf '%s\n' "$localcfg"; fi
	} > "$path.tmp"
	mv "$path.tmp" "$path"
	echo "  backend/.env: written"
	if [ -n "$missing" ]; then echo "    couldn't read (no access, or not created yet):$missing"; fi
}

echo "Local config from Secret Manager ($PROJECT):"
backend_env
pull dev-frontend-env frontend/.env
pull dev-android-local-properties android/local.properties
pull dev-ios-secrets-xcconfig ios/Secrets.xcconfig
