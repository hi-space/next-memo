if(!self.define){let e,s={};const a=(a,n)=>(a=new URL(a+".js",n).href,s[a]||new Promise((s=>{if("document"in self){const e=document.createElement("script");e.src=a,e.onload=s,document.head.appendChild(e)}else e=a,importScripts(a),s()})).then((()=>{let e=s[a];if(!e)throw new Error(`Module ${a} didn’t register its module`);return e})));self.define=(n,t)=>{const i=e||("document"in self?document.currentScript.src:"")||location.href;if(s[i])return;let c={};const d=e=>a(e,i),o={module:{uri:i},exports:c,require:d};s[i]=Promise.all(n.map((e=>o[e]||d(e)))).then((e=>(t(...e),c)))}}define(["./workbox-1bb06f5e"],(function(e){"use strict";importScripts(),self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"/_next/app-build-manifest.json",revision:"e9716032414cd6e6b4246f4549609078"},{url:"/_next/static/DMz-dMs3gNYaUjddLJazY/_buildManifest.js",revision:"24e7610f9eaea81d4df6ffe9957d1490"},{url:"/_next/static/DMz-dMs3gNYaUjddLJazY/_ssgManifest.js",revision:"b6652df95db52feb4daf4eca35380933"},{url:"/_next/static/chunks/133-97f3cb0aa3fda400.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/152-b722ac1f5a69d29c.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/4bd1b696-46634a19aee361cb.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/517-37d305bd0f8eed50.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/799-358bd82ceb783601.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/app/_not-found/page-f73ba5a0f5883000.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/app/api/download/%5Bid%5D/route-52ec2c3be64c175d.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/app/api/download/route-64774c4765cb855d.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/app/api/memos/%5Bid%5D/route-8e2f2c8a9b045326.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/app/api/memos/route-c605c807b82c4d97.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/app/api/summary/route-a3ccf80d4a5d503f.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/app/layout-658ac72c6ea29bfb.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/app/page-95c4f52b1d9abfb4.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/d3ac728e-f829ad17c125e07e.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/framework-d29117d969504448.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/main-727d78e5fab8f350.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/main-app-ec67efe7d14cd78c.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/pages/_app-d23763e3e6c904ff.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/pages/_error-9b7125ad1a1e68fa.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/chunks/polyfills-42372ed130431b0a.js",revision:"846118c33b2c0e922d7b3a7676f81f6f"},{url:"/_next/static/chunks/webpack-94ce2950d0ae1c22.js",revision:"DMz-dMs3gNYaUjddLJazY"},{url:"/_next/static/css/8f1826ec412a79cc.css",revision:"8f1826ec412a79cc"},{url:"/icon/logo.png",revision:"57efce49301916e27e38d6d6d7bea314"},{url:"/logo.png",revision:"9a852c3d31772510dc3be898a8d01fa0"},{url:"/manifest.json",revision:"c7ca8a1179aaccbad87f7bcb36ab2ca5"},{url:"/next-memo.png",revision:"44c39ec69ef01c94d2ee30ea95c985b0"}],{ignoreURLParametersMatching:[]}),e.cleanupOutdatedCaches(),e.registerRoute("/",new e.NetworkFirst({cacheName:"start-url",plugins:[{cacheWillUpdate:async({request:e,response:s,event:a,state:n})=>s&&"opaqueredirect"===s.type?new Response(s.body,{status:200,statusText:"OK",headers:s.headers}):s}]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,new e.CacheFirst({cacheName:"google-fonts-webfonts",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:31536e3})]}),"GET"),e.registerRoute(/^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,new e.StaleWhileRevalidate({cacheName:"google-fonts-stylesheets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,new e.StaleWhileRevalidate({cacheName:"static-font-assets",plugins:[new e.ExpirationPlugin({maxEntries:4,maxAgeSeconds:604800})]}),"GET"),e.registerRoute(/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,new e.StaleWhileRevalidate({cacheName:"static-image-assets",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/image\?url=.+$/i,new e.StaleWhileRevalidate({cacheName:"next-image",plugins:[new e.ExpirationPlugin({maxEntries:64,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp3|wav|ogg)$/i,new e.CacheFirst({cacheName:"static-audio-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:mp4)$/i,new e.CacheFirst({cacheName:"static-video-assets",plugins:[new e.RangeRequestsPlugin,new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:js)$/i,new e.StaleWhileRevalidate({cacheName:"static-js-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:css|less)$/i,new e.StaleWhileRevalidate({cacheName:"static-style-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\/_next\/data\/.+\/.+\.json$/i,new e.StaleWhileRevalidate({cacheName:"next-data",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute(/\.(?:json|xml|csv)$/i,new e.NetworkFirst({cacheName:"static-data-assets",plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({url:e})=>{if(!(self.origin===e.origin))return!1;const s=e.pathname;return!s.startsWith("/api/auth/")&&!!s.startsWith("/api/")}),new e.NetworkFirst({cacheName:"apis",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:16,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({url:e})=>{if(!(self.origin===e.origin))return!1;return!e.pathname.startsWith("/api/")}),new e.NetworkFirst({cacheName:"others",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:86400})]}),"GET"),e.registerRoute((({url:e})=>!(self.origin===e.origin)),new e.NetworkFirst({cacheName:"cross-origin",networkTimeoutSeconds:10,plugins:[new e.ExpirationPlugin({maxEntries:32,maxAgeSeconds:3600})]}),"GET"),self.__WB_DISABLE_DEV_LOGS=!0}));
