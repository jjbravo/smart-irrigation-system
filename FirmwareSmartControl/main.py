import machine
import network
import socket
import json
import os
import time
import gc

# --- CONFIGURACIÓN HARDWARE ---
# I2C: D1 (SCL), D2 (SDA)
i2c = machine.I2C(scl=machine.Pin(5), sda=machine.Pin(4))
v1 = machine.Pin(0, machine.Pin.OUT) # D3 - Válvula 1
v2 = machine.Pin(2, machine.Pin.OUT) # D4 - Válvula 2
# Botón físico en D5 (GPIO 14) con PULL_UP
boton = machine.Pin(14, machine.Pin.IN, machine.Pin.PULL_UP)

ADDR_RTC = 0x68
FILE_NAME = "riego_config.json"

# Variables de control
horarios = {"r1": {"on": "06:00", "off": "06:10"}, "r2": {"on": "18:00", "off": "18:10"}}
secuencia_activa = False
fase_secuencia = 0 # 0: reposo, 1: V1 activo, 2: V2 activo
tiempo_inicio_fase = 0
DURACION_FASE = 10 * 60 # 600 segundos (10 minutos)

# --- PERSISTENCIA ---
def cargar_config():
    global horarios
    try:
        if FILE_NAME in os.listdir():
            with open(FILE_NAME, "r") as f:
                horarios = json.load(f)
            print("Configuración cargada de Flash.")
    except: pass

cargar_config()

# --- FUNCIONES RTC ---
def bcd_to_dec(bcd): return (bcd & 0x0F) + ((bcd >> 4) * 10)
def dec_to_bcd(dec): return (dec // 10 << 4) + (dec % 10)

def obtener_hora_rtc():
    try:
        # Leemos 3 bytes: seg, min, hora
        d = list(i2c.readfrom_mem(ADDR_RTC, 0x00, 3))
        s = bcd_to_dec(d[0] & 0x7F)
        m = bcd_to_dec(d[1])
        h = bcd_to_dec(d[2] & 0x3F)
        return h, m, s
    except:
        return 0, 0, 0

# --- CONFIGURACIÓN RED ---
ap = network.WLAN(network.AP_IF)
ap.active(True)
ap.config(essid="RIEGO_INTELIGENTE", authmode=network.AUTH_OPEN)
ap.ifconfig(('192.168.4.1', '255.255.255.0', '192.168.4.1', '8.8.8.8'))

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(0.1) # Bucle rápido
s.bind(('', 80))
s.listen(5)

print("Servidor de Riego Offline en 192.168.4.1")

while True:
    ahora_unix = time.time()
    h, m, seg = obtener_hora_rtc()
    hora_str = "{:02d}:{:02d}:{:02d}".format(h, m, seg)
    hora_min_actual = "{:02d}:{:02d}".format(h, m)

    # 1. LÓGICA BOTÓN FÍSICO (D5)
    if boton.value() == 0 and not secuencia_activa:
        print("[BOTON] Iniciando ciclo manual...")
        secuencia_activa = True
        fase_secuencia = 1
        tiempo_inicio_fase = ahora_unix
        v1.value(1)
        v2.value(0)
        time.sleep(0.5) # Debounce

    # 2. CONTROL DE SECUENCIA MANUAL
    if secuencia_activa:
        if fase_secuencia == 1:
            if ahora_unix - tiempo_inicio_fase >= DURACION_FASE:
                v1.value(0)
                v2.value(1)
                fase_secuencia = 2
                tiempo_inicio_fase = ahora_unix
                print("[BOTON] Cambio a Válvula 2")
        elif fase_secuencia == 2:
            if ahora_unix - tiempo_inicio_fase >= DURACION_FASE:
                v2.value(0)
                secuencia_activa = False
                fase_secuencia = 0
                print("[BOTON] Ciclo manual finalizado")

    # 3. LÓGICA AUTOMÁTICA (Solo si no hay manual activo)
    if not secuencia_activa:
        for r_id, p in horarios.items():
            obj_v = v1 if r_id == "r1" else v2
            if hora_min_actual == p["on"]: obj_v.value(1)
            elif hora_min_actual == p["off"]: obj_v.value(0)

    # 4. SERVIDOR API
    try:
        conn, addr = s.accept()
        conn.settimeout(0.3)
        request = conn.recv(2048).decode('utf-8')
        
        # Soporte para CORS (App Móvil)
        if "OPTIONS" in request:
            conn.send('HTTP/1.1 204 No Content\nAccess-Control-Allow-Origin: *\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\nAccess-Control-Allow-Headers: Content-Type\nConnection: close\n\n')
            conn.close()
            continue

        # Parsear Body JSON
        try:
            body_index = request.find('\r\n\r\n')
            data = json.loads(request[body_index+4:]) if body_index != -1 else {}
        except: data = {}

        resp = {"statusCode": 404}
        headers = 'HTTP/1.1 200 OK\nContent-Type: application/json\nAccess-Control-Allow-Origin: *\nConnection: close\n\n'

        # ENDPOINTS
        if "GET /status" in request:
            resp = {
                "statusCode": 200,
                "hora": hora_str,
                "v1": v1.value(),
                "v2": v2.value(),
                "manual": secuencia_activa,
                "prog": horarios
            }

        elif "POST /manual" in request:
            target = v1 if data['id'] == "r1" else v2
            target.value(int(data['val']))
            resp = {"statusCode": 200, "state": target.value()}

        elif "POST /setrtc" in request:
            new_time = bytes([dec_to_bcd(data['s']) & 0x7F, dec_to_bcd(data['m']), dec_to_bcd(data['h'])])
            i2c.writeto_mem(ADDR_RTC, 0x00, new_time)
            resp = {"statusCode": 200, "message": "Hora sincronizada"}

        elif "POST /schedule" in request:
            h_on, m_on = map(int, data['on'].split(':'))
            h_off, m_off = map(int, data['off'].split(':'))
            if (h_off * 60 + m_off) <= (h_on * 60 + m_on):
                resp = {"statusCode": 1002, "message": "Error: Off debe ser mayor a On"}
            else:
                horarios[data['id']] = {"on": data['on'], "off": data['off']}
                with open(FILE_NAME, "w") as f: json.dump(horarios, f)
                resp = {"statusCode": 200, "data": horarios}

        conn.send(headers + json.dumps(resp))
        conn.close()
    except OSError:
        pass
    
    gc.collect()
