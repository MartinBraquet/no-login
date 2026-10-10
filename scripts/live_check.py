#!/usr/bin/env python3
"""Load the built add-on in a throwaway Firefox profile and visit pages to check that it still works.

For each url it prints a JSON summary of the DOM after the page settled (remaining dialogs, login forms,
banners...) together with the add-on's console logs, and saves a screenshot + page source under scripts/out/.

    npm run build
    python3 -m venv .venv && .venv/bin/pip install selenium
    .venv/bin/python scripts/live_check.py https://www.facebook.com/nature.be/ https://www.instagram.com/nature_org/

Environment variables: EXT=0 runs without the add-on (to compare), HEADLESS=0 shows the browser,
WAIT=<seconds> changes how long to wait after each page load (default 6).
Requires Firefox and geckodriver (paths below are for the snap packages).
"""
import sys, time, json, os, zipfile, pathlib
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service

REPO = str(pathlib.Path(__file__).resolve().parent.parent)
OUT = pathlib.Path(__file__).parent / "out"
HEADLESS = os.environ.get("HEADLESS", "1") == "1"
WITH_EXT = os.environ.get("EXT", "1") == "1"
WAIT = float(os.environ.get("WAIT", "6"))

def build_xpi():
    xpi = OUT / "no-login-test.xpi"
    with zipfile.ZipFile(xpi, "w", zipfile.ZIP_DEFLATED) as z:
        for rel in ["manifest.json", "src/popup.html", "dist/background.bundle.js", "dist/content.bundle.js", "dist/popup.bundle.js", "dist/utils.bundle.js"]:
            z.write(os.path.join(REPO, rel), rel)
        for f in os.listdir(os.path.join(REPO, "images")):
            z.write(os.path.join(REPO, "images", f), "images/" + f)
    return str(xpi)

opts = Options()
opts.binary_location = "/snap/firefox/current/usr/lib/firefox/firefox"
if HEADLESS:
    opts.add_argument("-headless")
opts.set_preference("intl.accept_languages", "en-US, en")
opts.enable_bidi = True
driver = webdriver.Firefox(options=opts, service=Service("/snap/bin/geckodriver"))
driver.set_window_size(1400, 1000)

logs = []
def on_console(msg):
    try:
        txt = " ".join(str(a.value) for a in msg.args) if msg.args else msg.text
    except Exception:
        txt = str(getattr(msg, "text", msg))
    logs.append(f"[{msg.level}] {txt}")
driver.script.add_console_message_handler(on_console)

if WITH_EXT:
    driver.install_addon(build_xpi(), temporary=True)

PROBE_JS = r"""
const q = s => document.querySelectorAll(s).length;
const dialogs = [...document.querySelectorAll('[role="dialog"]')].map(d => ({
  label: d.getAttribute('aria-label'), labelledby: d.getAttribute('aria-labelledby'),
  text: (d.innerText||'').slice(0,200), attrs: [...d.attributes].map(a=>a.name+'='+a.value.slice(0,60)).join(' ')
}));
return {
  url: location.href, title: document.title,
  bodyTextLen: (document.body.innerText||'').length,
  bodyTextHead: (document.body.innerText||'').slice(0, 400),
  dialogs,
  login_popup_cta_form: q('#login_popup_cta_form'),
  loginForm: q('#loginForm'),
  nosnippet: q('[data-nosnippet]'),
  fixedBottom: q('.fixed.bottom-0'),
  inert: q('[inert]'),
  roleButtons: q('[role="button"]'),
  forms: [...document.forms].map(f => (f.id||'') + ' ' + (f.action||'').slice(0,80)),
  bodyClass: document.body.className.slice(0,200),
  bodyOverflow: getComputedStyle(document.body).overflow,
  topChildren: [...document.body.children].map(c => c.tagName + '#' + c.id + '.' + String(c.className).slice(0,40) + ' h=' + c.getBoundingClientRect().height + ' txt=' + (c.innerText||'').length),
};
"""

results = []
for url in sys.argv[1:]:
    logs.clear()
    driver.get(url)
    time.sleep(WAIT)
    try:
        info = driver.execute_script(PROBE_JS)
    except Exception as e:
        info = {"error": str(e)}
    info["requested"] = url
    info["ext_logs"] = [l for l in logs if "no-login" in l]
    tag = url.replace("https://", "").replace("/", "_")[:80] + ("_ext" if WITH_EXT else "_noext")
    driver.save_screenshot(str(OUT / (tag + ".png")))
    with open(OUT / (tag + ".html"), "w") as f:
        f.write(driver.page_source)
    results.append(info)
    info.pop("topChildren", None); print(json.dumps(info, indent=1, ensure_ascii=False))
    print("=" * 100)
try:
    driver.quit()
except Exception: pass
