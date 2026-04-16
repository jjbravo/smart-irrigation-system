import machine
import network
import socket
import json
import os
import time
import gc

# --- RETRASO DE SEGURIDAD ---
# Permite interrumpir la ejecución con herramientas como ampy/mpremote antes del bucle
print("Esperando 3 segundos para carga de código...")
time.sleep(3)

# --- CONFIGURACIÓN HARDWARE ---
# I2C (Reloj): D1 (SCL), D2 (SDA) -> GPIO 5, 4
# Usamos pines estándar I2C en NodeMCU.
i2c = machine.I2C(scl=machine.Pin(5), sda=machine.Pin(4))
valves = {
    "r1": machine.Pin(16, machine.Pin.OUT), # D0
    "r2": machine.Pin(0, machine.Pin.OUT),  # D3
    "r3": machine.Pin(2, machine.Pin.OUT),  # D4
    "r4": machine.Pin(14, machine.Pin.OUT) # D5
}

# Forzamos apagado inicial
for v in valves.values(): v.value(0)

# Botones físicos
btn1 = machine.Pin(12, machine.Pin.IN, machine.Pin.PULL_UP) # D6 -> r1
btn2 = machine.Pin(13, machine.Pin.IN, machine.Pin.PULL_UP) # D7 -> r2
btn3 = machine.Pin(15, machine.Pin.IN) # D8 -> r3 (Pull-down externo)
# El botón 4 usa el puerto analógico A0 para evitar usar pines de la Flash (S1, S2, S3)
adc4 = machine.ADC(0) 

b1_prev, b2_prev, b4_prev = 1, 1, 1
b3_prev = 0 # D8 es pull-down (Inicia en 0)

ADDR_RTC = 0x68
FILE_NAME = "riego_config.json"

# Variables de control
# Ahora horarios es una LISTA de dicts: [{"id": "r1", "on": "HH:MM", "off": "HH:MM"}, ...]
horarios = [
    {"id": "r1", "on": "06:00", "off": "06:10"},
    {"id": "r2", "on": "18:00", "off": "18:10"}
]


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
    # Eliminado parpadeo LED (Indica ejecución)

    h, m, seg = obtener_hora_rtc()
    hora_str = "{:02d}:{:02d}:{:02d}".format(h, m, seg)
    hora_min_actual = "{:02d}:{:02d}".format(h, m)

    # 1. LÓGICA BOTONES FÍSICOS
    # Botón 1 -> r1
    b1_act = btn1.value()
    if b1_act == 0 and b1_prev == 1:
        valves["r1"].value(not valves["r1"].value())
        time.sleep(0.05)
    b1_prev = b1_act

    # Botón 2 -> r2
    b2_act = btn2.value()
    if b2_act == 0 and b2_prev == 1:
        valves["r2"].value(not valves["r2"].value())
        time.sleep(0.05)
    b2_prev = b2_act

    # Botón 3 -> r3 (D8 es Pull-down: 1 activo)
    b3_act = btn3.value()
    if b3_act == 1 and b3_prev == 0:
        valves["r3"].value(not valves["r3"].value())
        time.sleep(0.05)
    b3_prev = b3_act

    # Botón 4 -> r4 (Usa A0 como digital)
    b4_act = 1 if adc4.read() > 500 else 0
    if b4_act == 0 and b4_prev == 1:
        valves["r4"].value(not valves["r4"].value())
        time.sleep(0.05)
    b4_prev = b4_act



    # 2. LÓGICA AUTOMÁTICA
    for p in horarios:
        v_id = p.get('id')
        if v_id in valves:
            v_pin = valves[v_id]
            if hora_min_actual == p["on"]: v_pin.value(1)
            elif hora_min_actual == p["off"]: v_pin.value(0)

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
            v_states = {"v"+k[1:]: v.value() for k, v in valves.items()}
            is_manual = any(v.value() for v in valves.values())
            resp = {
                "statusCode": 200,
                "hora": hora_str,
                "manual": is_manual,
                "prog": horarios
            }
            resp.update(v_states)

        elif "POST /manual" in request:
            v_id = data_j.get('id')
            if v_id in valves:
                valves[v_id].value(int(data_j['val']))
                resp = {"statusCode": 200, "state": valves[v_id].value()}

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
    time.sleep(0.01)
