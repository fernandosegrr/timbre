/*
 * Detector de timbre inalámbrico con notificación HTTP - ESP32
 * ---------------------------------------------------------------------
 * Detecta la señal del timbre en GPIO4 (lógica ya validada manualmente,
 * NO se modifica) y, al detectarla, envía una notificación HTTP POST
 * a un servidor propio.
 *
 * Requiere un archivo "secrets.h" en esta misma carpeta con:
 *   #define WIFI_SSID     "..."
 *   #define WIFI_PASSWORD "..."
 * Ver "secrets.example.h" como plantilla. secrets.h NO se sube a git
 * (está listado en .gitignore) para no exponer la contraseña de la red.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "secrets.h"   // Define WIFI_SSID y WIFI_PASSWORD (no se sube a git)

// ======================= Configuración del servidor =======================
// URL del backend en EasyPanel. TODAVÍA NO ESTÁ CONSTRUIDO (por eso hoy
// responde 502): esta es la dirección donde va a vivir una vez desplegado.
// El path "/api/timbre" es un supuesto razonable, ajústalo cuando definas
// las rutas reales del backend.
//
// Nota: los dominios *.easypanel.host se sirven solo por HTTPS (TLS en su
// proxy), no por HTTP plano como se planeó originalmente. Por eso
// notificarTimbre() usa WiFiClientSecure más abajo.
const char* SERVER_URL = "https://postgres-timbre.d6cr6o.easypanel.host/api/timbre";
const char* DEVICE_ID  = "esp32-timbre-01";
const int   HTTP_TIMEOUT_MS = 5000; // Timeout corto: si el server no responde, no bloquear mucho

// ======================= Detección del timbre (VALIDADO - NO TOCAR) ========
const int PIN_TIMBRE = 4;                     // GPIO4 / D4
const unsigned long TIEMPO_SILENCIO_MS = 800;

bool timbreActivo = false;
unsigned long ultimaActividad = 0;

// ======================= Reconexión WiFi =======================
const unsigned long INTERVALO_RECONEXION_MS = 10000; // reintento cada 10s si se pierde la señal
unsigned long ultimoIntentoReconexion = 0;

// ======================= Salud / mantenimiento del equipo =======================
const unsigned long INTERVALO_HEALTH_LOG_MS = 5UL * 60UL * 1000UL;      // reporte de estado cada 5 min
const unsigned long HORAS_ENTRE_REINICIOS   = 24;                       // reinicio preventivo cada 24h
const unsigned long INTERVALO_REINICIO_MS   = HORAS_ENTRE_REINICIOS * 60UL * 60UL * 1000UL;
unsigned long ultimoHealthLog = 0;

// ======================= WiFi: conexión inicial (bloqueante) =======================
// Se ejecuta una sola vez en setup(). Es bloqueante a propósito: sin WiFi
// el dispositivo no puede notificar nada, así que esperamos hasta lograrlo.
void conectarWiFi() {
  Serial.print("Conectando a la red WiFi \"");
  Serial.print(WIFI_SSID);
  Serial.println("\"...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    intentos++;

    // Si tras ~15s no conectó, se reintenta desde cero (evita quedar
    // colgado en un mal estado del radio WiFi).
    if (intentos % 30 == 0) {
      Serial.println();
      Serial.println("Todavía sin conexión, reintentando...");
      WiFi.disconnect();
      delay(100);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }

  Serial.println();
  Serial.print("WiFi conectado. IP: ");
  Serial.println(WiFi.localIP());
}

// ======================= WiFi: reconexión durante loop() (NO bloqueante) ===========
// A diferencia de conectarWiFi(), esta función nunca usa delay() ni espera:
// solo dispara un intento de reconexión cada cierto intervalo y sigue de
// largo, para no congelar la detección del timbre mientras el WiFi está caído.
void gestionarReconexionWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long ahora = millis();
  if (ahora - ultimoIntentoReconexion >= INTERVALO_RECONEXION_MS) {
    ultimoIntentoReconexion = ahora;
    Serial.println("WiFi desconectado. Reintentando conexión en segundo plano...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

// ======================= Notificación HTTP al detectar el timbre ===================
void notificarTimbre() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("No se pudo notificar: no hay conexión WiFi en este momento.");
    return; // El detector sigue funcionando aunque no se pueda avisar
  }

  // Cliente TLS sin validación de certificado: mantiene esto simple para un
  // proyecto hobby. SERVER_URL es HTTPS porque así lo exige el dominio de
  // EasyPanel (ver nota junto a SERVER_URL).
  WiFiClientSecure clienteSeguro;
  clienteSeguro.setInsecure();

  HTTPClient http;
  http.begin(clienteSeguro, SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);

  String cuerpo = String("{\"event\":\"doorbell_ring\",\"device_id\":\"") + DEVICE_ID + "\"}";
  int codigo = http.POST(cuerpo);

  if (codigo > 0) {
    Serial.print("Notificación enviada. Código HTTP: ");
    Serial.println(codigo);
  } else {
    Serial.print("Fallo al enviar la notificación: ");
    Serial.println(http.errorToString(codigo));
    // No se detiene ni bloquea el programa: el detector sigue activo
    // aunque el servidor esté caído o inalcanzable.
  }

  http.end();
}

// ======================= Salud del equipo =======================
void gestionarSalud() {
  unsigned long ahora = millis();

  // Reporte periódico de estado por Serial (uptime, memoria libre, señal WiFi)
  if (ahora - ultimoHealthLog >= INTERVALO_HEALTH_LOG_MS) {
    ultimoHealthLog = ahora;
    Serial.print("[SALUD] Uptime: ");
    Serial.print(ahora / 1000);
    Serial.print("s | Heap libre: ");
    Serial.print(ESP.getFreeHeap());
    Serial.print(" bytes | WiFi: ");
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("conectado (RSSI ");
      Serial.print(WiFi.RSSI());
      Serial.println(" dBm)");
    } else {
      Serial.println("desconectado");
    }
  }

  // Reinicio preventivo: en equipos con uptime muy largo pueden acumularse
  // problemas de memoria/estabilidad. Reiniciar cada cierto tiempo es una
  // medida simple de "salud" del dispositivo (ajustable en HORAS_ENTRE_REINICIOS).
  if (ahora >= INTERVALO_REINICIO_MS) {
    Serial.println("[SALUD] Reinicio preventivo programado alcanzado. Reiniciando...");
    Serial.flush();
    delay(100);
    ESP.restart();
  }
}

// ======================= setup() =======================
void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(PIN_TIMBRE, INPUT_PULLDOWN);
  Serial.println("Detector de timbre iniciado. Esperando señal en GPIO4...");

  conectarWiFi();
}

// ======================= loop() =======================
void loop() {
  // ---- Detección del timbre (lógica validada, sin cambios) ----
  int lectura = digitalRead(PIN_TIMBRE);

  if (lectura == HIGH) {
    ultimaActividad = millis();

    if (!timbreActivo) {
      timbreActivo = true;
      Serial.println("¡TIMBRE DETECTADO!");
      notificarTimbre();
    }
  }

  if (timbreActivo && (millis() - ultimaActividad > TIEMPO_SILENCIO_MS)) {
    timbreActivo = false;
    Serial.println("Timbre en silencio (listo para el siguiente toque).");
  }

  // ---- Tareas de mantenimiento (no bloquean la detección) ----
  gestionarReconexionWiFi();
  gestionarSalud();
}
