#!/bin/sh
# Xcode Cloud runs this right after cloning, before it builds. The Mac setup is done by hand there (see
# IOS_HANDOFF.md); here it's this script: the project is generated from project.yml (the committed .xcodeproj can
# lag behind it), and the two gitignored files come from the workflow's environment variables (Xcode Cloud ->
# workflow -> Environment; mark the values Secret):
#   SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_IOS_CLIENT_ID, GOOGLE_REVERSED_CLIENT_ID  -> Secrets.xcconfig
#   GOOGLE_SERVICE_INFO_PLIST_B64 (base64 of GoogleService-Info.plist)                -> push
set -eu

cd "$CI_PRIMARY_REPOSITORY_PATH/ios"

missing=""
for name in SUPABASE_URL SUPABASE_ANON_KEY GOOGLE_IOS_CLIENT_ID GOOGLE_REVERSED_CLIENT_ID GOOGLE_SERVICE_INFO_PLIST_B64; do
	eval "value=\${$name:-}"
	[ -n "$value" ] || missing="$missing $name"
done
if [ -n "$missing" ]; then
	echo "error: missing Xcode Cloud environment variables:$missing" >&2
	exit 1
fi

# Values only, never echoed: the build log is visible to everyone on the team.
cat > Secrets.xcconfig <<EOF
SUPABASE_URL = $SUPABASE_URL
SUPABASE_ANON_KEY = $SUPABASE_ANON_KEY
GOOGLE_IOS_CLIENT_ID = $GOOGLE_IOS_CLIENT_ID
GOOGLE_REVERSED_CLIENT_ID = $GOOGLE_REVERSED_CLIENT_ID
EOF
echo "$GOOGLE_SERVICE_INFO_PLIST_B64" | base64 --decode > StakDemo/GoogleService-Info.plist

brew install xcodegen
# Xcode Cloud won't resolve packages itself: it builds the versions pinned in Package.resolved, so that file is kept
# across the regeneration.
resolved=StakDemo.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved
cp "$resolved" /tmp/Package.resolved
xcodegen generate
mkdir -p "$(dirname "$resolved")"
cp /tmp/Package.resolved "$resolved"
echo "Generated StakDemo.xcodeproj and the two config files."
