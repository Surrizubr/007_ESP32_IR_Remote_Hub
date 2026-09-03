import { DeviceTypeInfo } from '../../types';

export const cameraCategory: DeviceTypeInfo = {
  id: 'camera',
  name: 'Câmera',
  category: 'camera',
  layoutType: 'camera',
  description: 'Câmeras fotográficas DSLR, Mirrorless e filmadoras profissionais com disparo por infravermelho (Canon, Nikon, Sony Alpha, Fujifilm, Olympus, Pentax, Lumix).',
  badge: 'Fotografia & Vídeo',
  color: 'from-slate-700 to-zinc-800',
  brands: [
    {
      id: 'canon-camera',
      name: 'Canon',
      country: 'Japão',
      isPopular: true,
      models: [
        {
          id: 'canon-eos-rebel',
          name: 'Canon EOS Rebel / Linha R Mirrorless (T7 / T8i / R50 / R10 / 5D / 6D)',
          series: 'Linha EOS DSLR & Mirrorless',
          year: 'Universal',
          protocol: 'RAW',
          description: 'Protocolo Canon RC-6 com disparo instantâneo e timer 2 segundos.',
          commands: [
            { name: 'Disparo Imediato (Shutter Now)', buttonKey: 'cam_shutter', protocol: 'RAW', hexCode: '0xBC8001', bits: 32 },
            { name: 'Disparo com Timer 2 Segundos', buttonKey: 'cam_timer_2s', protocol: 'RAW', hexCode: '0xBC8002', bits: 32 },
            { name: 'Gravar Vídeo Iniciar / Parar', buttonKey: 'cam_video_rec', protocol: 'RAW', hexCode: '0xBC8003', bits: 32 },
            { name: 'Foco Automático (Half Press)', buttonKey: 'cam_focus', protocol: 'RAW', hexCode: '0xBC8004', bits: 32 },
          ],
        },
      ],
    },
    {
      id: 'nikon-camera',
      name: 'Nikon',
      country: 'Japão',
      isPopular: true,
      models: [
        {
          id: 'nikon-d-series',
          name: 'Nikon D-Series & Z-Series (D3500 / D5600 / D7500 / D750 / D850 / Z50)',
          series: 'Linha Nikon ML-L3',
          year: 'Universal',
          protocol: 'RAW',
          description: 'Padrão infravermelho Nikon ML-L3 para disparo remoto sem vibração.',
          commands: [
            { name: 'Disparador Remoto (Shutter)', buttonKey: 'cam_shutter', protocol: 'RAW', hexCode: '0xEE3001', bits: 32 },
            { name: 'Disparo com Temporizador', buttonKey: 'cam_timer_2s', protocol: 'RAW', hexCode: '0xEE3002', bits: 32 },
          ],
        },
      ],
    },
    {
      id: 'sony-camera',
      name: 'Sony Alpha',
      country: 'Japão',
      isPopular: true,
      models: [
        {
          id: 'sony-alpha-series',
          name: 'Sony Alpha (A7 III / A7 IV / A6400 / A6600 / ZV-E10)',
          series: 'Linha Alpha E-Mount',
          year: 'Universal',
          protocol: 'SONY',
          description: 'Protocolo Sony RMT-DSLR2 para fotos, zoom e gravação de vídeo.',
          commands: [
            { name: 'Disparo Obturador (Photo)', buttonKey: 'cam_shutter', protocol: 'SONY', hexCode: '0x2D0', bits: 12 },
            { name: 'Temporizador 2s', buttonKey: 'cam_timer_2s', protocol: 'SONY', hexCode: '0xCD0', bits: 12 },
            { name: 'Iniciar / Parar Gravação Vídeo', buttonKey: 'cam_video_rec', protocol: 'SONY', hexCode: '0x4D0', bits: 12 },
          ],
        },
      ],
    },
    {
      id: 'fujifilm-camera',
      name: 'Fujifilm',
      country: 'Japão',
      isPopular: true,
      models: [
        {
          id: 'fujifilm-x-series',
          name: 'Fujifilm X-Series & GFX (X-T4 / X-T30 II / X-S10 / X-T5)',
          series: 'Linha Mirrorless X-Trans',
          year: 'Universal',
          protocol: 'NEC',
          description: 'Disparador remoto IR para câmeras com simulação de filme Fujifilm.',
          commands: [
            { name: 'Disparo Obturador', buttonKey: 'cam_shutter', protocol: 'NEC', hexCode: '0xF700FF', bits: 32 },
            { name: 'Temporizador 2s', buttonKey: 'cam_timer_2s', protocol: 'NEC', hexCode: '0xF7807F', bits: 32 },
            { name: 'Gravar Vídeo', buttonKey: 'cam_video_rec', protocol: 'NEC', hexCode: '0xF740BF', bits: 32 },
          ],
        },
      ],
    },
    {
      id: 'olympus-camera',
      name: 'Olympus / OM System',
      country: 'Japão',
      isPopular: true,
      models: [
        {
          id: 'olympus-om-d',
          name: 'Olympus OM-D (E-M1 Mark III / E-M5 Mark III / E-M10 IV)',
          series: 'Linha Micro 4/3 OM-D',
          year: 'Universal',
          protocol: 'NEC',
          description: 'Controle remoto infravermelho RM-1 / RM-2 Olympus.',
          commands: [
            { name: 'Disparo Shutter', buttonKey: 'cam_shutter', protocol: 'NEC', hexCode: '0x8800908', bits: 28 },
            { name: 'Timer Shutter', buttonKey: 'cam_timer_2s', protocol: 'NEC', hexCode: '0x880814C', bits: 28 },
          ],
        },
      ],
    },
    {
      id: 'pentax-camera',
      name: 'Pentax / Ricoh',
      country: 'Japão',
      isPopular: false,
      models: [
        {
          id: 'pentax-k-mount',
          name: 'Pentax K-Mount DSLR (K-1 Mark II / K-3 Mark III / K-70)',
          series: 'Linha K DSLR Tropicalizada',
          year: 'Universal',
          protocol: 'RAW',
          description: 'Disparador remoto Pentax O-RC1 / F-Remote.',
          commands: [
            { name: 'Disparador Instantâneo', buttonKey: 'cam_shutter', protocol: 'RAW', hexCode: '0x13FA01', bits: 32 },
            { name: 'Disparador com Timer 3s', buttonKey: 'cam_timer_2s', protocol: 'RAW', hexCode: '0x13FA02', bits: 32 },
          ],
        },
      ],
    },
    {
      id: 'panasonic-camera',
      name: 'Panasonic Lumix',
      country: 'Japão',
      isPopular: true,
      models: [
        {
          id: 'lumix-gh-series',
          name: 'Panasonic Lumix GH & S Series (GH5 / GH6 / S5 / G85)',
          series: 'Linha Cinema Lumix',
          year: 'Universal',
          protocol: 'PANASONIC',
          description: 'Disparador remoto para produção de vídeo e fotografia Lumix.',
          commands: [
            { name: 'Disparo Foto', buttonKey: 'cam_shutter', protocol: 'PANASONIC', hexCode: '0x40040100BCBD', bits: 48 },
            { name: 'Gravar Vídeo Start/Stop', buttonKey: 'cam_video_rec', protocol: 'PANASONIC', hexCode: '0x400401000C0D', bits: 48 },
          ],
        },
      ],
    },
  ],
};
