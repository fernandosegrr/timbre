# timbre

Detector de timbre inalámbrico con notificaciones por WhatsApp, push y foto de quien toca.

## Componentes

- [`esp32/`](esp32/timbre_notificador) - Sketch del ESP32 que detecta el timbre y avisa al backend.
- [`backend/`](backend) - API (Node/Express + Supabase), panel admin (React) y notificaciones (WhatsApp Cloud API + Web Push).
- [`termux-relay/`](termux-relay) - Script para Termux (Android) que, al sonar el timbre, captura una foto del DVR local por RTSP y la sube al backend.

Cada carpeta tiene su propio README con instrucciones de configuración y despliegue.
