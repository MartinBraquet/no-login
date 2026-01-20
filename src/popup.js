// Debug: in about:debugging#/runtime/this-firefox, click on "Inspect" for the extension, disable popup auto-hide in the
// ••• menu, click on the extension symbol, click on the button to the left of the ••• menu, select "popup.html".

import {defaultOptions} from "./utils.js";

const local = browser.storage.local;

function setElement(x, value) {
    let element = document.getElementById(x);
    local.get(x, (data) => {
        let d = data[x];
        if (d === undefined) {
            d = defaultOptions[x];
            local.set({[x]: d});
        }
        element[value] = d;
    });
}

function addListener(x, value, conversion) {
    let element = document.getElementById(x);
    element.addEventListener('change', (event) => {
        let v = event.target[value];
        if (conversion === "int") {
            v = parseInt(v);
        }
        local.set({[x]: v});
        console.log("Changed " + x + " to " + v);
    });
}

function setElementAndListener(x, value, conversion) {
    setElement(x, value);
    addListener(x, value, conversion);
}

function restoreDefaults() {
    for (let x in defaultOptions) {
        local.set({[x]: defaultOptions[x]});
        let element = document.getElementById(x);
        if (typeof defaultOptions[x] === "boolean") {
            element.checked = defaultOptions[x];
        } else {
            element.value = defaultOptions[x];
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    setElement("loginsSkipped", "textContent");
    setElementAndListener("facebookWanted", "checked");
    setElementAndListener("instagramWanted", "checked");
    setElementAndListener("linkedinWanted", "checked");
    setElementAndListener("tumblrWanted", "checked");
    document.getElementById("restoreDefaults").addEventListener('click', restoreDefaults);
});
