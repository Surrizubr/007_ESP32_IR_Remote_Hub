export type ScreenTab = 'home' | 'copy' | 'automation' | 'schedule' | 'devices' | 'history' | 'sync';

export type IRProtocol =
  // Universal / TV / Decoders / Audio
  | 'NEC'
  | 'NEC2'
  | 'SONY'
  | 'RC5'
  | 'RC5X'
  | 'RC6'
  | 'SAMSUNG'
  | 'SAMSUNG36'
  | 'PANASONIC'
  | 'LG'
  | 'LG2'
  | 'SHARP'
  | 'DENON'
  | 'JVC'
  | 'PIONEER'
  | 'AIWA_RC_T501'
  | 'DISH'
  | 'CARRIER_AC'
  | 'RCMM'
  | 'EPSON'
  // Air Conditioning
  | 'COOLIX'
  | 'DAIKIN'
  | 'DAIKIN2'
  | 'DAIKIN160'
  | 'DAIKIN176'
  | 'DAIKIN216'
  | 'DAIKIN128'
  | 'MITSUBISHI'
  | 'MITSUBISHI_AC'
  | 'MITSUBISHI136'
  | 'MITSUBISHI112'
  | 'GREE'
  | 'FUJITSU_AC'
  | 'TCL'
  | 'TCL112AC'
  | 'HITACHI'
  | 'HITACHI_AC'
  | 'HITACHI_AC1'
  | 'HITACHI_AC2'
  | 'HITACHI_AC3'
  | 'HAIER_AC'
  | 'HAIER_AC_YRW02'
  | 'KELVINATOR'
  | 'TOSHIBA_AC'
  | 'WHIRLPOOL_AC'
  | 'MIDEA'
  | 'MIDEA24'
  | 'VESTEL_AC'
  | 'ARGO'
  | 'GOODWEATHER'
  | 'ELECTRA_AC'
  | 'SHARP_AC'
  | 'SAMSUNG_AC'
  | 'PANASONIC_AC'
  | 'CARRIER_AC40'
  | 'CARRIER_AC64'
  | 'CARRIER_AC84'
  | 'CARRIER_AC128'
  | 'BOSCH144'
  | 'RHOSS'
  | 'TROTEC_3550'
  // Fan / Smart Boxes / Lights / Others
  | 'SYMPHONY'
  | 'TECHNIBEL_AC'
  | 'BOSE'
  | 'WHYNTER'
  | 'INAX'
  | 'MULTIBRACKETS'
  // Raw / Custom
  | 'RAW'
  | 'PRONTO'
  | 'GLOBALCACHE';

export type DeviceCategory =
  | 'tv'
  | 'decoder'
  | 'ac'
  | 'fan'
  | 'smartbox'
  | 'sound'
  | 'dvd'
  | 'projector'
  | 'camera'
  | 'lights'
  | 'audio'
  | 'custom';

export type ActivityLogType = 'acionamento' | 'captura' | 'aprendizado' | 'automacao';

export interface ActivityLogItem {
  id: string;
  type: ActivityLogType;
  title: string;
  subtitle?: string;
  details?: string;
  protocol?: IRProtocol;
  hexCode?: string;
  bits?: number;
  remoteName?: string;
  buttonLabel?: string;
  actionsCount?: number;
  timestamp: string; // ISO string or timestamp
}

export type RemoteLayoutType =
  | 'tv'
  | 'decoder'
  | 'ac'
  | 'fan'
  | 'sound'
  | 'smartbox'
  | 'dvd'
  | 'projector'
  | 'camera'
  | 'lights'
  | 'custom';

export type DeviceTypeId =
  | 'tv'
  | 'decoder'
  | 'ac'
  | 'fan'
  | 'smartbox'
  | 'sound'
  | 'dvd'
  | 'projector'
  | 'camera'
  | 'lights';

export interface PresetCommand {
  name: string;
  buttonKey: string; // e.g. 'pwr', 'vol_plus', 'ch_plus', 'num_1', etc.
  protocol: IRProtocol;
  hexCode: string;
  bits: number;
  notes?: string;
}

export interface DeviceModel {
  id: string;
  name: string;
  series?: string;
  year?: string;
  protocol: IRProtocol;
  description?: string;
  commands: PresetCommand[];
}

export interface DeviceBrand {
  id: string;
  name: string;
  country?: string;
  isPopular?: boolean;
  models: DeviceModel[];
}

export interface DeviceTypeInfo {
  id: DeviceTypeId;
  name: string;
  category: DeviceCategory;
  layoutType: RemoteLayoutType;
  description: string;
  badge: string;
  color: string;
  brands: DeviceBrand[];
}

export interface RemoteDevice {
  id: string;
  name: string;
  layoutType: RemoteLayoutType;
  isDefault: boolean; // true for standard system remotes, false for custom user added ones
  notes?: string;
  createdAt?: string;
}

export interface IRCommand {
  id: string;
  name: string;
  category: DeviceCategory;
  protocol: IRProtocol;
  hexCode: string; // e.g. "0x20DF10EF"
  bits: number; // e.g. 32
  rawTimings?: number[]; // Raw microsecond pulses [9000, 4500, 560, 1690, ...]
  acState?: number[]; // Multi-byte AC state (Daikin, Mitsubishi AC, etc.)
  repeat?: number; // Number of times to repeat the IR signal (default 0 = send once)
  timestamp: string;
  syncedToEsp32: boolean;
  notes?: string;
  color?: string;
  manufacturer?: string; // e.g. "Samsung", "LG"
  deviceModel?: string;  // e.g. "UN55TU7020"
}

export interface RemoteButtonConfig {
  id: string; // e.g. 'pwr', 'vol_plus', 'dpad_ok', 'num_1'
  label: string;
  commandId?: string; // Linked IRCommand ID (single)
  commandIds?: string[]; // Linked IRCommand IDs (multiple macro support)
  customName?: string;
  iconName?: string;
}

export interface AutomationStep {
  commandId: string;
  delayMs: number; // Delay before executing in ms
}

export type AutomationType = 'trigger' | 'schedule';

export interface AutomationRule {
  id: string;
  name: string;
  type?: AutomationType; // 'trigger' (IR signal detection) OR 'schedule' (time of day)
  enabled: boolean;
  triggerCommandId?: string; // Trigger when ESP32 IR receiver detects this command (exclusive to 'trigger')
  scheduleTimes?: string[]; // Trigger at scheduled times ("HH:MM", e.g. ["07:30", "19:00"]) (exclusive to 'schedule')
  actions: AutomationStep[]; // Actions to send
  description?: string;
  lastTriggered?: string;
  triggerCount: number;
}

export interface AutomationLog {
  id: string;
  ruleName: string;
  triggerCommandName: string;
  timestamp: string;
  actionsExecuted: number;
}

export interface ESP32PinConfig {
  irReceiverPin: number; // GPIO for TSOP38238 / VS1838B IR Receiver
  irTransmitterPin: number; // GPIO for IR LED emitter
  statusLedPin: number; // GPIO for indication
  buzzerPin?: number;
  pwmFrequency: number; // usually 38000 Hz
}

export interface ServiceLog {
  id: string;
  type: 'info' | 'error' | 'success' | 'tx' | 'rx';
  message: string;
  timestamp: string;
}

export interface ESP32DeviceState {
  connected: boolean;
  connectionType: 'ble' | 'wifi' | 'both' | 'offline';
  bleConnected: boolean;
  wifiConnected: boolean;
  bleDeviceName: string;
  wifiSsid: string;
  wifiPassword?: string;
  ipAddress: string;
  bleMac?: string;
  wifiMac?: string;
  rssi: number; // General or last updated RSSI
  wifiRssi?: number;
  bleRssi?: number;
  uptimeSeconds: number;
  freeHeap: number; // bytes
  isSyncing?: boolean;
  logs: ServiceLog[];
  pinConfig: ESP32PinConfig;
  lastReceivedCommand?: {
    protocol: IRProtocol;
    hexCode: string;
    bits: number;
    timestamp: string;
    rawTimings?: number[];
  };
  lastTransmittedCommand?: {
    name: string;
    hexCode: string;
    timestamp: string;
  };
}

export interface WiFiNetwork {
  ssid: string;
  rssi: number;
  secured: boolean;
  channel: number;
}
