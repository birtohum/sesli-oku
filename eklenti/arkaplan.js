// Kısayol ya da panelden gelen komutu etkin sekmedeki okuyucuya iletir; okuyucu yoksa önce yükler.
async function gonder(komut, deger) {
  const [sekme] = await chrome.tabs.query({active: true, currentWindow: true});
  if (!sekme || !sekme.id || /^(chrome|edge|about):/.test(sekme.url || "")) return {hata: "Bu sayfada çalışamıyorum."};
  await chrome.scripting.executeScript({target: {tabId: sekme.id}, files: ["okuyucu.js"]});
  return chrome.tabs.sendMessage(sekme.id, {komut, deger});
}
chrome.commands.onCommand.addListener((komut) => { gonder(komut); });
chrome.runtime.onMessage.addListener((m, _g, cevap) => { if (m.panel) { gonder(m.komut, m.deger).then(cevap); return true; } });
