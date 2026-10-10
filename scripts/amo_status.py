#!/usr/bin/env python3
"""Report the AMO review status of a submitted version.

Reads the add-on id and version from manifest.json. Pass a version as the first
argument to check one other than the current manifest version.

Requires AMO_JWT_ISSUER and AMO_JWT_SECRET in the environment:

    source /home/martin/Documents/Passwords/amo_creds.sh
    export AMO_JWT_ISSUER AMO_JWT_SECRET
    ./scripts/amo_status.py

Exits 0 when the version is signed and public, 2 while it is still pending.
"""

import base64
import hashlib
import hmac
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

API_ROOT = "https://addons.mozilla.org/api/v5"
REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent


def make_token(issuer, secret):
    def b64(raw):
        return base64.urlsafe_b64encode(raw).rstrip(b"=")

    now = int(time.time())
    header = b64(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = b64(json.dumps({
        "iss": issuer,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + 300,
    }).encode())
    signing_input = header + b"." + payload
    signature = b64(hmac.new(secret.encode(), signing_input, hashlib.sha256).digest())
    return (signing_input + b"." + signature).decode()


def get(url, token):
    req = urllib.request.Request(url, headers={
        "Authorization": "JWT " + token,
        "User-Agent": "no-login-amo-status",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        sys.exit("HTTP {} from {}\n{}".format(e.code, url, e.read().decode()[:500]))


def find_version(addon_id, wanted, token):
    url = "{}/addons/addon/{}/versions/?filter=all_with_unlisted".format(
        API_ROOT, urllib.parse.quote(addon_id)
    )
    while url:
        page = get(url, token)
        for version in page.get("results", []):
            if version.get("version") == wanted:
                return version
        url = page.get("next")
    return None


def main():
    manifest = json.loads((REPO_ROOT / "manifest.json").read_text())
    addon_id = manifest["browser_specific_settings"]["gecko"]["id"]
    wanted = sys.argv[1] if len(sys.argv) > 1 else manifest["version"]

    try:
        issuer = os.environ["AMO_JWT_ISSUER"]
        secret = os.environ["AMO_JWT_SECRET"]
    except KeyError as e:
        sys.exit("{} is not set; source your AMO creds and export it".format(e.args[0]))

    token = make_token(issuer, secret)
    version = find_version(addon_id, wanted, token)
    if version is None:
        sys.exit("Version {} has not been submitted to AMO".format(wanted))

    files = version.get("files")
    if files is None:
        files = [version["file"]] if isinstance(version.get("file"), dict) else []
    status = files[0].get("status") if files else "unknown"
    signed = bool(files[0].get("is_signed")) if files else False

    print("version:  {} ({})".format(version.get("version"), version.get("channel")))
    print("status:   {}".format(status))
    print("reviewed: {}".format(version.get("reviewed") or "not yet"))
    print("signed:   {}".format(signed))
    if files:
        print("url:      {}".format(files[0].get("url")))

    if status == "public" and signed:
        print("\nAPPROVED - run ./sign.sh to pull down the signed .xpi")
        return 0
    print("\nStill pending review.")
    return 2


if __name__ == "__main__":
    sys.exit(main())
