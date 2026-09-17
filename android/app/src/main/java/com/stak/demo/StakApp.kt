package com.stak.demo

import android.app.Application
import com.stak.demo.data.MyStakHoldings
import com.stak.demo.data.Session
import com.stak.demo.data.StockRepository
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.android.HiltAndroidApp
import dagger.hilt.components.SingletonComponent

@HiltAndroidApp
class StakApp : Application() {

	@EntryPoint
	@InstallIn(SingletonComponent::class)
	interface AppEntryPoint {
		fun stockRepository(): StockRepository
	}

	override fun onCreate() {
		super.onCreate()
		// Persisted session: restores sign-in state + profile before the
		// splash decides where to go. Lives here, not in a composable's
		// remember {} - composition must not mutate app state (audit 2026-09-04).
		Session.init(this)
		val repository = EntryPointAccessors.fromApplication(this, AppEntryPoint::class.java).stockRepository()
		MyStakHoldings.init(repository)
		com.stak.demo.data.StakNotifications.init(repository)
		com.stak.demo.data.PushRegistration.init(this, repository)
		com.stak.demo.data.PushRegistration.sync()
		com.stak.demo.data.LiveQuotes.init(repository)
	}
}
