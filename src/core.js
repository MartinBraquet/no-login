import {defaultOptions} from "./utils";

export let intervalId = {value: undefined};

const closeTranslations = [
    "Close",
    "Cerrar",
    "Fermer",
    "Schließen",
    "Chiudere",
    "Fechar",
    "Закрыть",
    "关闭",
    "閉じる",
    "닫다",
    "إغلاق",
    "बंद करना",
    "Kapatmak",
    "Stänga",
    "Sluiten",
    "Sulkea",
    "Lukke",
    "Lukke",
    "Zavřít",
    "Bezárni",
    "ปิด",
    "Đóng",
    "לסגור",
    "Închide",
    "Затвори",
    "Zatvoriť",
    "Uždaryti",
    "Aizvērt",
    "Закрити"
];

const closeSelector = `"${closeTranslations.join('"],[aria-label="')}"`;

function log(x) {
    console.log('no-login - ' + x);
}

const strToHash = (str, seed = 0) => {
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) {
        ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

const readStorage = async (key, storage) => {
    return new Promise((resolve, reject) => {
        storage.get([key], function (result) {
            let value = result[key];
            if (value === undefined) {
                value = defaultOptions[key];
                storage.set({[key]: value});
            }
            resolve(value);
        });
    });
};

const readLocalStorage = async (key) => {
    return readStorage(key, browser.storage.local);
};


let hashes = [];

function logOnce(x) {
    let hash = strToHash(x);
    if (!hashes.includes(hash)) {
        hashes.push(hash);
        log(x);
    }
}

function incrementSkipCounter() {
    browser.runtime.sendMessage({loginsSkipped: true});
}

export function getAttributes(element) {
    let array = Array.from(element.attributes).reduce((attrs, attr) => ({...attrs, [attr.name]: attr.value}), {});
    return JSON.stringify(array);
}

function getLinkedinCloseButton() {
    let names = ["public_post_contextual-sign-in-modal_modal_dismiss", "public_profile_contextual-sign-in-modal_modal_dismiss",]
    for (let name of names) {
        let button = document.querySelector('[data-tracking-control-name="' + name + '"]');
        if (button) {
            return button;
        }
    }
}

async function removeLinkedinLogin() {
    if (!window.location.href.includes('linkedin.com')) return;
    let wanted = await readLocalStorage('linkedinWanted');
    if (!wanted) return;
    let close_button = getLinkedinCloseButton();
    if (close_button) {
        let main_content = document.getElementById('main-content');
        let aria_hidden = main_content.getAttribute('aria-hidden');
        if (aria_hidden === 'true') {
            close_button.click();
            log("Removed linkedin login banner: " + getAttributes(close_button));
            incrementSkipCounter();
            return;
        }
    }

    let catalog_sign_in = document.querySelector('[aria-labelledby="base-contextual-sign-in-modal-modal-header"]');
    if (catalog_sign_in) {
        let element = closestTo(catalog_sign_in, document.body);
        log("Removed linkedin login banner: " + getAttributes(element));
        element.remove();
        document.body.classList.remove('overflow-hidden');
        incrementSkipCounter();
    }

    let join_elem = document.querySelector('[class="join-form"]');
    if (!join_elem) {
        return;
    }
    let skip_button = document.getElementById('no-login-addon-linkedin-google');
    if (skip_button) {
        return;
    }
    const htmlString = `
      <div id="no-login-addon-popup-banner" class="no-login-addon-popup-banner">
        <div class="popup-content">
          <div class="no-login-addon-popup-header">
            <span class="no-login-addon-close-button" id="no-login-addon-popup-close">&times;</span>
          </div>
          <div class="no-login-addon-popup-body">
            <h2>Message from your no-login add-on</h2>
            <span id="popup-message">To skip login, click below; then click on the first link.</span><br/><br/>
            <a id="no-login-addon-linkedin-google" href="" class="no-login-addon-button">Skip Login</a>
          </div>
        </div>
      </div>
    `;

    const cssString = `
        .no-login-addon-popup-banner {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 50vw;
            height: 50vh;
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            padding: 20px;
            text-align: center;
            display: none;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            z-index: 1000; /* Bring the banner to the front */
        }

        .no-login-addon-popup-banner.show {
            display: flex;
        }

        .no-login-addon-popup-banner .popup-content {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
        }

        .no-login-addon-popup-banner .no-login-addon-popup-header {
            width: 100%;
            height: 40px;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #ccc;
        }

        .no-login-addon-popup-banner .no-login-addon-popup-header .no-login-addon-close-button {
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
        }

        .no-login-addon-popup-banner .no-login-addon-popup-body {
            width: 100%;
            height: calc(100%);
            padding: 20px;
            /*display: flex;*/
            justify-content: center;
            align-items: center;
        }


        .no-login-addon-button {
            display: inline-block;
            padding: 10px 20px;
            font-size: 16px;
            color: white;
            background-color: #007bff;
            border: none;
            border-radius: 5px;
            text-align: center;
            text-decoration: none;
        }

        .no-login-addon-button:hover {
            background-color: #0056b3;
        }
    `;
    const styleElement = document.createElement('style');
    styleElement.textContent = cssString;
    document.head.appendChild(styleElement);

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const popupBanner = doc.body.firstChild;
    document.body.appendChild(popupBanner);
    const popupClose = document.getElementById('no-login-addon-popup-close');
    skip_button = document.getElementById('no-login-addon-linkedin-google');

    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const sessionRedirect = params.get('sessionRedirect');
    if (sessionRedirect == null) {
        return;
    }
    skip_button.href = 'https://www.google.com/search?q=' + sessionRedirect;


    function showPopup() {
        popupBanner.classList.add('show');
    }

    function hidePopup() {
        popupBanner.classList.remove('show');
    }

    popupClose.addEventListener('click', hidePopup);

    showPopup();
    log("Added linkedin login banner for " + sessionRedirect);
}

function closestTo(element, to) {
    let parent = element;
    while (parent.parentNode && parent.parentNode !== to) {
        parent = parent.parentNode;
    }
    return parent;
}

const LANDMARK_SELECTOR = '[role="main"], [role="banner"], [role="navigation"], [role="feed"], article, main, nav';

function hasContent(element) {
    return (element.textContent || '').trim().length > 0 || element.querySelector(LANDMARK_SELECTOR);
}

// Climb from a login dialog to the root of the overlay layer that wraps it: the highest ancestor whose
// siblings are all empty (backdrops, spacers). Stops as soon as removing the next ancestor would also
// remove page content, so a login dialog nested inside the app's React mount root never takes the whole
// page down with it (see issue #9).
export function getOverlayRoot(element) {
    let current = element;
    while (current.parentElement && current.parentElement !== document.body) {
        let parent = current.parentElement;
        if (parent.querySelector(LANDMARK_SELECTOR) && !current.querySelector(LANDMARK_SELECTOR)) break;
        let siblings = Array.from(parent.children).filter(child => child !== current);
        if (siblings.some(hasContent)) break;
        current = parent;
    }
    return current;
}

function clickButton(close_button) {
    log("Clicking facebook center dialog close button: " + getAttributes(close_button));
    log(close_button.outerHTML)
    close_button.click();
    incrementSkipCounter();
    return true;
}

function checkAllButtons() {
    let close_buttons = document.querySelectorAll('[role="button"]');
    for (let close_button of close_buttons) {
        let text = close_button.querySelector('[class="native-text"]');
        if (text && text.textContent === '󱤅') {
            return clickButton(close_button);
        }
    }
}

function getFacebookLoginDialog() {
    // Facebook may open several dialogs at once (e.g. the post itself on /posts/ urls, the cookie consent),
    // so pick the one that actually holds the login form instead of the first dialog on the page.
    let form = document.getElementById('login_popup_cta_form');
    if (!form) return null;
    return form.closest('[role="dialog"]');
}

function removeFacebookCenterDialogButton() {
    checkAllButtons();
    let dialog = getFacebookLoginDialog();
    if (!dialog) return;
    let close_buttons = dialog.querySelectorAll('[role="button"]');
    for (let close_button of close_buttons) {
        if (close_button.querySelector('[data-visualcompletion="css-img"]')) {
            return clickButton(close_button);
        }
    }
}

async function removeFacebookLogin() {
    if (!window.location.href.includes('facebook.com')) return;
    let wanted = await readLocalStorage('facebookWanted');
    if (!wanted) return;

    // Bottom banner
    let banner = document.querySelector('[data-nosnippet=""]');
    if (banner) {
        log("Removed facebook bottom login banner: " + getAttributes(banner));
        banner.remove();
        incrementSkipCounter();
    }

    // Log in center dialog with close button
    let skipped = removeFacebookCenterDialogButton();
    if (skipped) return;

    // Log in center dialog without close button
    let form = document.getElementById('login_popup_cta_form');
    if (form) {
        let element = getOverlayRoot(form.closest('[role="dialog"]') || form);
        log("Removed facebook center login dialog login_popup_cta_form: " + getAttributes(element));
        element.remove();
        incrementSkipCounter();
    }

    form = document.querySelector('[class="m fixed-container bottom"]');
    if (form) {
        log("Removed facebook center login banner m fixed-container bottom: " + getAttributes(form));
        form.remove();
        incrementSkipCounter();
    }
}

export function getInstagramRedirectTarget(href) {
    let next;
    try {
        next = new URL(href).searchParams.get('next');
    } catch (e) {
        return null;
    }
    if (!next || !next.startsWith('/')) return null;
    // Drop the tracking query string that instagram appends to the "next" url
    let path = next.split('?')[0].replace(/\/+$/, '');
    if (!path) return null;
    return "https://www.instagram.com" + path + "/";
}

const REDIRECT_COOLDOWN_MS = 10000;
const REDIRECT_TIMESTAMP_KEY = 'no-login-last-redirect';

// Instagram sometimes sends the browser straight back to the login page after we leave it. Without a
// cooldown the add-on and the website would bounce the tab back and forth forever (see issue #4); with it
// the user lands on the login page at most once every few seconds and can act on it themselves.
function redirectedRecently() {
    let last = 0;
    try {
        last = parseInt(window.sessionStorage.getItem(REDIRECT_TIMESTAMP_KEY)) || 0;
    } catch (e) {
        // sessionStorage can be unavailable (e.g. storage disabled); fall back to always redirecting
    }
    let elapsed = Date.now() - last;
    if (elapsed < REDIRECT_COOLDOWN_MS) {
        logOnce("Skipping instagram login redirect: already redirected " + elapsed + " ms ago");
        return true;
    }
    return false;
}

function markRedirected() {
    try {
        window.sessionStorage.setItem(REDIRECT_TIMESTAMP_KEY, String(Date.now()));
    } catch (e) {
    }
}

// Clicking a post in a profile grid or in the "more posts" strip asks instagram's single-page app to open it in a
// modal, which logged-out visitors are not allowed to do: the app shows the login dialog instead (which the add-on then
// closes, so nothing seems to happen). The post page itself renders fine when loaded directly, so turn a plain left
// click on a post link into a regular same-tab navigation. Modified clicks keep their browser behaviour (new tab, ...).
export function isInstagramPostLink(anchor) {
    if (!anchor || !anchor.getAttribute) return false;
    let href = anchor.getAttribute('href') || '';
    return /^(https?:\/\/(www\.)?instagram\.com)?\/([^/?#]+\/)?(p|reel|reels)\/[^/?#]+/.test(href);
}

export function onInstagramClick(event, navigate = url => window.location.assign(url)) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.defaultPrevented) return;
    let anchor = event.target.closest ? event.target.closest('a[href]') : null;
    if (!isInstagramPostLink(anchor)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    log("Opening instagram post in the same tab instead of the login-gated modal: " + anchor.href);
    navigate(anchor.href);
}

let instagramClickHandlerInstalled = false;

function installInstagramClickHandler() {
    if (instagramClickHandlerInstalled) return;
    instagramClickHandlerInstalled = true;
    // Capture phase, so the handler runs before the single-page app's own click handling.
    document.addEventListener('click', onInstagramClick, true);
}

async function removeInstagramLogin() {
    if (!window.location.href.includes('instagram.com')) return;
    let wanted = await readLocalStorage('instagramWanted');
    if (!wanted) return;

    installInstagramClickHandler();

    if (window.location.href.includes('login/?next')) {
        let url = getInstagramRedirectTarget(window.location.href);
        if (url && !redirectedRecently()) {
            markRedirected();
            log("Redirecting to " + url);
            clearInterval(intervalId.value);
            window.location.replace(url);
        }
        return;
    }

    let buttons = document.getElementsByTagName('button');
    for (let button of buttons) {
        let banner = button.querySelector(`[aria-label=${closeSelector}]`);
        if (banner && typeof button.click === 'function') {
            log("Removed instagram login banner: " + getAttributes(button));
            button.click();
            incrementSkipCounter();
        }
    }

    // let dialog = document.querySelector('[role="dialog"]');
    // if (dialog && !dialog.getAttribute('aria-label')) {
    let close_buttons = document.querySelectorAll('[role="button"]');
    for (let close_button of close_buttons) {
        if (close_button && close_button.getElementsByTagName('polyline').length > 0) {
            log("Removed instagram center login banner: " + getAttributes(close_button));
            close_button.click();
            incrementSkipCounter();
            return;
        }
    }

    // Log in center dialog without close button
    let form = document.getElementById('loginForm');
    if (form) {
        let element = getOverlayRoot(form.closest('[role="dialog"]') || form);
        log("Removed instagram center login dialog loginForm: " + getAttributes(element));
        element.remove();
        incrementSkipCounter();
    }

    form = document.querySelector('[href="/accounts/signup/phone"]');
    if (form) {
        let articles = document.getElementsByTagName('article');
        if (articles.length > 0) {
            let article = articles[articles.length - 1];
            let element = article.nextElementSibling;
            log("Removed instagram center login dialog href: " + getAttributes(element));
            element.remove();
            incrementSkipCounter();
        }
    }

    // }

    // let close_button = dialog.querySelector('[role="button"]');
    // if (!close_button) {
    //     return;
    // }
    // close_button.click();
    // log("Removed instagram login banner");
}

const LIGHTBOX_ID = 'no-login-addon-lightbox';

export function isTwitterMediaImage(element) {
    return !!(element && element.tagName === 'IMG' && /pbs\.twimg\.com\/media\//.test(element.src || ''));
}

// X's CDN only serves the original size as jpg (the page itself uses webp for the resized variants).
export function getTwitterOriginalImageUrl(src) {
    let url = new URL(src);
    url.searchParams.set('format', 'jpg');
    url.searchParams.set('name', 'orig');
    return url.toString();
}

export function getTwitterLargeImageUrl(src) {
    let url = new URL(src);
    url.searchParams.set('name', 'large');
    return url.toString();
}

export function closeTwitterLightbox() {
    let lightbox = document.getElementById(LIGHTBOX_ID);
    if (lightbox) lightbox.remove();
}

export function openTwitterLightbox(src, fallbackSrc) {
    closeTwitterLightbox();
    let lightbox = document.createElement('div');
    lightbox.id = LIGHTBOX_ID;
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-label', 'Image');
    lightbox.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(0,0,0,0.9);cursor:zoom-out;margin:0;padding:0;';
    let image = document.createElement('img');
    image.src = src;
    image.alt = '';
    if (fallbackSrc && fallbackSrc !== src) {
        image.addEventListener('error', () => {
            log("Original image unavailable, falling back to " + fallbackSrc);
            image.src = fallbackSrc;
        }, {once: true});
    }
    image.style.cssText = 'max-width:100vw;max-height:100vh;object-fit:contain;display:block;';
    let close = document.createElement('button');
    close.type = 'button';
    close.textContent = '\u00d7';
    close.setAttribute('aria-label', 'Close');
    close.style.cssText = 'position:absolute;top:12px;right:16px;background:none;border:none;color:#fff;font-size:36px;line-height:1;cursor:pointer;';
    lightbox.appendChild(image);
    lightbox.appendChild(close);
    document.body.appendChild(lightbox);
    return lightbox;
}

// X (logged out) opens a "Don't miss what's happening" login card whenever a photo is clicked, since the media viewer
// needs an account. Show the full-size image in a simple lightbox of our own instead.
export function onTwitterClick(event, navigate = url => window.location.assign(url)) {
    let target = event.target;
    if (!target || !target.closest) return;
    if (target.closest('#' + LIGHTBOX_ID)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeTwitterLightbox();
        return;
    }
    if (event.type === 'click' && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    if (isTwitterMediaImage(target) && target.closest('article')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.type !== 'click') return;
        let src = getTwitterOriginalImageUrl(target.src);
        log("Opening twitter image in a lightbox instead of the login card: " + src);
        openTwitterLightbox(src, getTwitterLargeImageUrl(target.src));
        incrementSkipCounter();
        return;
    }
    // Clicking the body of a post would open it in place, which logged-out visitors are not allowed to do (the page
    // shows the login card instead). Open the post's own page, like a plain link would.
    if (target.closest('a[href], button, [role="button"], video, audio, input, textarea')) return;
    let post = target.closest('[data-href*="/status/"]');
    if (!post) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.type !== 'click') return;
    if (window.getSelection && String(window.getSelection()).length > 0) return;
    let url = new URL(post.getAttribute('data-href'), window.location.href).toString();
    if (url === window.location.href) return;
    log("Opening twitter post page instead of the login card: " + url);
    navigate(url);
}

export function onTwitterKeydown(event) {
    if (event.key === 'Escape' && document.getElementById(LIGHTBOX_ID)) {
        event.stopImmediatePropagation();
        closeTwitterLightbox();
    }
}

let twitterClickHandlerInstalled = false;

function installTwitterClickHandler() {
    if (twitterClickHandlerInstalled) return;
    twitterClickHandlerInstalled = true;
    // Capture phase on the document runs before the page's own handlers on the media elements.
    for (let type of ['pointerdown', 'mousedown', 'click']) {
        document.addEventListener(type, onTwitterClick, true);
    }
    document.addEventListener('keydown', onTwitterKeydown, true);
}

// The login card X shows after clicking on media, "Show more", etc. It has its own close button, which also
// restores the page's scrolling, so prefer clicking it over removing the card.
function closeTwitterEngagementModal() {
    let modal = document.querySelector('[data-engagement-modal]');
    if (!modal) return;
    let close_button = Array.from(modal.querySelectorAll('button')).find(button => button.querySelector('svg[data-icon="icon-close-md"]'))
        || modal.querySelector('button');
    if (close_button) {
        log("Closing twitter login card: " + getAttributes(close_button));
        close_button.click();
    } else {
        log("Removing twitter login card: " + getAttributes(modal));
        modal.remove();
        document.body.style.overflow = '';
    }
    incrementSkipCounter();
}

async function removeTwitterLogin() {
    if (!window.location.href.includes('x.com') && !window.location.href.includes('twitter.com')) return;
    let wanted = await readLocalStorage('twitterWanted');
    if (!wanted) return;

    installTwitterClickHandler();
    closeTwitterEngagementModal();

    // X freezes each photo/video with the "inert" attribute and lays a "View media"
    // link over it that opens the login gate when clicked. Remove that overlay and
    // un-freeze the media so its own controls (video player, gallery "Next" button)
    // work again, then strip the login-gated links on the media itself so clicking it
    // no longer opens the popup.
    for (let inert of document.querySelectorAll('[inert]')) {
        let parent = inert.parentElement;
        if (!parent) continue;
        let overlay = parent.querySelector(':scope > a[href*="/photo/"], :scope > a[href*="/video/"]');
        if (!overlay) continue;
        log("Disabled twitter media login gate: " + getAttributes(overlay));
        overlay.remove();
        inert.removeAttribute('inert');
        for (let link of inert.querySelectorAll('a[href*="/photo/"], a[href*="/video/"]')) {
            link.removeAttribute('href');
        }
        incrementSkipCounter();
    }

    // Bottom "Don't miss what's happening" sign-up banner
    let banners = document.querySelectorAll('.fixed.bottom-0');
    for (let banner of banners) {
        if (banner.querySelector('[href*="/i/jf/onboarding/web"]')) {
            log("Removed twitter bottom login banner: " + getAttributes(banner));
            banner.remove();
            incrementSkipCounter();
            break;
        }
    }
}

async function removeTumblrLogin() {
    if (!window.location.href.includes('tumblr.com')) return;
    let wanted = await readLocalStorage('tumblrWanted');
    if (!wanted) return;
    
    // check url; login will not be requested on tumblrs configured not to do that, so it is unnecessary to do anything furthes
    if (false) {
        return;
    } else {
        log("Removed tumblr center login dialog from " /* node info, see other similar functions() */);
        // remove glass-container node
        // remove bottom login banner
        
        incrementSkipCounter(); // doublecheck what this is for
    }
}

const checkIfActiveTab = async () => {
    return new Promise((resolve, reject) => {
        browser.runtime.sendMessage({message: "is_active_tab"}, function (response) {
            resolve(response.isActiveTab);
        });
    });
};

export async function checkForLogins() {
    logOnce("intervalId: " + intervalId.value);
    let isActiveTab = await checkIfActiveTab();
    if (isActiveTab) {
        await removeLinkedinLogin();
        await removeFacebookLogin();
        await removeInstagramLogin();
        await removeTwitterLogin();
        await removeTumblrLogin();
    }
}
