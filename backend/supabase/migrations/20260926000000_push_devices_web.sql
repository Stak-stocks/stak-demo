-- ── push_devices: browser (Web Push) subscriptions ───────────────────────────────────
-- A web subscription reuses the row shape: `token` holds the subscription's endpoint URL (unique per
-- browser profile, the same role an FCM token plays) and `platform` is 'web'. Unlike an FCM token an
-- endpoint can't be sent to on its own - the payload is encrypted to the browser's own keys, so those
-- ride along here. NULL for android/ios rows.
alter table push_devices add column if not exists web_keys jsonb;
