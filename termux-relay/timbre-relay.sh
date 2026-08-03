#!/data/data/com.termux/files/usr/bin/bash
#
# Relevo entre el backend del timbre y el DVR de cámaras en la red local.
# Corre en Termux (Android): pregunta al backend si hay un timbrazo
# esperando foto, si hay, captura un frame del DVR por RTSP con ffmpeg y
# lo sube al backend.
#
# Requiere: pkg install ffmpeg curl
#
# ============================================================
# Configuración - edita estos valores
# ============================================================

# --- DVR (RTSP) ---
DVR_USER="admin"
DVR_PASSWORD="TU_PASSWORD_DVR"
DVR_HOST="192.168.0.132"
DVR_PORT="554"
DVR_PATH="chID=1&streamType=main&linkType=tcp"
RTSP_URL="rtsp://${DVR_USER}:${DVR_PASSWORD}@${DVR_HOST}:${DVR_PORT}/${DVR_PATH}"

# --- Backend ---
BACKEND_URL="https://TU_BACKEND"
DEVICE_SHARED_SECRET="TU_SECRETO_COMPARTIDO"   # el mismo DEVICE_SHARED_SECRET del backend/ESP32

# --- Comportamiento ---
INTERVALO_POLL_S=2       # cada cuánto pregunta si hay timbrazo pendiente
TIMEOUT_FFMPEG_S=15       # máximo que espera a que el DVR entregue el frame
TIMEOUT_CURL_GET_S=10     # timeout del GET de pending-photo
TIMEOUT_CURL_POST_S=20    # timeout del POST de la foto (sube ~unos KB-MB)

LOG_FILE="$HOME/timbre-relay.log"
FOTO_TEMP="$HOME/timbre-foto-tmp.jpg"

# ============================================================
# No hace falta tocar nada de aquí para abajo
# ============================================================

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

log "=== Relay de fotos del timbre iniciado ==="

while true; do
  respuesta=$(curl -s --max-time "$TIMEOUT_CURL_GET_S" \
    -H "X-Device-Secret: $DEVICE_SHARED_SECRET" \
    "$BACKEND_URL/api/timbre/pending-photo" 2>>"$LOG_FILE")

  if [ -z "$respuesta" ]; then
    log "Sin respuesta del backend (¿sin WiFi/internet? reintento en ${INTERVALO_POLL_S}s)."
    sleep "$INTERVALO_POLL_S"
    continue
  fi

  pending=$(echo "$respuesta" | grep -o '"pending":[a-z]*' | cut -d: -f2)

  if [ "$pending" = "true" ]; then
    event_id=$(echo "$respuesta" | grep -o '"event_id":[0-9]*' | cut -d: -f2)

    if [ -z "$event_id" ]; then
      log "pending=true pero no se pudo leer event_id de: $respuesta"
      sleep "$INTERVALO_POLL_S"
      continue
    fi

    log "Evento $event_id pendiente de foto. Capturando frame del DVR..."

    if timeout "$TIMEOUT_FFMPEG_S" ffmpeg -y -loglevel error \
        -rtsp_transport tcp -i "$RTSP_URL" \
        -vframes 1 -q:v 3 "$FOTO_TEMP" >>"$LOG_FILE" 2>&1 \
        && [ -s "$FOTO_TEMP" ]; then

      codigo_http=$(curl -s --max-time "$TIMEOUT_CURL_POST_S" -o /dev/null -w "%{http_code}" \
        -H "X-Device-Secret: $DEVICE_SHARED_SECRET" \
        -F "event_id=$event_id" \
        -F "photo=@$FOTO_TEMP;type=image/jpeg" \
        "$BACKEND_URL/api/timbre/foto")

      if [ "$codigo_http" = "200" ]; then
        log "Foto del evento $event_id subida correctamente."
      else
        log "Fallo al subir la foto del evento $event_id (HTTP $codigo_http)."
      fi
    else
      log "ffmpeg no pudo capturar el frame del evento $event_id (¿DVR inalcanzable o timeout de ${TIMEOUT_FFMPEG_S}s?)."
    fi

    rm -f "$FOTO_TEMP"
  fi

  sleep "$INTERVALO_POLL_S"
done

# ============================================================
# Autoarranque con Termux:Boot
# (para que este script arranque solo al prender la tablet/celular,
# sin tener que abrir Termux a mano cada vez)
#
# 1. Instala la app "Termux:Boot" desde F-Droid (no está en Play Store):
#    https://f-droid.org/packages/com.termux.boot/
#    Debe ser de la MISMA fuente que Termux (F-Droid con F-Droid, o
#    Play Store con Play Store) - si se mezclan no funciona.
# 2. Ábrela una vez para que Android le dé permiso de arrancar con el
#    sistema. Después la puedes cerrar, no hace falta dejarla abierta.
# 3. En Termux:
#      mkdir -p ~/.termux/boot
#      cp /ruta/a/timbre-relay.sh ~/.termux/boot/timbre-relay.sh
#      chmod +x ~/.termux/boot/timbre-relay.sh
# 4. En Ajustes de Android > Apps > Termux (y también Termux:Boot),
#    desactiva la optimización/ahorro de batería para ambas. Si no,
#    Android puede matar el proceso en segundo plano tarde o temprano.
# 5. Reinicia el dispositivo una vez para confirmar que arranca solo
#    (revisa que $HOME/timbre-relay.log tenga una línea nueva de
#    "Relay de fotos del timbre iniciado").
#
# Termux:Boot no "instala" esto como servicio de Android: simplemente
# ejecuta, al bootear, cada script que encuentre en ~/.termux/boot/.
# ============================================================
