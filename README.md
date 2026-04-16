# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

---

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
   ~/.local/bin/esptool.py --port /dev/ttyUSB0 --chip esp8266 --baud 57600 write_flash --flash_mode dout --flash_size detect 0x0 ../ESP8266_GENERIC-20251209-v1.27.0.bin
   ```

## 🚀 Subida de Código

Asegúrate de que Thonny esté cerrado antes de ejecutar:

```bash
# Usando ampy
~/.local/bin/ampy --port /dev/ttyUSB0 put main.py

# Usando mpremote
~/.local/bin/mpremote connect /dev/ttyUSB0 cp main.py :main.py
```

