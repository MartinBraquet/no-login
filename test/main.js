/**
 * @jest-environment jsdom
 * */

import {checkForLogins, getAttributes, getOverlayRoot, getInstagramRedirectTarget, isInstagramPostLink, onInstagramClick, onTwitterClick, onTwitterKeydown, getTwitterOriginalImageUrl} from '../src/core.js';
import {expect} from 'expect';
import {JSDOM} from "jsdom";
import {Dictionary} from "./mocked";


describe("First Tests", function () {

    beforeEach(() => {
        const dom = new JSDOM("<!doctype html><html><body></body></html>", {
            url: "http://www.facebook.com",
        });
        global.window = dom.window;
        global.document = dom.window.document;
        // Node >= 21 exposes a getter-only `navigator` global, so it can't be assigned directly.
        Object.defineProperty(global, 'navigator', {
            value: dom.window.navigator,
            configurable: true,
            writable: true,
        });
        global.localStorage = dom.window.localStorage;
        global.sessionStorage = dom.window.sessionStorage;
        global.browser = {
            storage: {
                local: new Dictionary()
            },
            runtime: {
                sendMessage: function (data, callback) {
                    if (data.message === "is_active_tab") {
                        callback({isActiveTab: true});
                    }
                }
            }
        };
    });

    afterEach(() => {
        global.window.close();
        delete global.window;
        delete global.document;
        delete global.navigator;
        delete global.localStorage;
        delete global.sessionStorage;
    });

    it("getAttributes", function () {
        let elem = document.createElement('div');
        elem.setAttribute('aria-label', "about-us");
        expect(getAttributes(elem)).toBe("{\"aria-label\":\"about-us\"}");
    });

    it("facebook - click close button", async function () {
        let htmlString = `
        <div role="dialog">
            <div>
                <div id="closeButton" aria-label="Close" role="button" tabIndex="0">
                    <i data-visualcompletion="css-img"  style="background-image: url(https://)"></i>
                    <div role="none" data-visualcompletion="ignore" style="inset: 0px;"></div>
                </div>
            </div>
            <div>
                <form action="https://www.facebook.com/login/device-based/regular/login/?login_attempt=1" id="login_popup_cta_form" method="POST" noValidate=""></form>
            </div>
        </div>
        `;
        const parser = new window.DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        let closeButton = doc.getElementById('closeButton');
        let clicked = false;
        closeButton.addEventListener('click', function() {
            console.log('Close button clicked');
            clicked = true;
        });
        document.body.appendChild(doc.body.firstChild);
        await checkForLogins();
        expect(clicked).toBe(true);
    });
});

describe("Facebook post page (issue #9)", function () {
    // Same setup as above but with a DOM that mimics facebook.com/<page>/posts/<id>: the post itself is
    // shown in a first dialog, the login dialog comes second, and both live inside the React mount root.
    beforeEach(() => {
        const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "http://www.facebook.com"});
        global.window = dom.window;
        global.document = dom.window.document;
        Object.defineProperty(global, 'navigator', {value: dom.window.navigator, configurable: true, writable: true});
        global.browser = {
            storage: {local: new Dictionary()},
            runtime: {
                sendMessage: function (data, callback) {
                    if (data.message === "is_active_tab") callback({isActiveTab: true});
                }
            }
        };
    });

    afterEach(() => {
        global.window.close();
        delete global.window;
        delete global.document;
        delete global.navigator;
    });

    function postPage(withCloseButton) {
        const closeButton = withCloseButton ? `
            <div id="loginClose" aria-label="Close" role="button" tabindex="0">
                <i data-visualcompletion="css-img" style="background-image: url(https://)"></i>
            </div>` : '';
        return `
        <div id="mount_0_0_a">
            <div><div>
                <div role="banner"><span>facebook</span></div>
                <div id="scrollview">
                    <div role="dialog" aria-labelledby="post-title">
                        <div id="postClose" aria-label="Close" role="button"><i data-visualcompletion="css-img"></i></div>
                        <h2 id="post-title">Post by Movies For You</h2>
                        <div role="main">Lots of post content and comments</div>
                    </div>
                </div>
                <div class="__fb-light-mode layer">
                    <div id="layer-scrollview">
                        <div>
                            <div class="overlay">
                                <div>
                                    <div role="dialog" id="loginDialog">
                                        ${closeButton}
                                        <h2>See more on Facebook</h2>
                                        <form id="login_popup_cta_form" action="https://www.facebook.com/login/"></form>
                                    </div>
                                </div>
                            </div>
                            <div class="backdrop"></div>
                            <div></div>
                        </div>
                    </div>
                </div>
            </div></div>
        </div>`;
    }

    function load(htmlString) {
        const doc = new window.DOMParser().parseFromString(htmlString, 'text/html');
        while (doc.body.firstChild) document.body.appendChild(doc.body.firstChild);
    }

    it("clicks the close button of the login dialog, not of the post dialog", async function () {
        load(postPage(true));
        let clicked = [];
        for (let id of ['postClose', 'loginClose']) {
            document.getElementById(id).addEventListener('click', () => clicked.push(id));
        }
        await checkForLogins();
        expect(clicked).toEqual(['loginClose']);
        expect(document.getElementById('mount_0_0_a')).not.toBeNull();
        expect(document.querySelector('[role="main"]')).not.toBeNull();
    });

    it("removes only the login overlay when the dialog has no close button", async function () {
        load(postPage(false));
        await checkForLogins();
        expect(document.getElementById('login_popup_cta_form')).toBeNull();
        expect(document.querySelector('.layer')).toBeNull();
        expect(document.getElementById('mount_0_0_a')).not.toBeNull();
        expect(document.querySelector('[role="banner"]')).not.toBeNull();
        expect(document.querySelector('[role="main"]').textContent).toBe('Lots of post content and comments');
    });

    it("getOverlayRoot stops below ancestors that hold page content", function () {
        load(postPage(false));
        const dialog = document.getElementById('loginDialog');
        expect(getOverlayRoot(dialog).className).toBe('__fb-light-mode layer');
    });

    it("getOverlayRoot climbs to the body child when nothing else is on the page", function () {
        load('<div id="wrapper"><div><div role="dialog" id="d"><form id="loginForm"></form></div></div></div>');
        expect(getOverlayRoot(document.getElementById('d')).id).toBe('wrapper');
    });
});

describe("Instagram login redirect", function () {
    it("rebuilds the target url from the next parameter", function () {
        expect(getInstagramRedirectTarget("https://www.instagram.com/accounts/login/?next=%2Fnature_org%2F&source=omni_redirect"))
            .toBe("https://www.instagram.com/nature_org/");
        expect(getInstagramRedirectTarget("https://www.instagram.com/accounts/login/?next=%2Fp%2FC1a2b3%2F%3Fimg_index%3D1&source=omni_redirect"))
            .toBe("https://www.instagram.com/p/C1a2b3/");
        expect(getInstagramRedirectTarget("https://www.instagram.com/accounts/login/?next=https%3A%2F%2Fevil.example%2F")).toBeNull();
        expect(getInstagramRedirectTarget("https://www.instagram.com/accounts/login/")).toBeNull();
        expect(getInstagramRedirectTarget("https://www.instagram.com/accounts/login/?next=%2F")).toBeNull();
    });
});

describe("Instagram post links", function () {
    function anchor(href) {
        const a = new JSDOM("<!doctype html><html><body></body></html>").window.document.createElement('a');
        a.setAttribute('href', href);
        return a;
    }

    it("recognises post and reel links, including the profile-prefixed grid links", function () {
        for (let href of ['/p/DczC0LriUPB/', '/nature_org/p/DczC0LriUPB/', '/reel/C1a2b3/', '/nature_org/reels/C1a2b3/',
            'https://www.instagram.com/nature_org/p/DczC0LriUPB/?img_index=1']) {
            expect(isInstagramPostLink(anchor(href))).toBe(true);
        }
        for (let href of ['/nature_org/', '/explore/', '/accounts/login/', 'https://example.com/p/abc/', '/p/']) {
            expect(isInstagramPostLink(anchor(href))).toBe(false);
        }
        expect(isInstagramPostLink(null)).toBe(false);
    });

    it("turns a plain left click on a post link into a same-tab navigation", function () {
        const dom = new JSDOM('<!doctype html><html><body><a id="post" href="/nature_org/p/DczC0LriUPB/"><img id="img"></a><a id="profile" href="/nature_org/">x</a></body></html>',
            {url: "https://www.instagram.com/nature_org/"});
        const w = dom.window;
        global.window = w;
        let assigned = [];
        let appHandled = [];
        w.document.body.addEventListener('click', e => { appHandled.push(e.target.id); e.preventDefault(); });

        w.document.addEventListener('click', e => onInstagramClick(e, url => assigned.push(url)), true);
        w.document.getElementById('img').dispatchEvent(new w.MouseEvent('click', {bubbles: true, cancelable: true, button: 0}));
        expect(assigned).toEqual(['https://www.instagram.com/nature_org/p/DczC0LriUPB/']);
        expect(appHandled).toEqual([]);

        // Modified clicks and clicks on other links are left to the page / browser
        w.document.getElementById('img').dispatchEvent(new w.MouseEvent('click', {bubbles: true, cancelable: true, button: 0, ctrlKey: true}));
        w.document.getElementById('profile').dispatchEvent(new w.MouseEvent('click', {bubbles: true, cancelable: true, button: 0}));
        expect(assigned.length).toBe(1);
        expect(appHandled).toEqual(['img', 'profile']);
        delete global.window;
    });
});

describe("X / Twitter", function () {
    beforeEach(() => {
        const dom = new JSDOM("<!doctype html><html><body></body></html>", {url: "https://x.com/nature_org"});
        global.window = dom.window;
        global.document = dom.window.document;
        Object.defineProperty(global, 'navigator', {value: dom.window.navigator, configurable: true, writable: true});
        global.browser = {
            storage: {local: new Dictionary()},
            runtime: {
                sendMessage: function (data, callback) {
                    if (data.message === "is_active_tab") callback({isActiveTab: true});
                }
            }
        };
    });

    afterEach(() => {
        global.window.close();
        delete global.window;
        delete global.document;
        delete global.navigator;
    });

    function load(htmlString) {
        const doc = new window.DOMParser().parseFromString(htmlString, 'text/html');
        while (doc.body.firstChild) document.body.appendChild(doc.body.firstChild);
    }

    it("builds the original-size image url", function () {
        expect(getTwitterOriginalImageUrl("https://pbs.twimg.com/media/HTJChBDWIAADPjX?format=webp&name=large"))
            .toBe("https://pbs.twimg.com/media/HTJChBDWIAADPjX?format=jpg&name=orig");
    });

    it("opens a lightbox on image click instead of letting the page open its login card", function () {
        load('<article><img id="photo" src="https://pbs.twimg.com/media/ABC?format=webp&name=large"></article>' +
            '<img id="avatar" src="https://pbs.twimg.com/profile_images/1/x.jpg">');
        let pageHandled = [];
        document.body.addEventListener('click', e => pageHandled.push(e.target.id));
        document.addEventListener('click', onTwitterClick, true);
        document.addEventListener('keydown', onTwitterKeydown, true);

        document.getElementById('avatar').dispatchEvent(new window.MouseEvent('click', {bubbles: true, cancelable: true, button: 0}));
        expect(document.getElementById('no-login-addon-lightbox')).toBeNull();
        expect(pageHandled).toEqual(['avatar']);

        document.getElementById('photo').dispatchEvent(new window.MouseEvent('click', {bubbles: true, cancelable: true, button: 0}));
        const lightbox = document.getElementById('no-login-addon-lightbox');
        expect(lightbox).not.toBeNull();
        expect(lightbox.querySelector('img').src).toBe("https://pbs.twimg.com/media/ABC?format=jpg&name=orig");
        lightbox.querySelector('img').dispatchEvent(new window.Event('error'));
        expect(lightbox.querySelector('img').src).toBe("https://pbs.twimg.com/media/ABC?format=webp&name=large");
        expect(pageHandled).toEqual(['avatar']);

        document.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
        expect(document.getElementById('no-login-addon-lightbox')).toBeNull();

        document.getElementById('photo').dispatchEvent(new window.MouseEvent('click', {bubbles: true, cancelable: true, button: 0}));
        document.querySelector('#no-login-addon-lightbox img').dispatchEvent(new window.MouseEvent('click', {bubbles: true, cancelable: true, button: 0}));
        expect(document.getElementById('no-login-addon-lightbox')).toBeNull();
        expect(pageHandled).toEqual(['avatar']);
    });

    it("opens the post page when the body of a post is clicked", function () {
        load(`<div data-href="/nature_org/status/2102842776207475072" role="link">
                <article><span id="text">Public lands are where</span>
                    <a id="hashtag" href="/hashtag/Nature">#Nature</a>
                    <button id="like" aria-label="Like"></button>
                </article></div>`);
        let pageHandled = [], navigated = [];
        document.body.addEventListener('click', e => { pageHandled.push(e.target.id); e.preventDefault(); });
        document.addEventListener('click', e => onTwitterClick(e, url => navigated.push(url)), true);
        const click = id => document.getElementById(id).dispatchEvent(new window.MouseEvent('click', {bubbles: true, cancelable: true, button: 0}));

        click('text');
        expect(navigated).toEqual(['https://x.com/nature_org/status/2102842776207475072']);
        expect(pageHandled).toEqual([]);

        // Links and buttons inside the post keep working as before
        click('hashtag');
        click('like');
        expect(navigated.length).toBe(1);
        expect(pageHandled).toEqual(['hashtag', 'like']);
    });

    it("closes the login card through its own close button", async function () {
        load(`<div data-engagement-modal="true">
            <button id="close" type="button" aria-label="Close"><svg data-icon="icon-close-md"></svg></button>
            <h2>Don't miss what's happening</h2><a href="/i/jf/onboarding/web?mode=login">Log in</a></div>`);
        let clicked = false;
        document.getElementById('close').addEventListener('click', () => clicked = true);
        await checkForLogins();
        expect(clicked).toBe(true);
    });
});
