# Keep JavaScript Interface methods so Android WebView can call them
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class com.inboxforge.app.InboxForgeNativeBridge { *; }
-keep class com.inboxforge.app.SecureTokenStore { *; }

# AndroidX WebKit
-keep class androidx.webkit.** { *; }

# Security Crypto
-keep class androidx.security.crypto.** { *; }
