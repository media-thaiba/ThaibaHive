import { NextResponse } from "next/server";
import { getJwtSecretBytes } from "@thaiba/auth/config";
import { jwtVerify } from "jose";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Dev-only: never expose this in a production build.
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)thaibahive_session=([^;]+)/);
  const token = match ? match[1] : null;

  let session: Record<string, unknown> | null = null;
  let sessionError: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecretBytes());
      session = payload as Record<string, unknown>;
    } catch (e) {
      sessionError = e instanceof Error ? e.message : "verify failed";
    }
  }

  const nonce = request.headers.get("x-nonce") || "";
  const host = request.headers.get("host");
  const origin = host ? `${new URL(request.url).protocol}//${host}` : new URL(request.url).origin;

  // The real diagnostic payload is collected CLIENT-SIDE (this script runs in
  // the browser and can read layout rects, CSS vars, localStorage and zoom).
  const script = `<!doctype html><html lang="en"><head><meta charSet="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Browser Diagnostics</title>
<style>
  :root{color-scheme:dark light}
  body{margin:0;padding:24px;background:#0b1020;color:#e6edf7;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  h1{font:600 20px/1.3 system-ui,sans-serif;margin:0 0 4px}
  .sub{color:#93a4bd;margin:0 0 16px;font-family:system-ui,sans-serif}
  .row{display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
  button{background:#1d4ed8;color:#fff;border:0;border-radius:8px;padding:9px 16px;font:600 13px system-ui,sans-serif;cursor:pointer}
  button:hover{background:#2563eb}
  pre{background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:14px;overflow:auto;max-height:70vh;white-space:pre-wrap;word-break:break-word}
  .ok{color:#4ade80}.bad{color:#f87171}
</style></head><body>
<h1>Browser Diagnostics</h1>
<p class="sub">Open this page in Chrome AND Edge, then click <b>Copy JSON</b> in each and paste both back.</p>
<div class="row"><button id="copy">Copy JSON</button><button id="probe">Re-probe app tab</button><button id="resetState" style="background:#059669">Reset Edge to Dark Obsidian Theme</button><span id="status"></span></div>
<div class="row"><label class="sub" style="margin:0">App tab URL <input id="appurl" value="${origin}/" style="width:280px;background:#0f172a;color:#e6edf7;border:1px solid #1e293b;border-radius:6px;padding:6px 8px;font:12px ui-monospace,monospace"/></label></div>
<pre id="out">Collecting…</pre>
<script nonce="${nonce}">
(function(){
  function rect(el){ if(!el) return null; var r=el.getBoundingClientRect();
    return {l:Math.round(r.left),t:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}; }
  var de=document.documentElement, cs=getComputedStyle(de);
  var aside=document.querySelector('aside');
  var h1=document.querySelector('h1');
  var padded=document.querySelector('.shell-main-wrapper')||document.querySelector("[class*='lg:pl']");
  var card=document.querySelector("[class*='bg-card']");
  var cw=de.clientWidth, offenders=[];
  document.querySelectorAll('body *').forEach(function(el){
    var b=el.getBoundingClientRect(); if(b.width===0) return;
    if(b.right>cw+1||b.left<-1){
      offenders.push(el.tagName+'.'+String(el.className||'').slice(0,40)
        +' pos='+getComputedStyle(el).position+' l='+Math.round(b.left)+' r='+Math.round(b.right));
    }
  });
  var snap={
    when:new Date().toISOString(),
    href:location.href,
    ua:navigator.userAgent,
    dpr:window.devicePixelRatio,
    zoom:+(window.outerWidth/window.innerWidth).toFixed(4),
    inner:window.innerWidth+'x'+window.innerHeight,
    outer:window.outerWidth+'x'+window.outerHeight,
    clientW:cw, scrollW:de.scrollWidth, scrollX:Math.round(window.scrollX),
    hOverflow:de.scrollWidth-cw,
    rootClass:de.className,
    inlineColorScheme:de.style.colorScheme||'(empty)',
    prefersDark:window.matchMedia('(prefers-color-scheme: dark)').matches,
    prefersDarkMq:window.matchMedia('(prefers-color-scheme: dark)').media,
    varSidebarWidth:cs.getPropertyValue('--current-sidebar-width').trim(),
    varContentMax:cs.getPropertyValue('--content-max-width').trim(),
    varSidebarCollapsed:cs.getPropertyValue('--sidebar-collapsed-width').trim(),
    bodyBg:getComputedStyle(document.body).backgroundColor,
    bodyColor:getComputedStyle(document.body).color,
    aside:rect(aside),
    asideBg:aside?getComputedStyle(aside).backgroundColor:null,
    asideShadow:aside?getComputedStyle(aside).boxShadow.slice(0,140):null,
    h1:rect(h1), h1Text:h1?h1.textContent:null,
    paddedPadLeft:padded?getComputedStyle(padded).paddingLeft:null,
    cardBg:card?getComputedStyle(card).backgroundColor:null,
    storedTheme:localStorage.getItem('theme'),
    storedCollapse:localStorage.getItem('sidebar-collapsed'),
    overflowOffenders:offenders.slice(0,10),
    stylesheets:Array.prototype.map.call(document.styleSheets,function(s){
      try{ return s.cssRules.length+' rules :: '+(s.href||'(inline)'); }
      catch(e){ return 'BLOCKED :: '+s.href; }
    })
  };
  window.__DIAG__=snap;

  // Cross-tab probe: open/focus the app tab and read its LIVE layout. This is
  // what actually proves whether the dashboard renders differently, rather than
  // inferring it from the diagnostics page's own (unstyled) DOM.
  window.__PROBE__=function(){
    var target=document.getElementById('appurl').value||'${origin}/';
    var s=document.getElementById('status');
    s.textContent='Probing '+target+' …'; s.className='';
    var w=window.open(target,'_blank');
    if(!w){ s.textContent='Popup blocked — allow popups for this site'; s.className='bad'; return Promise.resolve(null); }
    var tries=0;
    function read(){
      tries++;
      var d;
      try{ d=w.document; }catch(e){
        if(tries<40) return setTimeout(read,500);
        s.textContent='Could not read '+target+' (different origin?)'; s.className='bad'; return null;
      }
      var dde=d.documentElement, dcs=getComputedStyle(dde);
      var daside=d.querySelector('aside');
      var dh1=d.querySelector('h1');
      var dpadded=d.querySelector('.shell-main-wrapper')||d.querySelector("[class*='lg:pl']");
      var dcw=dde.clientWidth;
      var doff=[];
      d.querySelectorAll('body *').forEach(function(el){
        var b=el.getBoundingClientRect(); if(b.width===0) return;
        if(b.right>dcw+1||b.left<-1){
          doff.push(el.tagName+'.'+String(el.className||'').slice(0,40)
            +' pos='+getComputedStyle(el).position+' l='+Math.round(b.left)+' r='+Math.round(b.right));
        }
      });
      var live={
        url:w.location.href,
        htmlClass:dde.className,
        inlineColorScheme:dde.style.colorScheme||'(empty)',
        prefersDark:w.matchMedia('(prefers-color-scheme: dark)').matches,
        dpr:w.devicePixelRatio,
        zoom:+(w.outerWidth/w.innerWidth).toFixed(4),
        inner:w.innerWidth+'x'+w.innerHeight,
        clientW:dcw, scrollW:dde.scrollWidth, scrollX:Math.round(w.scrollX),
        hOverflow:dde.scrollWidth-dcw,
        varSidebarWidth:dcs.getPropertyValue('--current-sidebar-width').trim()||'(unset)',
        varContentMax:dcs.getPropertyValue('--content-max-width').trim()||'(unset)',
        bodyBg:getComputedStyle(d.body).backgroundColor,
        asideRect:daside?{l:Math.round(daside.getBoundingClientRect().left),w:Math.round(daside.getBoundingClientRect().width)}:null,
        asideBg:daside?getComputedStyle(daside).backgroundColor:null,
        h1Rect:dh1?{l:Math.round(dh1.getBoundingClientRect().left),w:Math.round(dh1.getBoundingClientRect().width)}:null,
        h1Text:dh1?dh1.textContent:null,
        padLeft:dpadded?getComputedStyle(dpadded).paddingLeft:null,
        cardBg:(function(){var c=d.querySelector("[class*='bg-card']");return c?getComputedStyle(c).backgroundColor:null;})(),
        overflowOffenders:doff.slice(0,10)
      };
      snap.appTab=live;
      document.getElementById('out').textContent=JSON.stringify(snap,null,2);
      s.textContent='App tab probed — scroll up and Copy JSON'; s.className='ok';
      return live;
    }
    setTimeout(read,4000);
  };
  document.getElementById('probe').onclick=window.__PROBE__;

  document.getElementById('resetState').onclick=function(){
    localStorage.removeItem('theme');
    localStorage.removeItem('sidebar-collapsed');
    location.reload();
  };

  document.getElementById('out').textContent=JSON.stringify(snap,null,2);
  document.getElementById('copy').onclick=function(){
    navigator.clipboard.writeText(JSON.stringify(snap,null,2)).then(function(){
      var s=document.getElementById('status'); s.textContent='Copied!'; s.className='ok';
    },function(){ var s=document.getElementById('status'); s.textContent='Copy failed — select the text manually'; s.className='bad'; });
  };
})();
</script>
</body></html>`;

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
      // Surfaced so we can confirm the browser is talking to THIS server build.
      "X-Diag-Session": session ? String(session.role ?? "ok") : sessionError ? "invalid:" + sessionError : "anonymous",
    },
  });
}
