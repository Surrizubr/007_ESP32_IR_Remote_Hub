import { DeviceTypeInfo } from '../types';
import { tvCategory } from './presets/tvPresets';
import { decoderCategory } from './presets/decoderPresets';
import { acCategory } from './presets/acPresets';
import { fanCategory } from './presets/fanPresets';
import { smartboxCategory } from './presets/smartboxPresets';
import { soundCategory } from './presets/soundPresets';
import { dvdCategory } from './presets/dvdPresets';
import { projectorCategory } from './presets/projectorPresets';
import { cameraCategory } from './presets/cameraPresets';
import { lightsCategory } from './presets/lightsPresets';

export const DEVICE_LIBRARY: DeviceTypeInfo[] = [
  tvCategory,
  decoderCategory,
  acCategory,
  fanCategory,
  smartboxCategory,
  soundCategory,
  dvdCategory,
  projectorCategory,
  cameraCategory,
  lightsCategory,
];
