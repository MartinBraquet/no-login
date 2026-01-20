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

function removeFacebookCenterDialogButton() {
    checkAllButtons();
    let dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return;
    let form = dialog.querySelector('[id="login_popup_cta_form"]');
    if (!form) return;
    // if (!dialog.getAttribute('aria-label')) return;
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
        let element = closestTo(form, document.body);
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

async function removeInstagramLogin() {
    if (!window.location.href.includes('instagram.com')) return;
    let wanted = await readLocalStorage('instagramWanted');
    if (!wanted) return;

    if (window.location.href.includes('login/?next')) {
        let fragments = window.location.href.split('%2F');
        //(1,-1) removes the 1st part of the url including the login redirect, and the last part with the tracking tags
        let url = "https://instagram.com/" + fragments.slice(1, -1).join('/');
        log("Redirecting to " + url);
        clearInterval(intervalId.value);
        window.location.replace(url);
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
        let element = closestTo(form, document.body);
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

async function removeTumblrLogin() {
    if (!window.location.href.includes('tumblr.com')) return;
    let wanted = await readLocalStorage('tumblrWanted');
    if (!wanted) return;
    
    // check url; login will not be requested on tumblrs configured not to do that, so it is unnecessary to do anything furthes
    if (!/* regex matching http://www.tumblr.com/username/other things*/ ) {
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
        await removeTumblrLogin();
    }
}
