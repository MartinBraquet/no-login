// Debug: in about:debugging#/runtime/this-firefox, click on "Inspect" for the extension.

browser.runtime.onInstalled.addListener(() => {
    console.log('onInstalled');
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the tab has finished loading
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('onComplete');
        // Check if the URL matches the patterns specified in the manifest
        if (tab.url.match(/.*(linkedin|facebook|instagram|tumblr)\.com.*/)) {
            // Inject content.js as a module
            console.log('executeScript: ' + tab.url);
            browser.scripting.executeScript({
                target: {tabId: tabId},
                files: ['dist/content.bundle.js'],
                injectImmediately: true  // This option allows to inject the script immediately
            });
        }
    }
});

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.loginsSkipped !== undefined) {
        console.log('onMessage loginsSkipped');
        browser.storage.local.get('loginsSkipped', (data) => {
            let newCount = (data.loginsSkipped || 0) + 1;
            browser.storage.local.set({loginsSkipped: newCount});
        });
    } else if (request.message === "is_active_tab") {
        sendResponse({isActiveTab: sender.tab.active});
    }
});
