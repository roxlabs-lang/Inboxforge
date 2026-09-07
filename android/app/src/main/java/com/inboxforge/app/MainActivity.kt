package com.inboxforge.app

import android.annotation.SuppressLint
import android.app.Dialog
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Message
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsetsController
import android.webkit.*
import android.widget.FrameLayout
import android.widget.ProgressBar
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var rootContainer: FrameLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var secureStore: SecureTokenStore
    private lateinit var networkObserver: NetworkStatusObserver
    private lateinit var nativeBridge: InboxForgeNativeBridge

    private var popupDialog: Dialog? = null

    // Target URL: in production APK this points to local assets or bundled web distribution
    // with fallback to remote hosting
    private val appUrl: String = "https://localhost:3000" // or custom domain / asset

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        // Switch from splash theme to main app theme
        setTheme(R.style.Theme_InboxForge)
        super.onCreate(savedInstanceState)

        // Setup Edge-to-Edge System Bar layout
        WindowCompat.setDecorFitsSystemWindows(window, false)

        secureStore = SecureTokenStore(this)
        networkObserver = NetworkStatusObserver(this) { isOnline ->
            notifyNetworkChange(isOnline)
        }

        nativeBridge = InboxForgeNativeBridge(this, secureStore, networkObserver)

        setupLayout()
        setupWebView()
        setupBackNavigation()

        networkObserver.start()

        // Handle initial intent if launched from deep link
        handleDeepLink(intent)

        // Initial default theme
        applyStatusBarTheme(true)

        // Load application
        loadApp()
    }

    private fun setupLayout() {
        rootContainer = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#09090B"))
        }

        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#09090B"))
        }

        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                8
            )
            max = 100
            visibility = View.VISIBLE
        }

        rootContainer.addView(webView)
        rootContainer.addView(progressBar)
        setContentView(rootContainer)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            allowFileAccess = false
            allowContentAccess = false

            // Multi-window support enables Google OAuth popups (signInWithPopup)
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true

            // Performance & Caching
            cacheMode = if (networkObserver.isConnected()) {
                WebSettings.LOAD_DEFAULT
            } else {
                WebSettings.LOAD_CACHE_ELSE_NETWORK
            }

            // Safe mixed content handling
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "$userAgentString InboxForgeNative/1.0.0"
        }

        // Register Native JavaScript Bridge
        webView.addJavascriptInterface(nativeBridge, "InboxForgeNative")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                if (newProgress < 100) {
                    progressBar.visibility = View.VISIBLE
                    progressBar.progress = newProgress
                } else {
                    progressBar.visibility = View.GONE
                }
            }

            // Handles Google Sign-In popups seamlessly within a native dialog
            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message?
            ): Boolean {
                if (resultMsg == null) return false

                val popupWebView = WebView(this@MainActivity).apply {
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.setSupportMultipleWindows(false)
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            v: WebView?,
                            request: WebResourceRequest?
                        ): Boolean {
                            val url = request?.url?.toString() ?: return false
                            // If OAuth completed and redirects back to app
                            if (url.startsWith("inboxforge://") || url.contains("callback")) {
                                popupDialog?.dismiss()
                                webView.loadUrl(url)
                                return true
                            }
                            return false
                        }
                    }
                    webChromeClient = object : WebChromeClient() {
                        override fun onCloseWindow(window: WebView?) {
                            popupDialog?.dismiss()
                        }
                    }
                }

                popupDialog = Dialog(this@MainActivity, android.R.style.Theme_Black_NoTitleBar_Fullscreen).apply {
                    setContentView(popupWebView)
                    setOnDismissListener {
                        popupWebView.destroy()
                    }
                    show()
                }

                val transport = resultMsg.obj as? WebView.WebViewTransport
                transport?.webView = popupWebView
                resultMsg.sendToTarget()
                return true
            }

            override fun onCloseWindow(window: WebView?) {
                popupDialog?.dismiss()
                popupDialog = null
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                progressBar.visibility = View.GONE
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false

                // Custom Deep Link Scheme Handling
                if (url.startsWith("inboxforge://")) {
                    handleDeepLinkUri(request.url)
                    return true
                }

                // Standard external links (mail, dialer, outside websites)
                if (url.startsWith("mailto:") || url.startsWith("tel:")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                    } catch (_: Exception) {}
                    return true
                }

                // Allow internal web navigation
                return false
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                // Ignore non-main frame errors
                if (request?.isForMainFrame != true) return

                // In offline mode, display a native recovery view instead of white crash
                if (!networkObserver.isConnected()) {
                    showOfflineRecoveryView()
                }
            }
        }
    }

    private fun loadApp() {
        // Try local asset first, fallback to configured URL
        webView.loadUrl(appUrl)
    }

    private fun showOfflineRecoveryView() {
        val htmlData = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        background-color: #09090b;
                        color: #f8fafc;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 90vh;
                        padding: 24px;
                        text-align: center;
                        box-sizing: border-box;
                    }
                    .badge {
                        display: inline-block;
                        padding: 6px 12px;
                        background: rgba(239, 68, 68, 0.15);
                        border: 1px solid rgba(239, 68, 68, 0.4);
                        color: #fca5a5;
                        border-radius: 9999px;
                        font-size: 12px;
                        font-weight: 600;
                        margin-bottom: 16px;
                    }
                    h2 { margin: 0 0 8px; font-size: 20px; }
                    p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin-bottom: 24px; max-width: 340px; }
                    .btn {
                        background: #6366f1;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                    }
                </style>
            </head>
            <body>
                <div class="badge">Connection Disconnected</div>
                <h2>InboxForge Offline</h2>
                <p>Unable to connect to the InboxForge server. Check your network or Wi-Fi connection and tap Retry.</p>
                <button class="btn" onclick="location.reload()">Retry Connection</button>
            </body>
            </html>
        """.trimIndent()

        webView.loadDataWithBaseURL(null, htmlData, "text/html", "UTF-8", null)
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // If a popup OAuth dialog is open, close it first
                if (popupDialog?.isShowing == true) {
                    popupDialog?.dismiss()
                    popupDialog = null
                    return
                }

                // Dispatch hardware back-button event to React web application
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('inboxforge:backbutton'));",
                    null
                )
            }
        })
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val uri = intent?.data ?: return
        handleDeepLinkUri(uri)
    }

    private fun handleDeepLinkUri(uri: Uri) {
        val path = uri.path ?: ""
        val token = uri.getQueryParameter("token")
        if (!token.isNullOrEmpty()) {
            secureStore.saveToken("oauth_token", token)
        }
        // Pass deep link event to React
        val js = "window.dispatchEvent(new CustomEvent('inboxforge:deeplink', { detail: '${uri}' }));"
        webView.evaluateJavascript(js, null)
    }

    private fun notifyNetworkChange(isOnline: Boolean) {
        runOnUiThread {
            val event = if (isOnline) "online" else "offline"
            webView.evaluateJavascript("window.dispatchEvent(new Event('$event'));", null)
        }
    }

    fun applyStatusBarTheme(isDark: Boolean) {
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController.isAppearanceLightStatusBars = !isDark
        windowInsetsController.isAppearanceLightNavigationBars = !isDark

        val statusBarColor = if (isDark) Color.parseColor("#09090B") else Color.parseColor("#F8FAFC")
        val navBarColor = if (isDark) Color.parseColor("#09090B") else Color.parseColor("#F8FAFC")

        window.statusBarColor = statusBarColor
        window.navigationBarColor = navBarColor
    }

    fun dismissSplashScreen() {
        // Invoked by React when main UI finishes rendering
    }

    override fun onDestroy() {
        networkObserver.stop()
        webView.destroy()
        super.onDestroy()
    }
}
