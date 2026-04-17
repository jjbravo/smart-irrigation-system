# Documentación Técnica: main.py (Sistema de Riego Inteligente)

Este documento explica detalladamente el funcionamiento del firmware `main.py` para el NodeMCU (ESP8266), diseñado para controlar un sistema de 4 válvulas mediante una aplicación móvil y programación horaria.

## Explicación Línea a Línea

### 1. Importaciones y Seguridad Inicial
- **Líneas 1-7**: Se importan los módulos esenciales de MicroPython:
  - `machine`: Para control de hardware (pines, I2C, ADC).
  - `network`: Gestión de WiFi.
  - `socket`: Creación del servidor web API.
  - `json`: Para guardar y leer la configuración en formato texto.
  - `os`: Para verificar archivos en la memoria flash.
  - `time`: Para retardos y esperas.
  - `gc`: Garbage Collector, limpia la memoria RAM dinámicamente.
- **Líneas 9-12**: `time.sleep(3)`. Es un "seguro de vida". Da tiempo al usuario para borrar el archivo o detener la ejecución antes de que el procesador entre en el bucle principal, lo que evita bloqueos.

### 2. Configuración de Hardware
- **Líneas 14-17 (I2C)**: Configura la comunicación con el reloj (RTC). D1 y D2 son los pines estándar para datos y reloj.
- **Líneas 18-23 (Válvulas)**: Diccionario que mapea nombres lógicos (`r1`-`r4`) a pines físicos. Usamos `machine.Pin.OUT` porque son salidas de control.
- **Línea 26**: Bucle que pone todos los relés en `1`. En relés *Active Low*, el `1` significa apagado. Esto asegura que al encender la placa, el agua no empiece a correr.
- **Líneas 29-33 (Entradas)**: 
  - `PULL_UP`: Usa la resistencia interna para que el pin lea `1` por defecto y `0` al presionar.
  - `ADC(0)`: El pin A0 lee voltajes analógicos. Es una técnica para tener más botones de los que los pines digitales permiten.

### 3. Persistencia y Funciones RTC
- **Líneas 43-61 (Configuración)**: Define los horarios por defecto y una función que busca el archivo `riego_config.json`. Si existe, sobreescribe los horarios con los guardados por el usuario desde la App.
- **Líneas 64-65 (BCD)**: Los relojes RTC guardan la hora en formato *Binary Coded Decimal*. Estas funciones matemáticas convierten esos datos a números decimales normales (0-59, 0-23).
- **Línea 67-74**: Lee 3 bytes de la memoria del RTC (segundos, minutos, horas) y los convierte a formato decimal.

### 4. Servidor Web y Red
- **Líneas 77-82**: Configura el NodeMCU como un Punto de Acceso (AP). `pm=network.WLAN.PM_NONE` es vital: evita que el WiFi entre en modo ahorro y desaparezca la red.
- **Líneas 84-87**: Crea un Socket (puerto 80). El `s.settimeout(0.1)` es clave para que el servidor no se quede "congelado" esperando una conexión y pueda seguir revisando los botones y el reloj.

### 5. El Bucle Principal (`While True`)
- **Líneas 94-96**: En cada vuelta, pregunta la hora al RTC y la formatea como texto (`HH:MM`).
- **Líneas 98-125 (Botones)**: Compara el estado actual de los botones con el anterior (`b_prev`). Si cambió de `1` a `0`, invierte (toggle) el estado de la válvula correspondiente.
- **Líneas 130-135 (Lógica Automática)**: Recorre la lista de horarios. Si la hora actual coincide con la hora "on", enciende; si coincide con "off", apaga.

### 6. La API (Comunicación con la App)
- **Líneas 139-146**: Acepta conexiones de la App. Gestiona peticiones `OPTIONS` (necesario por seguridad web/CORS).
- **Líneas 156-166 (GET /status)**: Responde a la App con todo el estado: hora rtc, horarios cargados y estado de cada válvula.
- **Líneas 168-187 (POST)**: Recibe órdenes de la App para encender válvulas manualmente o actualizar la lista de horarios, la cual guarda inmediatamente en la memoria Flash.

---

## Puntos Clave para Profundizar

| Tema | ¿Por qué es importante? | Término de búsqueda recomendado |
| :--- | :--- | :--- |
| **MicroPython `machine`** | Control total de hardware, PWM, interrupciones. | *MicroPython machine module documentation* |
| **Sockets de red** | Cómo viaja la información entre la App y la placa. | *Python sockets tutorial simplified* |
| **Protocolo I2C** | Cómo hablan los sensores y relojes con la CPU. | *How I2C communication works ESP8266* |
| **CORS / HTTP Headers** | Seguridad web que permite o bloquea la App. | *Cross-Origin Resource Sharing explanation* |
| **JSON Serialization** | Guardar datos complejos en archivos de texto. | *Python json dumps and loads guide* |
| **BCD (Binary Coded Decimal)** | Formato en que los chips guardan datos de tiempo. | *BCD to Decimal conversion algorithm* |

## Fuentes y Referencias recomendadas
1. [Documentación Oficial de MicroPython](https://docs.micropython.org/en/latest/esp8266/quickref.html)
2. [Datasheet del ESP8266](https://www.espressif.com/sites/default/files/documentation/0a-esp8266ex_datasheet_en.pdf)
3. [Tutorial de Sockets en MicroPython](https://randomnerdtutorials.com/esp32-esp8266-micropython-web-server-json-api/) (Muy similar a tu estructura).
4. [Guía del RTC DS3231/DS1307](https://datasheets.maximintegrated.com/en/ds/DS3231.pdf) (Para entender los registros de memoria).
