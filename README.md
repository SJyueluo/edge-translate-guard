# Edge Translation Guard

An open-source Microsoft Edge extension that helps web apps keep working after Edge's built-in page translation changes their rendered text nodes.

## What it fixes

Some interactive websites are rendered by React or another UI framework. The framework keeps references to DOM text nodes it created. Page translation can replace those nodes with translated `<font>` elements. When the site later updates a counter, rerenders a button, or removes a component, the framework may still try to use its now-detached original node. That can throw `NotFoundError`, leave visible controls stale, or make the page appear unresponsive.

The extension installs a small repair layer at the page's DOM boundary. It waits for translation activity, recognizes translator-created wrappers (including Edge's `_msttexthash`, `_msthash`, and `_mstmutation` markers), and restores renderer-owned nodes before the app updates them. It does not translate text itself or rewrite the site's source strings.

Click the extension icon to pause or resume protection for the current hostname. The setting is stored in Edge locally. Pausing protection does not disable Edge's translator. The extension makes no network requests and sends no browsing data anywhere.

## Install from source

1. Install Node.js 22 or newer.
2. In this folder, run `npm ci` and `npm run build`.
3. Open `edge://extensions` in Microsoft Edge and turn on **Developer mode**.
4. Select **Load unpacked** and choose the generated `dist` folder. It contains a ready-to-load manifest and all bundled files.

To remove it, select **Remove** on `edge://extensions`. To reset saved per-site choices, remove the extension's local data in Edge's extension settings.

## Development and tests

```sh
npm ci
npm test
npm run build
```

The local automated checks cover the per-host pause setting and verify that the protection runs at `document_start` in the page's JavaScript world. The vendored repair engine comes from an upstream project with React regression tests for Edge's `_mst…` wrappers.

## Permissions

The content script runs at the start of HTTP and HTTPS pages so the repair layer is ready before a user translates a page. It is dormant until it detects translation activity. HTTP/HTTPS host access lets the extension inspect and repair the current page, while `storage` saves the per-host pause list on this device. No remote code, analytics, or external service is used.

## Source and attribution

The repair algorithm in [`vendor/translation-resilience.ts`](vendor/translation-resilience.ts) is copied from [translation-resilience by Alex Speller](https://github.com/alexspeller/translation-resilience), version 0.5.0, upstream commit [`b41125929ab94dd8f2b2caba6accc7773507178d`](https://github.com/alexspeller/translation-resilience/commit/b41125929ab94dd8f2b2caba6accc7773507178d). It is distributed under the MIT License; the original license is preserved in [`vendor/LICENSE.translation-resilience`](vendor/LICENSE.translation-resilience). The extension wrapper, popup, settings bridge, and tests are maintained in this repository.

## Limitations

This addresses DOM corruption caused by page translation. It cannot fix a website bug unrelated to translation, nor can an extension guarantee that every site or future Edge translator version follows the same DOM patterns. If a page still fails, use the popup to pause this guard on that hostname and report the site and Edge version in a GitHub issue.
