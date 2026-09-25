package com.stak.demo.ui

import android.content.Context
import android.content.SharedPreferences

/**
 * The user-state store (product audit, 2026-09-05: saves, practice buys,
 * the deck's progress and the notification badge all vanished on a
 * relaunch). A SharedPreferences file separate from the session, keyed
 * per ACCOUNT KIND ("demo." / "new.") so the demo account and a fresh
 * account never read each other's state. Every mutation writes through;
 * Session.applyAccount() reads it back. Mirrors ios StakStore.swift.
 */
object StakStore {
	private const val PREFS = "stak_state"
	private var prefs: SharedPreferences? = null

	fun init(context: Context) {
		if (prefs == null) prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
	}

	private fun key(name: String): String = (if (Session.demoAccount) "demo." else "new.") + name

	fun getString(name: String): String? = prefs?.getString(key(name), null)
	fun putString(name: String, value: String) { prefs?.edit()?.putString(key(name), value)?.apply() }
	fun getInt(name: String, default: Int): Int = prefs?.getInt(key(name), default) ?: default
	fun putInt(name: String, value: Int) { prefs?.edit()?.putInt(key(name), value)?.apply() }
	fun getBoolean(name: String, default: Boolean): Boolean = prefs?.getBoolean(key(name), default) ?: default
	fun putBoolean(name: String, value: Boolean) { prefs?.edit()?.putBoolean(key(name), value)?.apply() }

	/** A set of ids, stored comma-joined; null = no record (an empty set is a record). */
	fun getSet(name: String): Set<String>? = getString(name)?.split(",")?.filter { it.isNotBlank() }?.toSet()
	fun putSet(name: String, value: Set<String>) = putString(name, value.joinToString(","))

	/** Forgets one account kind's state - a brand-new account starts from nothing. */
	fun clearAccount(demo: Boolean) {
		val p = prefs ?: return
		val prefix = if (demo) "demo." else "new."
		val editor = p.edit()
		p.all.keys.filter { it.startsWith(prefix) }.forEach { editor.remove(it) }
		editor.apply()
	}
}
