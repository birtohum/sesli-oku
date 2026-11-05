const gonder = (komut, deger) => chrome.runtime.sendMessage({panel: true, komut, deger});
for (const k of ["oku", "onceki", "sonraki", "dur", "gorunum"]) document.getElementById(k).onclick = () => gonder(k);
const hiz = document.getElementById("hiz"), hizDeger = document.getElementById("hiz-deger");
hiz.oninput = () => { hizDeger.textContent = Number(hiz.value).toLocaleString("tr-TR", {minimumFractionDigits: 1}) + "×"; };
hiz.onchange = () => { gonder("hiz", Number(hiz.value)); chrome.storage.local.set({hiz: Number(hiz.value)}); };
chrome.storage.local.get("hiz").then(({hiz: h}) => { if (h) { hiz.value = h; hiz.oninput(); } });
gonder("bilgi").then((b) => {
  const el = document.getElementById("bilgi");
  if (!b || b.hata) { el.textContent = (b && b.hata) || "Bu sayfada çalışamıyorum."; return; }
  el.textContent = `${b.paragraf} okunacak bölüm bulundu. ` + (b.ses ? `Ses: ${b.ses}.` : "Bilgisayarda Türkçe ses bulunamadı; Windows ayarlarından Türkçe konuşma paketi eklenebilir.") +
    (b.aciklamasiz ? ` ${b.aciklamasiz} görselin açıklaması (alt metni) yok; bunlar sesle anlatılamaz.` : "");
  if (b.hiz) { hiz.value = b.hiz; hiz.oninput(); }
}).catch(() => { document.getElementById("bilgi").textContent = "Bu sayfada çalışamıyorum."; });
