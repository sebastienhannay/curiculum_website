#!/usr/bin/env node
// Cache-busting for the site's own assets: in the top-level HTML pages
// (index.html, cv.html, 404.html), every href/src pointing to a local CSS,
// JS or image file is rewritten to `file?v=<content hash>`.
// The hash only changes when the file changes, so browsers can keep these
// files for a year (see the headers in firebase.json) yet fetch a new
// version as soon as it's deployed.
//
// Only top-level pages are processed: sub-folders (e.g. the lab-… page)
// are separate projects and are left untouched.
//
// Runs automatically before `firebase deploy` (hosting.predeploy in
// firebase.json). Safe to run any number of times.
//
// usage: node tools/version-assets.mjs [publicDir]

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'public');
const pages = readdirSync(root).filter((name) => name.endsWith('.html')).map((name) => join(root, name));

// href="css/site.css" · src="/resources/x.webp?v=abc123" — local files only
const ASSET = /(href|src)="(?!https?:|\/\/|data:|#)([^"?#]+\.(?:css|js|png|jpe?g|webp|avif|gif|svg|ico))(?:\?v=[0-9a-f]*)?"/g;
const hashes = new Map();
const hashOf = (file) => {
  if (!hashes.has(file)) hashes.set(file, createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 10));
  return hashes.get(file);
};

let changed = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const out = html.replace(ASSET, (match, attr, path) => {
    const file = path.startsWith('/') ? join(root, path) : join(dirname(page), path);
    if (!existsSync(file)) {
      console.warn(`version-assets: ${relative(root, page)} references missing ${path}`);
      return match;
    }
    return `${attr}="${path}?v=${hashOf(file)}"`;
  });
  if (out !== html) {
    writeFileSync(page, out);
    changed++;
    console.log(`version-assets: updated ${relative(root, page)}`);
  }
}
console.log(`version-assets: ${changed} page(s) updated, ${hashes.size} asset(s) fingerprinted`);
