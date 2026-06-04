// Instala imediatamente
self.addEventListener('install', (event) => {
    console.log('SW instalado');
    self.skipWaiting();
});

// Assume controle imediatamente
self.addEventListener('activate', (event) => {
    console.log('SW ativado');
    event.waitUntil(self.clients.claim());
});

// Sempre busca da internet
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
    );
});