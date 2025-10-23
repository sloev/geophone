
console.log('Script loaded!')
var cacheStorageKey = 'minimal-pwa-8'

var cacheList = [
    "./static/icons",
    "./static/icons/icon-512x512.png",
    "./static/icons/icon-152x152.png",
    "./static/icons/icon-96x96.png",
    "./static/icons/icon-128x128.png",
    "./static/icons/icon-192x192.png",
    "./static/icons/icon-256x256.png",
    "./static/icons/icon-384x384.png",
    "./static/icons/icon-72x72.png",
    "./static/icons/icon-48x48.png",
    "./static/icons/icon-144x144.png",
    "./static/idb.js",
    "./static/main.css",
    "./static/main.js",
    "./static/nosleep.js",
    "./static/water.css"
]

self.addEventListener('install', function (e) {
    console.log('Cache event!')
    e.waitUntil(
        caches.open(cacheStorageKey).then(function (cache) {
            console.log('Adding to Cache:', cacheList)
            return cache.addAll(cacheList)
        }).then(function () {
            console.log('Skip waiting!')
            return self.skipWaiting()
        })
    )
})

self.addEventListener('activate', function (e) {
    console.log('Activate event')
    e.waitUntil(
        Promise.all(
            caches.keys().then(cacheNames => {
                return cacheNames.map(name => {
                    if (name !== cacheStorageKey) {
                        return caches.delete(name)
                    }
                })
            })
        ).then(() => {
            console.log('Clients claims.')
            return self.clients.claim()
        })
    )
})

self.addEventListener('fetch', function (e) {
    // console.log('Fetch event:', e.request.url)
    e.respondWith(
        caches.match(e.request).then(function (response) {
            if (response != null) {
                console.log('Using cache for:', e.request.url)
                return response
            }
            console.log('Fallback to fetch:', e.request.url)
            return fetch(e.request.url)
        })
    )
})