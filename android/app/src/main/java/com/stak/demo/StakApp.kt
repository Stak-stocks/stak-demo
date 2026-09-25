package com.stak.demo

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class StakApp : Application() {
	override fun onCreate() {
		super.onCreate()
		// Persisted session: restores sign-in state + profile before the
		// splash decides where to go. Lives here, not in a composable's
		// remember {} - composition must not mutate app state (audit 2026-09-04).
		com.stak.demo.ui.Session.init(this)
	}
}
