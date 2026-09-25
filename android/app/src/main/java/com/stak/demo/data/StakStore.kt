package com.stak.demo.data

import android.content.Context
import android.content.SharedPreferences

/**
 * The user-state store (product audit, 2026-09-05: saves, practice buys,
 * the deck's progress and the notification badge all vanished on a
 * relaunch). A SharedPreferences file separate from the session, keyed
 * per ACCOUNT: "demo." for the demo persona, "u.<user id>." for a real account
 * (the id is the Supabase JWT subject), so logging out and back in restores that
 * account's own state and a second account on the phone never reads it. Every
 * mutation writes through; Session.applyAccount() reads it back. Mirrors ios
 * StakStore.swift.
 */
object StakStore {
	private const val PREFS = "stak_state"
	private var prefs: SharedPreferences? = null

	fun init(context: Context) {
		if (prefs == null) prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
	}

	private fun prefix(): String = when {
		Session.demoAccount -> "demo."
		Session.accountId != null -> "u.${Session.accountId}."
		else -> "anon."
	}

	private fun key(name: String): String = prefix() + name

	fun getString(name: String): String? = prefs?.getString(key(name), null)
	fun putString(name: String, value: String) { prefs?.edit()?.putString(key(name), value)?.apply() }
	fun remove(name: String) { prefs?.edit()?.remove(key(name))?.apply() }
	fun getInt(name: String, default: Int): Int = prefs?.getInt(key(name), default) ?: default
	fun putInt(name: String, value: Int) { prefs?.edit()?.putInt(key(name), value)?.apply() }
	fun getBoolean(name: String, default: Boolean): Boolean = prefs?.getBoolean(key(name), default) ?: default
	fun putBoolean(name: String, value: Boolean) { prefs?.edit()?.putBoolean(key(name), value)?.apply() }

	/** A set of ids, stored comma-joined; null = no record (an empty set is a record). */
	fun getSet(name: String): Set<String>? = getString(name)?.split(",")?.filter { it.isNotBlank() }?.toSet()
	fun putSet(name: String, value: Set<String>) = putString(name, value.joinToString(","))

	/** Forgets the current account's state (Delete account). */
	fun clearAccount() {
		val p = prefs ?: return
		val prefix = prefix()
		val editor = p.edit()
		p.all.keys.filter { it.startsWith(prefix) }.forEach { editor.remove(it) }
		editor.apply()
	}

	/**
	 * Before per-user keys, every real account shared "new." and was wiped at each sign-in.
	 * A user already signed in when the update lands keeps that state (moved under their id);
	 * anything left over belonged to a session that has since ended and is dropped.
	 */
	fun migrateLegacy(accountId: String?) {
		val p = prefs ?: return
		val legacy = p.all.filterKeys { it.startsWith("new.") }
		if (legacy.isEmpty()) return
		val editor = p.edit()
		legacy.forEach { (k, v) ->
			editor.remove(k)
			if (accountId != null) {
				val target = "u.$accountId." + k.removePrefix("new.")
				if (!p.contains(target)) when (v) {
					is String -> editor.putString(target, v)
					is Int -> editor.putInt(target, v)
					is Boolean -> editor.putBoolean(target, v)
					is Long -> editor.putLong(target, v)
					is Float -> editor.putFloat(target, v)
				}
			}
		}
		editor.apply()
	}
}
