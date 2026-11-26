package com.sanvex.game.tryharderloser;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import androidx.webkit.WebViewAssetLoader;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import java.util.ArrayDeque;
import java.util.Deque;

public class MainActivity extends Activity {

    private static final String APP_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + APP_HOST + "/index.html";
    private static final long BACK_EXIT_WINDOW_MS = 2000L;

    // Production AdMob Ad Unit IDs (used automatically in non-debuggable Release builds)
    private static final String PROD_BANNER_UNIT_ID = "ca-app-pub-3222322101838657/2181630451";
    private static final String PROD_INTERSTITIAL_UNIT_ID = "ca-app-pub-3222322101838657/4863634111";
    private static final String PROD_REWARDED_UNIT_ID = "ca-app-pub-3222322101838657/8910690332";

    // Official Google AdMob Android Test Ad Unit IDs (used automatically in Debug APKs)
    private static final String TEST_BANNER_UNIT_ID = "ca-app-pub-3940256099942544/6300978111";
    private static final String TEST_INTERSTITIAL_UNIT_ID = "ca-app-pub-3940256099942544/1033173712";
    private static final String TEST_REWARDED_UNIT_ID = "ca-app-pub-3940256099942544/5224354917";

    private WebView webView;
    private FrameLayout bannerContainer;
    private long lastBackPressMs = 0L;
    private OnBackInvokedCallback backInvokedCallback;

    // Google Mobile Ads SDK state (mutated on UI thread)
    private boolean mobileAdsInitialized = false;
    private boolean mobileAdsInitializing = false;
    private boolean activityPaused = false;
    private final Deque<String> pendingJsScripts = new ArrayDeque<>();

    // Home-screen-only Banner Ad state
    private AdView bannerAdView;
    private boolean bannerWanted = false;
    private boolean bannerLoadedOnce = false;
    private String activeBannerUnitId = PROD_BANNER_UNIT_ID;

    // Level-transition Interstitial Ad state
    private InterstitialAd interstitialAd;
    private volatile boolean interstitialReadyFlag = false;
    private boolean interstitialLoading = false;
    private boolean showInterstitialWhenLoaded = false;
    private String activeInterstitialUnitId = PROD_INTERSTITIAL_UNIT_ID;

    // Death-respawn / optional Rewarded Ad state
    private RewardedAd rewardedAd;
    private volatile boolean rewardedReadyFlag = false;
    private boolean rewardedLoading = false;
    private boolean showRewardedWhenLoaded = false;
    private String activeRewardedUnitId = PROD_REWARDED_UNIT_ID;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        FrameLayout rootContainer = new FrameLayout(this);
        rootContainer.setBackgroundColor(Color.parseColor("#F5F3EE"));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.parseColor("#F5F3EE"));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHapticFeedbackEnabled(true);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Register native Google AdMob JS bridge BEFORE loading the web bundle
        webView.addJavascriptInterface(new AndroidAdMobBridge(), "AndroidAdMob");

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(APP_HOST)
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(
                    WebView view,
                    WebResourceRequest request
            ) {
                Uri uri = request.getUrl();
                if (APP_HOST.equals(uri.getHost())) {
                    String path = uri.getPath();
                    if (path == null || path.isEmpty() || "/".equals(path)) {
                        return assetLoader.shouldInterceptRequest(Uri.parse(START_URL));
                    }
                    return assetLoader.shouldInterceptRequest(uri);
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (APP_HOST.equals(uri.getHost())) {
                    return false;
                }
                String scheme = uri.getScheme();
                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                        return true;
                    } catch (Exception ignored) {
                        return false;
                    }
                }
                return false;
            }
        });

        rootContainer.addView(
                webView,
                new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                )
        );

        // Bottom-anchored banner dock (shown exclusively on Home screen via AndroidAdMob.showBanner)
        bannerContainer = new FrameLayout(this);
        bannerContainer.setVisibility(View.GONE);
        bannerContainer.setBackgroundColor(Color.TRANSPARENT);
        FrameLayout.LayoutParams bannerParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL
        );
        rootContainer.addView(bannerContainer, bannerParams);

        setContentView(rootContainer);
        applyImmersiveMode();

        // Warm up Google Mobile Ads SDK immediately on startup
        ensureMobileAdsInitialized();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            backInvokedCallback = this::handleBackAction;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    backInvokedCallback
            );
        }

        if (savedInstanceState != null) {
            webView.restoreState(savedInstanceState);
        } else {
            webView.loadUrl(START_URL);
        }
    }

    private boolean isDebuggableBuild() {
        return (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private String resolveBannerUnitId(String requested) {
        if (isDebuggableBuild()) {
            return TEST_BANNER_UNIT_ID;
        }
        return (requested != null && !requested.trim().isEmpty()) ? requested.trim() : PROD_BANNER_UNIT_ID;
    }

    private String resolveInterstitialUnitId(String requested) {
        if (isDebuggableBuild()) {
            return TEST_INTERSTITIAL_UNIT_ID;
        }
        return (requested != null && !requested.trim().isEmpty()) ? requested.trim() : PROD_INTERSTITIAL_UNIT_ID;
    }

    private String resolveRewardedUnitId(String requested) {
        if (isDebuggableBuild()) {
            return TEST_REWARDED_UNIT_ID;
        }
        return (requested != null && !requested.trim().isEmpty()) ? requested.trim() : PROD_REWARDED_UNIT_ID;
    }

    private void ensureMobileAdsInitialized() {
        runOnUiThread(() -> {
            if (mobileAdsInitialized || mobileAdsInitializing || isDestroyed()) {
                return;
            }
            mobileAdsInitializing = true;
            try {
                MobileAds.initialize(MainActivity.this, initializationStatus -> runOnUiThread(() -> {
                    mobileAdsInitializing = false;
                    mobileAdsInitialized = true;
                    if (isDestroyed()) {
                        return;
                    }
                    if (bannerWanted) {
                        loadOrShowBannerInternal();
                    }
                    preloadInterstitialInternal(activeInterstitialUnitId);
                    preloadRewardedInternal(activeRewardedUnitId);
                }));
            } catch (Exception ignored) {
                mobileAdsInitializing = false;
            }
        });
    }

    private void dispatchAdEvent(final String eventName, final String jsonPayload) {
        runOnUiThread(() -> {
            String payloadExpr = (jsonPayload != null && !jsonPayload.isEmpty()) ? jsonPayload : "undefined";
            String script = "window.__onAdMobEvent && window.__onAdMobEvent('" + eventName + "', " + payloadExpr + ");";
            if (webView == null || isDestroyed()) {
                return;
            }
            if (activityPaused) {
                pendingJsScripts.addLast(script);
                return;
            }
            webView.evaluateJavascript(script, null);
        });
    }

    private void flushPendingJsEvents() {
        if (webView == null || isDestroyed() || activityPaused) {
            return;
        }
        while (!pendingJsScripts.isEmpty()) {
            String script = pendingJsScripts.pollFirst();
            if (script != null) {
                webView.evaluateJavascript(script, null);
            }
        }
    }

    // -------------------------------------------------------------------------
    // Banner Ad (Bottom of Home Screen ONLY)
    // -------------------------------------------------------------------------

    private void loadOrShowBannerInternal() {
        if (!bannerWanted || isFinishing() || isDestroyed() || bannerContainer == null) {
            return;
        }
        if (!mobileAdsInitialized) {
            ensureMobileAdsInitialized();
            return;
        }
        if (bannerAdView == null) {
            bannerAdView = new AdView(this);
            bannerAdView.setAdSize(AdSize.BANNER);
            bannerAdView.setAdUnitId(activeBannerUnitId);
            bannerAdView.setAdListener(new AdListener() {
                @Override
                public void onAdLoaded() {
                    bannerLoadedOnce = true;
                    if (bannerWanted && bannerContainer != null) {
                        bannerContainer.setVisibility(View.VISIBLE);
                    }
                    dispatchAdEvent("banner_loaded", null);
                }

                @Override
                public void onAdFailedToLoad(LoadAdError loadAdError) {
                    bannerLoadedOnce = false;
                    if (bannerContainer != null) {
                        bannerContainer.setVisibility(View.GONE);
                    }
                    dispatchAdEvent("banner_failed", "{\"code\":" + loadAdError.getCode() + "}");
                }
            });

            FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT,
                    Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL
            );
            bannerContainer.removeAllViews();
            bannerContainer.addView(bannerAdView, lp);
            bannerAdView.loadAd(new AdRequest.Builder().build());
        } else {
            bannerAdView.resume();
            if (bannerLoadedOnce) {
                bannerContainer.setVisibility(View.VISIBLE);
                dispatchAdEvent("banner_loaded", null);
            } else {
                bannerAdView.loadAd(new AdRequest.Builder().build());
            }
        }
    }

    private void hideBannerInternal() {
        bannerWanted = false;
        if (bannerContainer != null) {
            bannerContainer.setVisibility(View.GONE);
        }
        if (bannerAdView != null) {
            bannerAdView.pause();
        }
    }

    // -------------------------------------------------------------------------
    // Interstitial Ad (Level Transitions)
    // -------------------------------------------------------------------------

    private void preloadInterstitialInternal(String unitId) {
        activeInterstitialUnitId = resolveInterstitialUnitId(unitId);
        if (isFinishing() || isDestroyed()) {
            return;
        }
        if (interstitialAd != null) {
            interstitialReadyFlag = true;
            dispatchAdEvent("interstitial_loaded", null);
            return;
        }
        if (interstitialLoading) {
            return;
        }
        if (!mobileAdsInitialized) {
            ensureMobileAdsInitialized();
            return;
        }
        interstitialLoading = true;
        InterstitialAd.load(
                this,
                activeInterstitialUnitId,
                new AdRequest.Builder().build(),
                new InterstitialAdLoadCallback() {
                    @Override
                    public void onAdLoaded(InterstitialAd ad) {
                        interstitialLoading = false;
                        interstitialAd = ad;
                        interstitialReadyFlag = true;
                        dispatchAdEvent("interstitial_loaded", null);
                        if (showInterstitialWhenLoaded) {
                            showInterstitialWhenLoaded = false;
                            presentInterstitialNow();
                        }
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError loadAdError) {
                        interstitialLoading = false;
                        interstitialAd = null;
                        interstitialReadyFlag = false;
                        showInterstitialWhenLoaded = false;
                        dispatchAdEvent("interstitial_failed", "{\"code\":" + loadAdError.getCode() + "}");
                    }
                }
        );
    }

    private void presentInterstitialNow() {
        if (isFinishing() || isDestroyed()) {
            interstitialReadyFlag = false;
            dispatchAdEvent("interstitial_failed", null);
            return;
        }
        final InterstitialAd ad = interstitialAd;
        interstitialAd = null;
        interstitialReadyFlag = false;
        if (ad == null) {
            dispatchAdEvent("interstitial_failed", null);
            return;
        }
        hideBannerInternal();
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                applyImmersiveMode();
                dispatchAdEvent("interstitial_closed", null);
                preloadInterstitialInternal(activeInterstitialUnitId);
            }

            @Override
            public void onAdFailedToShowFullScreenContent(AdError adError) {
                applyImmersiveMode();
                dispatchAdEvent("interstitial_failed", "{\"code\":" + adError.getCode() + "}");
                preloadInterstitialInternal(activeInterstitialUnitId);
            }
        });
        ad.show(MainActivity.this);
    }

    // -------------------------------------------------------------------------
    // Rewarded Ad (Optional Exact-Spot Respawn / Hint / Light Boost)
    // -------------------------------------------------------------------------

    private void preloadRewardedInternal(String unitId) {
        activeRewardedUnitId = resolveRewardedUnitId(unitId);
        if (isFinishing() || isDestroyed()) {
            return;
        }
        if (rewardedAd != null) {
            rewardedReadyFlag = true;
            dispatchAdEvent("rewarded_loaded", null);
            return;
        }
        if (rewardedLoading) {
            return;
        }
        if (!mobileAdsInitialized) {
            ensureMobileAdsInitialized();
            return;
        }
        rewardedLoading = true;
        RewardedAd.load(
                this,
                activeRewardedUnitId,
                new AdRequest.Builder().build(),
                new RewardedAdLoadCallback() {
                    @Override
                    public void onAdLoaded(RewardedAd ad) {
                        rewardedLoading = false;
                        rewardedAd = ad;
                        rewardedReadyFlag = true;
                        dispatchAdEvent("rewarded_loaded", null);
                        if (showRewardedWhenLoaded) {
                            showRewardedWhenLoaded = false;
                            presentRewardedNow();
                        }
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError loadAdError) {
                        rewardedLoading = false;
                        rewardedAd = null;
                        rewardedReadyFlag = false;
                        showRewardedWhenLoaded = false;
                        dispatchAdEvent("rewarded_failed", "{\"code\":" + loadAdError.getCode() + "}");
                    }
                }
        );
    }

    private void presentRewardedNow() {
        if (isFinishing() || isDestroyed()) {
            rewardedReadyFlag = false;
            dispatchAdEvent("rewarded_failed", null);
            return;
        }
        final RewardedAd ad = rewardedAd;
        rewardedAd = null;
        rewardedReadyFlag = false;
        if (ad == null) {
            dispatchAdEvent("rewarded_failed", null);
            return;
        }
        hideBannerInternal();
        ad.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                applyImmersiveMode();
                dispatchAdEvent("rewarded_closed", null);
                preloadRewardedInternal(activeRewardedUnitId);
            }

            @Override
            public void onAdFailedToShowFullScreenContent(AdError adError) {
                applyImmersiveMode();
                dispatchAdEvent("rewarded_failed", "{\"code\":" + adError.getCode() + "}");
                preloadRewardedInternal(activeRewardedUnitId);
            }
        });
        ad.show(MainActivity.this, rewardItem ->
                dispatchAdEvent("rewarded_earned", "{\"amount\":" + rewardItem.getAmount() + "}")
        );
    }

    // -------------------------------------------------------------------------
    // WebView JavaScript Interface (`window.AndroidAdMob`)
    // -------------------------------------------------------------------------

    private final class AndroidAdMobBridge {

        @JavascriptInterface
        public void initialize(boolean isTesting) {
            ensureMobileAdsInitialized();
        }

        @JavascriptInterface
        public boolean isInterstitialReady() {
            return interstitialReadyFlag;
        }

        @JavascriptInterface
        public boolean isRewardedReady() {
            return rewardedReadyFlag;
        }

        @JavascriptInterface
        public void preloadInterstitial(final String adUnitId) {
            runOnUiThread(() -> preloadInterstitialInternal(adUnitId));
        }

        @JavascriptInterface
        public void showInterstitial(final String adUnitId) {
            runOnUiThread(() -> {
                activeInterstitialUnitId = resolveInterstitialUnitId(adUnitId);
                if (interstitialAd != null) {
                    presentInterstitialNow();
                } else {
                    showInterstitialWhenLoaded = true;
                    preloadInterstitialInternal(activeInterstitialUnitId);
                }
            });
        }

        @JavascriptInterface
        public void preloadRewarded(final String adUnitId) {
            runOnUiThread(() -> preloadRewardedInternal(adUnitId));
        }

        @JavascriptInterface
        public void showRewarded(final String adUnitId) {
            runOnUiThread(() -> {
                activeRewardedUnitId = resolveRewardedUnitId(adUnitId);
                if (rewardedAd != null) {
                    presentRewardedNow();
                } else {
                    showRewardedWhenLoaded = true;
                    preloadRewardedInternal(activeRewardedUnitId);
                }
            });
        }

        @JavascriptInterface
        public void showBanner(final String adUnitId, final String position) {
            runOnUiThread(() -> {
                activeBannerUnitId = resolveBannerUnitId(adUnitId);
                bannerWanted = true;
                loadOrShowBannerInternal();
            });
        }

        @JavascriptInterface
        public void hideBanner() {
            runOnUiThread(MainActivity.this::hideBannerInternal);
        }
    }

    // -------------------------------------------------------------------------
    // Back Button, Immersive Mode, & Activity Lifecycle
    // -------------------------------------------------------------------------

    private void handleBackAction() {
        long now = SystemClock.elapsedRealtime();
        if (now - lastBackPressMs <= BACK_EXIT_WINDOW_MS) {
            finish();
            return;
        }
        lastBackPressMs = now;
        Toast.makeText(this, "Press back again to quit, loser.", Toast.LENGTH_SHORT).show();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        handleBackAction();
    }

    private void applyImmersiveMode() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
            }
        } else {
            applyLegacyImmersiveMode();
        }
    }

    @SuppressWarnings("deprecation")
    private void applyLegacyImmersiveMode() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveMode();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (webView != null) {
            webView.saveState(outState);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        activityPaused = false;
        applyImmersiveMode();
        if (bannerAdView != null && bannerWanted) {
            bannerAdView.resume();
        }
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers();
            flushPendingJsEvents();
        }
    }

    @Override
    protected void onPause() {
        activityPaused = true;
        if (bannerAdView != null) {
            bannerAdView.pause();
        }
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && backInvokedCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backInvokedCallback);
            backInvokedCallback = null;
        }
        if (bannerAdView != null) {
            bannerAdView.destroy();
            bannerAdView = null;
        }
        interstitialAd = null;
        interstitialReadyFlag = false;
        rewardedAd = null;
        rewardedReadyFlag = false;
        pendingJsScripts.clear();
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidAdMob");
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
