/* Privacy-first Cloudflare Web Analytics activation.
 * Default: zero network requests. No cookies/storage/fingerprinting added here.
 * Standard pageview collection only; no custom event payloads.
 * Browser opt-out signals are honored before the beacon is loaded.
 */
(function () {
  "use strict";
  var token = window.VASQUEZ_ANALYTICS_TOKEN;
  if (typeof token !== "string" || !/^[a-f0-9]{32}$/i.test(token)) return;
  if (navigator.globalPrivacyControl === true) return;
  if (navigator.doNotTrack === "1" || window.doNotTrack === "1" ||
      navigator.msDoNotTrack === "1") return;
  if (document.querySelector('script[data-cf-beacon]')) return;

  var script = document.createElement("script");
  script.type = "module";
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute("data-cf-beacon", JSON.stringify({ token: token }));
  script.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  (document.head || document.documentElement).appendChild(script);
}());
