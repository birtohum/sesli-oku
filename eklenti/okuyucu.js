// Sesli Oku: sayfadaki asıl metni bulur, Türkçe sesle paragraf paragraf okur ve okunan yeri vurgular.
// Sayfaya bir kez yüklenir; sonraki komutlar mesajla gelir. Hiçbir şey dışarı gönderilmez.
(() => {
  if (window.__sesliOku) return;
  const durum = {paragraflar: [], sira: 0, okuyor: false, hiz: 1, gorunum: false};
  window.__sesliOku = durum;

  // ---------------------------------------------------------------- asıl içerik
  const ATLA = "nav, header, footer, aside, form, script, style, noscript, [role=navigation], [role=banner], [role=contentinfo], [aria-hidden=true], .reklam, .ad, .ads, .cookie, #cookie";
  function okunurMu(el) {
    if (el.closest(ATLA)) return false;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return false;
    const metin = el.innerText.trim();
    if (metin.length < 2) return false;
    // bağlantı yoğun bloklar (menü, etiket bulutu) atlanır
    const baglanti = [...el.querySelectorAll("a")].reduce((t, a) => t + a.innerText.length, 0);
    return baglanti / metin.length < 0.6 || /^H[1-6]$/.test(el.tagName);
  }
  function kapsayici() {
    const aday = document.querySelector("article, main, [role=main]");
    if (aday && aday.innerText.length > 400) return aday;
    // en çok paragraf metni taşıyan blok
    let en = document.body, enUzun = 0;
    for (const el of document.querySelectorAll("div, section")) {
      const n = [...el.children].filter(c => c.tagName === "P").reduce((t, p) => t + p.innerText.length, 0);
      if (n > enUzun) { enUzun = n; en = el; }
    }
    return enUzun > 300 ? en : document.body;
  }
  function topla() {
    const kok = kapsayici();
    // Tablolar (uyarı kutuları, bilgi kutuları) ve resim alt yazıları akışı böler; okuma sırasına alınmaz.
    const liste = [...kok.querySelectorAll("h1, h2, h3, h4, p, li, blockquote")]
      .filter(el => !el.querySelector("p, li") && !el.closest("table, figure, .infobox, .ambox, .thumb, .reference, .mw-editsection") && okunurMu(el));
    const baslik = document.querySelector("h1");
    if (baslik && !liste.includes(baslik) && baslik.innerText.trim().length > 1) liste.unshift(baslik);
    return liste;
  }

  // ---------------------------------------------------------------- ses
  function ses() {
    const sesler = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith("tr"));
    return sesler.find(v => /natural|neural|online/i.test(v.name)) || sesler[0] || null;
  }
  let vurgulu = null;
  function vurgula(el) {
    if (vurgulu) vurgulu.classList.remove("sesli-oku-simdi");
    vurgulu = el;
    if (el) { el.classList.add("sesli-oku-simdi"); el.scrollIntoView({block: "center", behavior: "smooth"}); }
  }
  function oku() {
    speechSynthesis.cancel();
    const el = durum.paragraflar[durum.sira];
    if (!el) { durum.okuyor = false; vurgula(null); bildir(durum.paragraflar.length ? "Sayfanın sonu." : "Okunacak metin bulunamadı."); return; }
    vurgula(el);
    const s = new SpeechSynthesisUtterance(el.innerText.replace(/\s+/g, " ").trim());
    const v = ses(); if (v) s.voice = v;
    s.lang = "tr-TR"; s.rate = durum.hiz;
    s.onend = () => { if (durum.okuyor) { durum.sira++; oku(); } };
    speechSynthesis.speak(s);
  }

  // ---------------------------------------------------------------- görünüm ve bildirim
  const stil = document.createElement("style");
  stil.textContent = `.sesli-oku-simdi{outline:3px solid #f2b01e!important;outline-offset:3px;background:rgba(242,176,30,.18)!important;border-radius:4px}
    html.sesli-oku-buyuk{font-size:125%!important}
    html.sesli-oku-buyuk body, html.sesli-oku-buyuk body *{background-color:#000!important;color:#fff!important;border-color:#fff!important;line-height:1.7!important}
    html.sesli-oku-buyuk a, html.sesli-oku-buyuk a *{color:#ffe14d!important;text-decoration:underline!important}
    html.sesli-oku-buyuk img, html.sesli-oku-buyuk video{filter:none!important;background:none!important}
    #sesli-oku-bildirim{position:fixed;z-index:2147483647;left:50%;bottom:24px;transform:translateX(-50%);background:#111;color:#fff;font:600 16px/1.4 system-ui,sans-serif;padding:10px 16px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.35)}`;
  document.documentElement.append(stil);
  let zaman;
  function bildir(metin) {
    let b = document.getElementById("sesli-oku-bildirim");
    if (!b) { b = document.createElement("div"); b.id = "sesli-oku-bildirim"; b.setAttribute("role", "status"); document.body.append(b); }
    b.textContent = metin; clearTimeout(zaman); zaman = setTimeout(() => b.remove(), 2500);
  }

  // ---------------------------------------------------------------- komutlar
  const komutlar = {
    oku() {
      if (durum.okuyor) { durum.okuyor = false; speechSynthesis.cancel(); bildir("Duraklatıldı"); return; }
      if (!durum.paragraflar.length) durum.paragraflar = topla();
      durum.okuyor = true; oku();
    },
    dur() { durum.okuyor = false; speechSynthesis.cancel(); durum.sira = 0; vurgula(null); bildir("Durduruldu"); },
    sonraki() { if (!durum.paragraflar.length) durum.paragraflar = topla(); durum.sira = Math.min(durum.sira + 1, durum.paragraflar.length - 1); durum.okuyor = true; oku(); },
    onceki() { if (!durum.paragraflar.length) durum.paragraflar = topla(); durum.sira = Math.max(durum.sira - 1, 0); durum.okuyor = true; oku(); },
    hiz(d) { durum.hiz = Math.max(0.5, Math.min(2, d)); if (durum.okuyor) oku(); bildir(`Hız: ${durum.hiz.toFixed(1)}×`); },
    gorunum() { durum.gorunum = !durum.gorunum; document.documentElement.classList.toggle("sesli-oku-buyuk", durum.gorunum); bildir(durum.gorunum ? "Büyük yazı ve yüksek karşıtlık açık" : "Normal görünüm"); },
  };
  chrome.runtime.onMessage.addListener((m, _g, cevap) => {
    if (m.komut === "bilgi") {
      if (!durum.paragraflar.length) durum.paragraflar = topla();
      const yanitla = () => {
      const aciklamasiz = [...document.images].filter(i => i.width > 60 && i.height > 60 && !(i.getAttribute("alt") || "").trim()).length;
      cevap({paragraf: durum.paragraflar.length, aciklamasiz, ses: (ses() || {}).name || null, okuyor: durum.okuyor, hiz: durum.hiz, gorunum: durum.gorunum});
      };
      // Sesler tarayıcıda geç yüklenir: liste boşsa bir an bekle
      if (speechSynthesis.getVoices().length) yanitla();
      else { speechSynthesis.onvoiceschanged = yanitla; setTimeout(yanitla, 1200); }
      return true;
    }
    if (komutlar[m.komut]) komutlar[m.komut](m.deger);
    cevap({tamam: true});
  });
})();
