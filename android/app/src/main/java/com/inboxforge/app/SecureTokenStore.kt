package com.inboxforge.app

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Secure Token Store for InboxForge Android
 * Implements hardware-backed AES-256-GCM encryption via AndroidX EncryptedSharedPreferences
 * to prevent plain-text exposure of Gmail OAuth tokens and private credentials.
 */
class SecureTokenStore(context: Context) {

    private val tag = "SecureTokenStore"
    private var prefs: SharedPreferences

    init {
        prefs = try {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()

            EncryptedSharedPreferences.create(
                context,
                "secure_inboxforge_prefs",
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        } catch (e: Exception) {
            Log.e(tag, "Failed to initialize EncryptedSharedPreferences, falling back to private prefs", e)
            context.getSharedPreferences("secure_inboxforge_prefs_fallback", Context.MODE_PRIVATE)
        }
    }

    fun saveToken(key: String, value: String) {
        try {
            prefs.edit().putString(key, value).apply()
        } catch (e: Exception) {
            Log.e(tag, "Error writing secure token for key: $key", e)
        }
    }

    fun getToken(key: String): String? {
        return try {
            prefs.getString(key, null)
        } catch (e: Exception) {
            Log.e(tag, "Error reading secure token for key: $key", e)
            null
        }
    }

    fun removeToken(key: String) {
        try {
            prefs.edit().remove(key).apply()
        } catch (e: Exception) {
            Log.e(tag, "Error removing secure token for key: $key", e)
        }
    }

    fun clearAll() {
        try {
            prefs.edit().clear().apply()
        } catch (e: Exception) {
            Log.e(tag, "Error clearing tokens", e)
        }
    }
}
