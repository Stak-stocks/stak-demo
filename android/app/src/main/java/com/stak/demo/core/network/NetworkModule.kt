package com.stak.demo.core.network

import com.stak.demo.data.Session
import com.stak.demo.data.StockApiService
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    private const val BASE_URL = "https://stak-backend-889057229494.us-central1.run.app/"

    @Provides
    @Singleton
    fun provideOkHttpClient(supabase: SupabaseClient): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(45, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            // The Supabase SDK keeps the session current (it refreshes before expiry);
            // Session.token is only the copy taken at sign-in, used until the SDK has one.
            val token = supabase.auth.currentAccessTokenOrNull() ?: Session.token
            val request = if (token != null) {
                chain.request().newBuilder().header("Authorization", "Bearer $token").build()
            } else {
                chain.request()
            }
            chain.proceed(request)
        }
        .authenticator(refreshOn401(supabase))
        .build()

    /**
     * On a 401, refresh the Supabase session once and retry with the new token.
     * Covers requests made before the SDK has loaded or renewed the stored
     * session - e.g. a relaunch hours after the last access token expired.
     */
    private fun refreshOn401(supabase: SupabaseClient) = Authenticator { _, response ->
        if (response.priorResponse != null) return@Authenticator null // already retried once
        val sent = response.request.header("Authorization")?.removePrefix("Bearer ")
        val fresh = runBlocking {
            runCatching {
                supabase.auth.awaitInitialization()
                supabase.auth.refreshCurrentSession()
                supabase.auth.currentAccessTokenOrNull()
            }.getOrNull()
        }
        if (fresh == null || fresh == sent) return@Authenticator null
        Session.setToken(fresh)
        response.request.newBuilder().header("Authorization", "Bearer $fresh").build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(client: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(client)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    @Provides
    @Singleton
    fun provideStockApiService(retrofit: Retrofit): StockApiService =
        retrofit.create(StockApiService::class.java)
}
