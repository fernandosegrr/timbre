# Detector de timbre - ESP32

Sketch para ESP32 (Arduino core) que detecta un timbre inalámbrico por
GPIO4 y notifica un servidor propio vía HTTP POST.

## Configuración antes de compilar

1. Copia `secrets.example.h` como `secrets.h` en esta misma carpeta y
   coloca ahí el SSID y password de la red WiFi real. `secrets.h` no se
   sube al repositorio (está en `.gitignore`).
2. `SERVER_URL` en `timbre_notificador.ino` ya apunta al host de EasyPanel
   (`https://postgres-timbre.d6cr6o.easypanel.host/api/timbre`), pero ese
   backend todavía no está construido (hoy responde 502). Ajusta el path
   si defines rutas distintas cuando lo despliegues. Los dominios
   `*.easypanel.host` son HTTPS-only, por eso el sketch usa
   `WiFiClientSecure` con `setInsecure()` en vez de HTTP plano.
3. Abre `timbre_notificador.ino` con Arduino IDE, o inclúyelo en `src/`
   de un proyecto PlatformIO, y compila para una placa ESP32 DevKit.

## Qué hace

- Detecta el timbre por GPIO4 (`INPUT_PULLDOWN`) — lógica ya validada,
  sin cambios.
- Al detectarlo, envía un `POST` a `SERVER_URL` con `Content-Type:
  application/json` y body `{"event": "doorbell_ring", "device_id":
  "esp32-timbre-01"}`. El timestamp lo agrega el servidor al recibirlo.
- Si no hay WiFi o el POST falla (timeout de ~5s), lo reporta por Serial
  pero sigue funcionando: el detector nunca se bloquea ni se detiene.
- Reintenta la conexión WiFi automáticamente en segundo plano si se
  pierde la señal.
- Reporta estado por Serial cada 5 minutos (uptime, memoria libre, señal
  WiFi) y se reinicia preventivamente cada 24h como medida básica de
  salud del equipo (ajustable en `HORAS_ENTRE_REINICIOS`).
