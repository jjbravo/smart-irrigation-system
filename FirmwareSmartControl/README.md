# 🔧 Firmware NodeMCU (MicroPython)

Esta sección detalla los pasos para recuperar y programar la placa NodeMCU ESP8266.

## 📦 Instalación de Herramientas

```bash
# Instalación/Actualización de esptool (Para flasheo profundo)
python3 -m pip install esptool --user --upgrade

# Instalación de ampy (Para subir archivos .py individuales)
python3 -m pip install adafruit-ampy --user

# Instalación de mpremote (Recomendado versión 1.25.0)
python3 -m pip install mpremote==1.25.0 --user
```

## 🛠️ Proceso de Recuperación y Flasheo

Si la placa no responde o entra en bucle de reinicio:

1. **Borrado de Memoria (Crucial):**
   ```bash
   ~/.local/bin/esptool.py --port /dev/ttyUSB0 erase_flash
   ```

2. **Flasheo de MicroPython (Estable):**
   Se recomienda usar la versión **v1.27.0** con modo **`dout`** a **57600 baudios**.
   ```bash
   # Nota: Asegúrate de que el archivo .bin esté en la carpeta superior o ajusta la ruta
   ~/.local/bin/esptool.py --port /dev/ttyUSB0 --chip esp8266 --baud 57600 write_flash --flash_mode dout --flash_size detect 0x0 ../ESP8266_GENERIC-20251209-v1.27.0.bin
   ```

## 🚀 Subida de Código

Asegúrate de que Thonny esté cerrado antes de ejecutar el comando desde dentro de esta carpeta (`FirmwareSmartControl`):

```bash
# Usando ampy
~/.local/bin/ampy --port /dev/ttyUSB0 put main.py

# Usando mpremote
~/.local/bin/mpremote connect /dev/ttyUSB0 cp main.py :main.py
```
