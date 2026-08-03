# Relay de fotos (Termux)

Corre en un celular/tablet Android (con Termux) conectado a la misma red
WiFi que el DVR de cámaras. Sirve de puente entre el backend (en la nube)
y el DVR (en la red local): pregunta al backend si hay un timbrazo
esperando foto y, si lo hay, captura un frame del DVR por RTSP y lo sube.

Así el DVR nunca se expone directamente a internet - solo este script
hace peticiones salientes hacia el backend.

## Instalación

En Termux:

```
pkg install ffmpeg curl
```

Copia `timbre-relay.sh` al dispositivo y edita las variables al principio
del archivo:

- `DVR_USER` / `DVR_PASSWORD` / `DVR_HOST` / `DVR_PORT` / `DVR_PATH`: datos
  de conexión RTSP de tu DVR.
- `BACKEND_URL`: la URL pública de tu backend en EasyPanel.
- `DEVICE_SHARED_SECRET`: el mismo valor que `DEVICE_SHARED_SECRET` en el
  `.env` del backend (y en el sketch del ESP32).

Luego:

```
chmod +x timbre-relay.sh
./timbre-relay.sh
```

Los logs quedan en `~/timbre-relay.log`.

## Arranque automático

Instrucciones completas al final de `timbre-relay.sh` (comentario), usando
Termux:Boot para que arranque solo al prender el dispositivo.
