# Backend del timbre

Recibe el aviso HTTP del ESP32, lo guarda en Supabase, notifica por
WhatsApp (Meta Cloud API) y por Web Push a los celulares que instalaron
la PWA, y sirve un panel para administrar números y ver el historial.

## Configuración

1. Copia `.env.example` como `.env` y llena los valores (ver comentarios
   de cada variable ahí mismo).
2. Corre `sql/schema.sql` una vez en el SQL editor de tu proyecto de
   Supabase (crea las 3 tablas que usa la app).
3. Genera las llaves VAPID, una sola vez, para Web Push:
   ```
   npx web-push generate-vapid-keys
   ```
   Copia `Public Key` / `Private Key` a `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`.
4. Si todavía no tienes una plantilla de WhatsApp aprobada, créala:
   ```
   npm install
   node scripts/crear-plantilla-whatsapp.js
   ```
   Meta tarda de minutos a ~24h en aprobarla. Hasta entonces el envío por
   WhatsApp va a fallar (queda logueado en la consola, no tumba el resto
   de la app).
5. `DEVICE_SHARED_SECRET` debe ser el mismo valor que pongas en el sketch
   ESP32 (`esp32/timbre_notificador`), en la constante del mismo nombre.

## Correr localmente

El panel admin es una app de React (en `frontend/`) que se compila a
`public/`, la carpeta que el backend sirve como estática. Hay que
compilarla antes de levantar el backend (o cada vez que cambies algo ahí):

```
cd frontend && npm install && npm run build && cd ..
npm install
npm start
```
Sirve en `http://localhost:3000` (o el `PORT` que definas). `public/` es
generado (está en `.gitignore`), no se edita a mano.

## Desplegar en EasyPanel

1. Crea un servicio "App" en EasyPanel apuntando a este repo, con build
   path `/backend` (el `Dockerfile` está ahí, EasyPanel lo detecta solo).
2. Configura ahí — no en el repo — todas las variables de `.env.example`
   con sus valores reales.
3. Una vez desplegado, si la URL pública final es distinta a la que ya
   está en `SERVER_URL` del sketch ESP32, actualízala (avísame y lo hago).

## Notas

- El panel tiene una pantalla de login propia (no el popup nativo del
  navegador). Por debajo sigue siendo HTTP Basic Auth: el login prueba
  las credenciales contra `GET /api/auth/check` y, si son válidas, las
  guarda en `sessionStorage` del navegador (se pierden al cerrar la
  pestaña) para mandarlas en cada llamada a la API.
- Activar notificaciones push es autoservicio: cualquiera que abra la
  página puede darle a "Activar notificaciones" sin necesitar las
  credenciales de admin.
- Los íconos de la PWA (`frontend/public/icons/icon.svg`) son un
  placeholder simple. Para mejor soporte (sobre todo en iOS),
  reemplázalos más adelante por PNGs reales de 192x192 y 512x512.
