ESP32 IR Hub - Firmware (PlatformIO)

Build and flash using PlatformIO (recommended):

1. Instale PlatformIO CLI or use VS Code PlatformIO extension.

To build:

```bash
cd firmware/esp32-platformio
pio run
```

To upload (auto-detects serial port or use `-e` with `--upload-port`):

```bash
pio run -t upload
```

Arduino IDE:

- Abra `firmware/esp32-platformio/src/main.cpp` no Arduino IDE e selecione a placa `ESP32 Dev Module`.
- Instale as bibliotecas `ArduinoJson` e `IRremote` via Library Manager.
- Compile e faça upload.

Notes:
- Ajuste pinos no topo de `main.cpp` se necessário.
- O firmware expõe os endpoints HTTP usados pelo app:
  - `GET /api/status`
  - `POST /api/ir/send` (campo `plain` com JSON)
  - Wi-Fi via BLE caracteristic `CHARACTERISTIC_WIFI` e notificações.
