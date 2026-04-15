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
led_status = machine.Pin(13, machine.Pin.OUT) # D7 - LED Estado

# Forzamos apagado inicial
v1.value(0)
v2.value(0)
led_status.value(0)

# Botones físicos con PULL_UP
btn1 = machine.Pin(14, machine.Pin.IN, machine.Pin.PULL_UP) # D5 (G14) -> V1
btn2 = machine.Pin(12, machine.Pin.IN, machine.Pin.PULL_UP) # D6 (G12) -> V2

ADDR_RTC = 0x68
FILE_NAME = "riego_config.json"

# Variables de control
# Ahora horarios es una LISTA de dicts: [{"id": "r1", "on": "HH:MM", "off": "HH:MM"}, ...]
horarios = [
    {"id": "r1", "on": "06:00", "off": "06:10"},
    {"id": "r2", "on": "18:00", "off": "18:10"}
]
b1_prev = 1
b2_prev = 1
last_blink = time.ticks_ms()

# --- PERSISTENCIA ---
def cargar_config():
    global horarios
    try:
        if FILE_NAME in os.listdir():
            with open(FILE_NAME, "r") as f:
                data = json.load(f)
                if isinstance(data, list):
                    horarios = data
                print("Configuración cargada de Flash.")
    except: pass

cargar_config()

# --- FUNCIONES RTC ---
def bcd_to_dec(bcd): return (bcd & 0x0F) + ((bcd >> 4) * 10)
def dec_to_bcd(dec): return (dec // 10 << 4) + (dec % 10)

def obtener_hora_rtc():
    try:
        d = list(i2c.readfrom_mem(ADDR_RTC, 0x00, 3))
        s = bcd_to_dec(d[0] & 0x7F)
        m = bcd_to_dec(d[1])
        h = bcd_to_dec(d[2] & 0x3F)
        return h, m, s
    except: return 0, 0, 0

# --- CONFIGURACIÓN RED ---
ap = network.WLAN(network.AP_IF)
ap.active(True)
ap.config(essid="RIEGO_INTELIGENTE", authmode=network.AUTH_OPEN)
ap.ifconfig(('192.168.4.1', '255.255.255.0', '192.168.4.1', '8.8.8.8'))

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(0.1)
s.bind(('', 80))
s.listen(5)

print("Servidor Riego Multi-Evento OK")

while True:
    # 0. LED Parpadeo (Indica ejecución)
    if time.ticks_diff(time.ticks_ms(), last_blink) > 500:
        led_status.value(not led_status.value())
        last_blink = time.ticks_ms()

    h, m, seg = obtener_hora_rtc()
    hora_str = "{:02d}:{:02d}:{:02d}".format(h, m, seg)
    hora_min_actual = "{:02d}:{:02d}".format(h, m)

    # 1. LÓGICA BOTONES FÍSICOS
    b1_act = btn1.value()
    if b1_act == 0 and b1_prev == 1:
        v1.value(not v1.value())
        print("[BTN] Toggle V1:", v1.value())
        time.sleep(0.05)
    b1_prev = b1_act

    b2_act = btn2.value()
    if b2_act == 0 and b2_prev == 1:
        v2.value(not v2.value())
        print("[BTN] Toggle V2:", v2.value())
        time.sleep(0.05)
    b2_prev = b2_act

    # 2. LÓGICA AUTOMÁTICA (Iterar sobre la lista de horarios)
    for p in horarios:
        obj_v = v1 if p['id'] == "r1" else v2
        if hora_min_actual == p["on"]: obj_v.value(1)
        elif hora_min_actual == p["off"]: obj_v.value(0)

    # 3. SERVIDOR API
    try:
        conn, addr = s.accept()
        conn.settimeout(0.3)
        request = conn.recv(2048).decode('utf-8')
        
        if "OPTIONS" in request:
            conn.send('HTTP/1.1 204 No Content\nAccess-Control-Allow-Origin: *\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\nAccess-Control-Allow-Headers: Content-Type\nConnection: close\n\n')
            conn.close()
            continue

        try:
            body_index = request.find('\r\n\r\n')
            data_j = json.loads(request[body_index+4:]) if body_index != -1 else {}
        except: data_j = {}

        resp = {"statusCode": 404}
        headers = 'HTTP/1.1 200 OK\nContent-Type: application/json\nAccess-Control-Allow-Origin: *\nConnection: close\n\n'

        if "GET /status" in request:
            resp = {
                "statusCode": 200,
                "hora": hora_str,
                "v1": v1.value(),
                "v2": v2.value(),
                "manual": (v1.value() or v2.value()),
                "prog": horarios
            }

        elif "POST /manual" in request:
            target = v1 if data_j['id'] == "r1" else v2
            target.value(int(data_j['val']))
            resp = {"statusCode": 200, "state": target.value()}

        elif "POST /setrtc" in request:
            nw_t = bytes([dec_to_bcd(data_j['s']) & 0x7F, dec_to_bcd(data_j['m']), dec_to_bcd(data_j['h'])])
            i2c.writeto_mem(ADDR_RTC, 0x00, nw_t)
            resp = {"statusCode": 200, "message": "Hora sincronizada"}

        elif "POST /schedule" in request:
            # Recibimos la lista completa de horarios: {"prog": [...]}
            if 'prog' in data_j and isinstance(data_j['prog'], list):
                horarios = data_j['prog']
                with open(FILE_NAME, "w") as f: json.dump(horarios, f)
                resp = {"statusCode": 200, "data": horarios}
            else:
                resp = {"statusCode": 400, "message": "Invalid format"}

        conn.send(headers + json.dumps(resp))
        conn.close()
    except OSError: pass
    
    gc.collect()
