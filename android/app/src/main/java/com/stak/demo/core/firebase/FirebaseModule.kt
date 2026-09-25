package com.stak.demo.core.firebase

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/** Firebase singletons — auth/data wiring lands after the UI phases. */
@Module
@InstallIn(SingletonComponent::class)
object FirebaseModule {

	@Provides
	@Singleton
	fun provideFirebaseAuth(): FirebaseAuth = FirebaseAuth.getInstance()

	@Provides
	@Singleton
	fun provideFirestore(): FirebaseFirestore = FirebaseFirestore.getInstance()
}
