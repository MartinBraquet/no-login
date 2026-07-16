/**
 * @jest-environment jsdom
 * */

import {checkForLogins, getAttributes} from '../src/core.js';
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
