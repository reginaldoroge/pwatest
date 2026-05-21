import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

self.skipWaiting()
clientsClaim()

// Precache de todos os arquivos estáticos compilados pelo Vite
precacheAndRoute(self.__WB_MANIFEST)

cleanupOutdatedCaches()

// Garante que rotas de navegação apontem para o index.html da SPA
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Interceptador para receber os arquivos compartilhados via Web Share Target (WhatsApp)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData()
        const file = formData.get('files') // Deve bater com o name: 'files' do manifesto
        
        if (file) {
          const cache = await caches.open('shared-files-cache')
          
          // Armazena o blob do arquivo dentro do Cache Storage da web
          await cache.put(
            new Request('/shared-file'),
            new Response(file, {
              headers: {
                'Content-Type': file.type,
                'X-File-Name': encodeURIComponent(file.name)
              }
            })
          )
        }
      } catch (err) {
        console.error('[SW] Erro ao tratar compartilhamento no Service Worker:', err)
      }

      // Redireciona o usuário para a página inicial com a flag ativa
      // O código de redirecionamento HTTP 303 converte o método de POST para GET
      return Response.redirect('/?share-target=true', 303)
    })())
  }
})
