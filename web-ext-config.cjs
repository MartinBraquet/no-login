module.exports = {
    verbose: true,
    build: {
        overwriteDest: true,
    },
    ignoreFiles: [
        "demo",
        "readme",
        "misc",
        "package-lock.json",
        "*.sh",
        "*.xpi",
        "*.zip",
        "store",
        "test",
        "coverage",
        "releases",
        "web-ext-artifacts",
        "node_modules",
        "martin",
        ".gitignore",
        ".idea",
        ".github",
    ],
    sign: {
        channel: "listed",
        amoMetadata: "releases/amo_metadata.json",
    },
    run: {
        startUrl: [
            "about:debugging#/runtime/this-firefox",
            "https://www.facebook.com/nature.be/?locale=fr_BE",
            "https://www.facebook.com/nature.be/",
            "https://www.linkedin.com/company/the-nature-conservancy",
            "https://www.instagram.com/nature_org/",
            "https://www.instagram.com/nature_org/?hl=fr",
        ],
    },
};