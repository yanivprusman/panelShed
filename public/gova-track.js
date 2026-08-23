/* govaBoard analytics beacon — the panelShed edition of bizSites' gova-track.js.
   The storefront is one niche ("panelshed") of the ג.ח. פרוייקטים venture, so its
   traffic and CTA clicks land in the same first-party collector as the landers.
   Posts same-origin to /api/gova/track, which next.config.ts rewrites to the
   govaBoard instance on the NUC — no CORS, no third parties, no cookies beyond
   local/session storage. */
(function () {
  var niche = "panelshed";

  function uid() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(36).slice(2);
  }
  var vid = "no-storage", sid = "no-storage";
  try { vid = localStorage.gvid || (localStorage.gvid = uid()); } catch (e) {}
  try { sid = sessionStorage.gsid || (sessionStorage.gsid = uid()); } catch (e) {}

  var q = new URLSearchParams(location.search);
  function send(type) {
    var payload = JSON.stringify({
      e: type, n: niche, p: location.pathname, v: vid, s: sid,
      r: document.referrer || "",
      us: q.get("utm_source") || "", um: q.get("utm_medium") || "", uc: q.get("utm_campaign") || "",
      g: q.get("gclid") || ""
    });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/gova/track", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/gova/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true });
      }
    } catch (e) { /* analytics must never break the store */ }
  }

  send("pageview");

  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (h.indexOf("tel:") === 0) send("click_tel");
    else if (h.indexOf("wa.me") !== -1 || h.indexOf("whatsapp") !== -1) send("click_wa");
  }, true);

  document.addEventListener("submit", function () { send("form_submit"); }, true);
})();
