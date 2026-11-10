(function(){
  try {
    if (navigator.webdriver) return; // skip headless/automated browsers (e.g. Playwright verification)

    var scriptTag = document.currentScript;
    var SITE = scriptTag && scriptTag.getAttribute('data-site');
    if (!SITE) return;

    var ENDPOINT = 'https://script.google.com/macros/s/AKfycbwOqTTLkqZ_frFyT6N0QcjYZT3jsG0puhq9wRmrQSPxhFgn0fXET3AoGVj4PiHMNHcg/exec';
    var INTEREST_THRESHOLD = 30; // seconds of foreground time before "관심 높음"

    var params = new URLSearchParams(location.search);
    var source = params.get('utm_source');
    if (!source) {
      if (document.referrer) {
        try { source = new URL(document.referrer).hostname; } catch(e) { source = document.referrer; }
      } else {
        source = '다이렉트';
      }
    }

    var ua = navigator.userAgent;
    var isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
    var os = /Android/i.test(ua) ? '안드로이드'
      : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
      : /Windows/i.test(ua) ? 'Windows'
      : /Mac/i.test(ua) ? 'Mac'
      : '기타';
    var device = (isMobile ? '모바일' : '데스크톱') + '(' + os + ')';

    function send(stage, extra) {
      var payload = {
        type: 'visit_alert', stage: stage, site: SITE,
        title: document.title, path: location.pathname + location.search,
        source: source, device: device, ts: new Date().toISOString()
      };
      for (var k in extra) payload[k] = extra[k];
      fetch(ENDPOINT, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      }).catch(function(){});
    }

    fetch('https://get.geojs.io/v1/ip/geo.json').then(function(r){ return r.json(); }).then(function(geo){
      return (geo && (geo.city || geo.region)) || '';
    }).catch(function(){ return ''; }).then(function(loc){
      send('visit', { location: loc });

      var elapsed = 0, lastTick = Date.now(), fired = false;
      var timer = setInterval(function(){
        if (document.visibilityState === 'visible') {
          elapsed += (Date.now() - lastTick) / 1000;
        }
        lastTick = Date.now();
        if (!fired && elapsed >= INTEREST_THRESHOLD) {
          fired = true;
          send('interest', { location: loc, duration: Math.round(elapsed) });
          clearInterval(timer);
        }
      }, 2000);
      document.addEventListener('visibilitychange', function(){ lastTick = Date.now(); });
    });
  } catch(e) {}
})();
