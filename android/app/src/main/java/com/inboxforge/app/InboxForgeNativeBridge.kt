package com.inboxforge.app

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface

/**
 * Native Android JavaScriptInterface Bridge for InboxForge.
 * Exposes hardware haptics, encrypted credentials storage, system theming,
 * native sharing, and network health checks to the React application.
 */
class InboxForgeNativeBridge(
    private val activity: MainActivity,
    private val secureStore: SecureTokenStore,
    private val networkObserver: NetworkStatusObserver
) {

    private val vibrator: Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vibratorManager = activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
        vibratorManager?.defaultVibrator
    } else {
        @Suppress("DEPRECATION")
        activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

    @JavascriptInterface
    fun isNativeApp(): Boolean {
        return true
    }

    @JavascriptInterface
    fun getAppVersion(): String {
        return "1.0.0 (Android)"
    }

    @JavascriptInterface
    fun triggerHaptic(patternType: String) {
        if (vibrator == null || !vibrator.hasVibrator()) return

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                when (patternType.lowercase()) {
                    "light", "selection" -> {
                        vibrator.vibrate(VibrationEffect.createOneShot(12, VibrationEffect.DEFAULT_AMPLITUDE))
                    }
                    "medium" -> {
                        vibrator.vibrate(VibrationEffect.createOneShot(25, 180))
                    }
                    "heavy" -> {
                        vibrator.vibrate(VibrationEffect.createOneShot(45, 255))
                    }
                    "success" -> {
                        val timings = longArrayOf(0, 15, 40, 25)
                        val amplitudes = intArrayOf(0, 150, 0, 220)
                        vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
                    }
                    "warning" -> {
                        val timings = longArrayOf(0, 30, 50, 40)
                        val amplitudes = intArrayOf(0, 200, 0, 255)
                        vibrator.vibrate(VibrationEffect.createWaveform(timings, amplitudes, -1))
                    }
                    else -> {
                        vibrator.vibrate(VibrationEffect.createOneShot(15, VibrationEffect.DEFAULT_AMPLITUDE))
                    }
                }
            } else {
                @Suppress("DEPRECATION")
                vibrator.vibrate(20)
            }
        } catch (_: Exception) {}
    }

    @JavascriptInterface
    fun shareText(title: String, text: String, url: String?) {
        activity.runOnUiThread {
            try {
                val sendIntent = Intent().apply {
                    action = Intent.ACTION_SEND
                    putExtra(Intent.EXTRA_TITLE, title)
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    val shareBody = if (!url.isNullOrEmpty()) "$text\n$url" else text
                    putExtra(Intent.EXTRA_TEXT, shareBody)
                    type = "text/plain"
                }
                val chooser = Intent.createChooser(sendIntent, title)
                activity.startActivity(chooser)
            } catch (_: Exception) {}
        }
    }

    @JavascriptInterface
    fun saveSecureToken(key: String, value: String) {
        secureStore.saveToken(key, value)
    }

    @JavascriptInterface
    fun getSecureToken(key: String): String? {
        return secureStore.getToken(key)
    }

    @JavascriptInterface
    fun removeSecureToken(key: String) {
        secureStore.removeToken(key)
    }

    @JavascriptInterface
    fun setStatusBarTheme(isDark: Boolean) {
        activity.runOnUiThread {
            activity.applyStatusBarTheme(isDark)
        }
    }

    @JavascriptInterface
    fun onWebPageReady() {
        activity.runOnUiThread {
            activity.dismissSplashScreen()
        }
    }

    @JavascriptInterface
    fun closeApp() {
        activity.runOnUiThread {
            activity.finish()
        }
    }

    @JavascriptInterface
    fun isNetworkConnected(): Boolean {
        return networkObserver.isConnected()
    }
}
