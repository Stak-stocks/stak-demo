package com.stak.demo.ui.components

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.view.WindowManager
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalContext

/** How many screens on show pad for the keyboard themselves (imePadding); the window's mode follows the count. */
private var padding = 0
private var before = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_UNSPECIFIED

/**
 * For a screen that moves its own content above the keyboard (imePadding): while it's on show the window is set to
 * adjustResize - edge to edge that no longer resizes it, but it stops the system also sliding the window up (the
 * content then moved twice) and makes the keyboard's height reach Compose on Android 8-10, where otherwise it reads 0.
 * Only those screens: the others' fields still rely on the window sliding. Counted, because during a transition the
 * next screen arrives before the last one leaves.
 */
@Composable
fun PadsForKeyboard() {
	val window = LocalContext.current.findActivity()?.window ?: return
	DisposableEffect(window) {
		if (padding++ == 0) {
			before = window.attributes.softInputMode and WindowManager.LayoutParams.SOFT_INPUT_MASK_ADJUST
			window.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
		}
		onDispose {
			if (--padding == 0) window.setSoftInputMode(before)
		}
	}
}

private tailrec fun Context.findActivity(): Activity? = when (this) {
	is Activity -> this
	is ContextWrapper -> baseContext.findActivity()
	else -> null
}
