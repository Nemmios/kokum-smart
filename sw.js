/* KOKUM SMART · service worker
   Simpan rangka aplikasi dalam peranti supaya aplikasi boleh dibuka walaupun tiada internet.
   Data disimpan oleh aplikasi sendiri (IndexedDB); permintaan ke Supabase tidak disentuh di sini.
   Berfungsi untuk kedua-dua versi: banyak fail (folder js/ css/) dan satu fail (index.html sahaja). */
const VERSI = 'kokum-smart-v12';
const RANGKA = ['./', 'index.html'];
const PILIHAN = ['config.js', 'css/app.css', 'js/import.js', 'js/db.js', 'js/luartalian.js', 'js/pajsk.js', 'js/pajsk-data.js', 'js/ais-data.js', 'js/ais.js', 'js/ais-kejohanan.js',
  'js/fasa2.js', 'js/kem.js', 'js/surat-aset.js', 'js/lantikan.js', 'js/mesyuarat.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/lencana-256.png', 'icons/tekad-480.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'];
const PUSTAKA = /cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/;

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(VERSI).then(async (c) => {
    await Promise.all(RANGKA.map((u) => c.add(u).catch(() => {})));
    // fail yang tiada (contohnya versi satu fail) dilangkau sahaja
    await Promise.all(PILIHAN.map((u) => c.add(u).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSI).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function simpan(req, res) {
  if (res && (res.ok || res.type === 'opaque')) { const salinan = res.clone(); caches.open(VERSI).then((c) => c.put(req, salinan)).catch(() => {}); }
  return res;
}

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Rangkaian dahulu supaya guru dapat versi terkini. Jika talian lemah (> 6 saat) atau tiada, guna salinan dalam peranti.
    const jaringan = fetch(req).then((res) => simpan(req, res));
    const sandaran = () => caches.match(req, { ignoreSearch: req.mode === 'navigate' }).then((r) => r || (req.mode === 'navigate' ? caches.match('index.html').then((x) => x || caches.match('./')) : undefined));
    ev.respondWith(new Promise((selesai) => {
      let siap = false;
      const beri = (r) => { if (!siap && r) { siap = true; selesai(r); } };
      const t = setTimeout(() => sandaran().then(beri), 6000);
      jaringan.then((r) => { clearTimeout(t); beri(r); })
        .catch(() => { clearTimeout(t); sandaran().then((r) => { if (r) beri(r); else if (!siap) { siap = true; selesai(Response.error()); } }); });
    }));
    ev.waitUntil(jaringan.catch(() => {}));
  } else if (PUSTAKA.test(url.host)) {
    ev.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => simpan(req, res))));
  }
  // permintaan ke Supabase tidak disimpan di sini
});
