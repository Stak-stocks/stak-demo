package com.stak.demo.data

/** A failed Retrofit call's response body (the server's JSON reason), or null when it wasn't an HTTP error or had none. */
fun httpErrorBody(e: Throwable): String? {
	val http = e as? retrofit2.HttpException ?: return null
	return runCatching { http.response()?.errorBody()?.string() }.getOrNull()
}
