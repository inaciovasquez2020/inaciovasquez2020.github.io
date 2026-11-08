"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const config = fs.readFileSync(path.join(root, "analytics-config.js"), "utf8");
const loader = fs.readFileSync(path.join(root, "analytics.js"), "utf8");
const validToken = "0123456789abcdef0123456789abcdef";

function run(token, options = {}) {
  const inserted = [];
  const existing = options.existing || null;
  const document = {
    head: { appendChild(script) { inserted.push(script); } },
    querySelector(selector) {
      assert.equal(selector, 'script[data-cf-beacon]');
      return existing;
    },
    createElement(tag) {
      assert.equal(tag, "script");
      return { attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
    }
  };
  const window = {
    VASQUEZ_ANALYTICS_TOKEN: token,
    doNotTrack: options.windowDNT
  };
  const navigator = {
    globalPrivacyControl: options.gpc || false,
    doNotTrack: options.dnt,
    msDoNotTrack: options.msDNT
  };
  const context = vm.createContext({window, document, navigator, JSON});
  vm.runInContext(loader, context, { timeout: 1000 });
  return inserted;
}

// Activated configuration; privacy suppression remains separately tested.
{
  const ctx = vm.createContext({window: {}});
  vm.runInContext(config, ctx, {timeout: 1000});
  assert.equal(ctx.window.VASQUEZ_ANALYTICS_TOKEN, "abf01b9570e64782ab28edf07a40818e");
  assert.equal(run(ctx.window.VASQUEZ_ANALYTICS_TOKEN).length, 1);
  assert.equal(run(null).length, 0);
}
assert.equal(run(undefined).length, 0);
assert.equal(run("").length, 0);
assert.equal(run("YOUR_TOKEN").length, 0);
assert.equal(run("invalid-public-token").length, 0);
assert.equal(run(validToken, {gpc: true}).length, 0);
assert.equal(run(validToken, {dnt: "1"}).length, 0);
assert.equal(run(validToken, {windowDNT: "1"}).length, 0);
assert.equal(run(validToken, {msDNT: "1"}).length, 0);
assert.equal(run(validToken, {existing: {}}).length, 0);
assert.equal(run(validToken).length, 1);
{
  const [script] = run(validToken);
  assert.equal(script.src, "https://static.cloudflareinsights.com/beacon.min.js");
  assert.equal(script.defer, true);
  assert.equal(script.type, "module");
  assert.equal(JSON.parse(script.attributes["data-cf-beacon"]).token, validToken);
  assert.equal(Object.keys(JSON.parse(script.attributes["data-cf-beacon"])).length, 1);
}
const pages = [
  ["index.html", ""],
  ["publications.html", ""],
  ["contact.html", ""],
  ["vasquez-index/index.html", "../"],
];
for (const [page, prefix] of pages) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  const cfg = '<script src="' + prefix + 'analytics-config.js" defer></script>';
  const src = '<script src="' + prefix + 'analytics.js" defer></script>';
  assert.equal(html.split(cfg).length, 2, "config referenced once in " + page);
  assert.equal(html.split(src).length, 2, "loader referenced once in " + page);
  assert.ok(html.indexOf(cfg) < html.indexOf(src), "config must load before loader");
}
assert.ok(!/(?:document\.cookie|localStorage|sessionStorage|navigator\.sendBeacon|fetch\()/.test(loader),
  "application analytics loader should not collect or store visitor data directly");
console.log("PRIVACY_ANALYTICS_TEST := PASS");
