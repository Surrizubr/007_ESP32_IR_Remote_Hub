export type AppLanguage = 'pt' | 'en' | 'es';

export interface TranslationDictionary {
  common: {
    appName: string;
    connected: string;
    disconnected: string;
    online: string;
    offline: string;
    save: string;
    saving: string;
    saved: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    copy: string;
    copied: string;
    test: string;
    testing: string;
    assign: string;
    assigned: string;
    clear: string;
    reset: string;
    add: string;
    create: string;
    active: string;
    inactive: string;
    disabled: string;
    enabled: string;
    today: string;
    yesterday: string;
    seconds: string;
    minutes: string;
    hours: string;
    success: string;
    error: string;
    warning: string;
    all: string;
    none: string;
    search: string;
    name: string;
    description: string;
    notes: string;
    color: string;
    category: string;
    confirmDelete: string;
    loading: string;
    undo: string;
  };
  nav: {
    home: string;
    copy: string;
    automation: string;
    schedule: string;
    devices: string;
    history: string;
    sync: string;
    homeSub: string;
    copySub: string;
    autoSub: string;
    scheduleSub: string;
    devicesSub: string;
    historySub: string;
    syncSub: string;
  };
  screenTitles: {
    home: string;
    copy: string;
    automation: string;
    schedule: string;
    devices: string;
    history: string;
    sync: string;
  };
  header: {
    themeLightTooltip: string;
    themeDarkTooltip: string;
    quickSyncTooltip: string;
    menuTooltip: string;
  };
  drawer: {
    mainMenu: string;
    suiteTitle: string;
    statusLabel: string;
    settingsModules: string;
    themes: string;
    themesSubtitle: string;
    themeActiveLight: string;
    themeActiveDark: string;
    languages: string;
    languagesSubtitle: string;
    feedback: string;
    feedbackSubtitle: string;
    feedbackStatusActive: string;
    feedbackStatusMute: string;
    espTools: string;
    espToolsSubtitle: string;
    espToolsBadge: string;
    footerSuite: string;
    footerDesc: string;
    themesSectionTitle: string;
    themesSectionSubtitle: string;
    themeLight: string;
    themeDark: string;
    themeLightDesc: string;
    themeDarkDesc: string;
    languagesSectionTitle: string;
    languagesSectionSubtitle: string;
    langPtTitle: string;
    langPtDesc: string;
    langEnTitle: string;
    langEnDesc: string;
    langEsTitle: string;
    langEsDesc: string;
    langFooterNote: string;
    feedbackSectionTitle: string;
    feedbackSectionSubtitle: string;
    soundBeepTitle: string;
    soundBeepDesc: string;
    hapticTitle: string;
    hapticDesc: string;
    testBeepBtn: string;
    toolsSectionTitle: string;
    toolsSectionSubtitle: string;
    hardwareStatusTitle: string;
    uptime: string;
    firmwareBtnTitle: string;
    firmwareBtnDesc: string;
    gpioTitle: string;
    gpioSubtitle: string;
    rxPinLabel: string;
    txPinLabel: string;
    ledPinLabel: string;
    savePinsBtn: string;
    pinsSavedNotice: string;
    backupTitle: string;
    backupSubtitle: string;
    exportBackupBtn: string;
    importBackupBtn: string;
    factoryResetTitle: string;
    factoryResetSubtitle: string;
    factoryResetBtn: string;
    factoryResetConfirm: string;
  };
  remote: {
    selectRemote: string;
    manageRemotes: string;
    addRemote: string;
    noCommandsAssigned: string;
    assignedCount: string;
    holdToAssignHint: string;
    transmitting: string;
    power: string;
    mute: string;
    volUp: string;
    volDown: string;
    chUp: string;
    chDown: string;
    menu: string;
    back: string;
    home: string;
    source: string;
    input: string;
    info: string;
    exit: string;
    guide: string;
    navUp: string;
    navDown: string;
    navLeft: string;
    navRight: string;
    navOk: string;
    play: string;
    pause: string;
    stop: string;
    rewind: string;
    fastForward: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    acTempDisplay: string;
    acPower: string;
    acModeCool: string;
    acModeHeat: string;
    acModeFan: string;
    acModeAuto: string;
    acModeDry: string;
    acFanAuto: string;
    acFanLow: string;
    acFanMed: string;
    acFanHigh: string;
    acSwing: string;
    acTurbo: string;
    acTimer: string;
    soundSourceBT: string;
    soundSourceAUX: string;
    soundSourceFM: string;
    soundSourceUSB: string;
    soundBassUp: string;
    soundBassDown: string;
    soundTrebUp: string;
    soundTrebDown: string;
    soundEqPop: string;
    soundEqRock: string;
    soundEqJazz: string;
    soundEqFlat: string;
    lightBrightUp: string;
    lightBrightDown: string;
    lightWarm: string;
    lightCool: string;
    lightFade: string;
    lightFlash: string;
    projKeystoneUp: string;
    projKeystoneDown: string;
    projFocusNear: string;
    projFocusFar: string;
    projFreeze: string;
    projBlank: string;
    customBtn: string;
    quickMapPrompt: string;
  };
  copy: {
    title: string;
    subtitle: string;
    rxTabTitle: string;
    txTestTabTitle: string;
    receiverStatusWaiting: string;
    receiverStatusActive: string;
    startSniffingBtn: string;
    stopSniffingBtn: string;
    sniffingInstruction: string;
    detectedSignalTitle: string;
    protocol: string;
    hexCode: string;
    bits: string;
    rawTimings: string;
    waveformTitle: string;
    commandNameLabel: string;
    commandNamePlaceholder: string;
    categoryLabel: string;
    colorLabel: string;
    notesLabel: string;
    notesPlaceholder: string;
    saveCommandBtn: string;
    savedCommandsTitle: string;
    noSavedCommands: string;
    searchPlaceholder: string;
    transmitBtn: string;
    assignToRemoteBtn: string;
    deleteCommandConfirm: string;
    quickCategoryTV: string;
    quickCategoryAC: string;
    quickCategorySound: string;
    quickCategoryLights: string;
    quickCategoryCustom: string;
    commandSavedSuccess: string;
    commandDeletedNotice: string;
    commandRestoredNotice: string;
    filterAll: string;
    filterByCategory: string;
    filterByColor: string;
    allCategories: string;
    allColors: string;
    clearFilters: string;
    noFilteredCommands: string;
  };
  automation: {
    title: string;
    subtitle: string;
    createRuleBtn: string;
    ruleNameLabel: string;
    ruleNamePlaceholder: string;
    ruleDescLabel: string;
    ruleDescPlaceholder: string;
    triggerSectionTitle: string;
    triggerIRLabel: string;
    triggerIRDisabled: string;
    disableIROption: string;
    disableIRHelp: string;
    triggerScheduleLabel: string;
    addScheduleTimeBtn: string;
    noTimesAdded: string;
    removeTimeTooltip: string;
    timePrompt: string;
    actionsSectionTitle: string;
    addActionStepBtn: string;
    stepNumber: string;
    commandSelectLabel: string;
    postDelayLabel: string;
    removeStepTooltip: string;
    saveRuleBtn: string;
    cancelBtn: string;
    activeRulesTitle: string;
    noRulesCreated: string;
    ruleEnabled: string;
    ruleDisabled: string;
    executionsCount: string;
    lastExecuted: string;
    deleteRuleConfirm: string;
    validationTriggerRequired: string;
    validationActionRequired: string;
    ruleSavedSuccess: string;
    bothTriggersExplanation: string;
    irOnlyExplanation: string;
    scheduleOnlyExplanation: string;
    ruleTypeSelectLabel: string;
    ruleTypeTrigger: string;
    ruleTypeSchedule: string;
    ruleTypeTriggerSubtitle: string;
    ruleTypeScheduleSubtitle: string;
    ruleTypeExclusiveNotice: string;
    filterAllRules: string;
    filterTriggerRules: string;
    filterScheduleRules: string;
    errorSelectTriggerCmd: string;
    errorAddScheduleTime: string;
    triggerBadge: string;
    scheduleBadge: string;
  };
  schedule: {
    title: string;
    subtitle: string;
    createRuleBtn: string;
    ruleNameLabel: string;
    ruleNamePlaceholder: string;
    explanationNotice: string;
    emptyNotice: string;
    saveRuleBtn: string;
  };
  history: {
    title: string;
    subtitle: string;
    clearHistoryBtn: string;
    clearConfirm: string;
    filterAll: string;
    filterTx: string;
    filterRx: string;
    filterAuto: string;
    filterClone: string;
    searchPlaceholder: string;
    emptyHistoryTitle: string;
    emptyHistorySubtitle: string;
    repeatTxBtn: string;
    deleteEntryTooltip: string;
    todayGroup: string;
    yesterdayGroup: string;
    copyHexTooltip: string;
    detailsLabel: string;
  };
  sync: {
    title: string;
    subtitle: string;
    bleTab: string;
    wifiTab: string;
    bleSectionTitle: string;
    bleSectionDesc: string;
    bleScanBtn: string;
    bleScanning: string;
    bleConnectedTo: string;
    bleDisconnectBtn: string;
    wifiSectionTitle: string;
    wifiSectionDesc: string;
    ssidLabel: string;
    ssidPlaceholder: string;
    passLabel: string;
    passPlaceholder: string;
    showPassword: string;
    hidePassword: string;
    saveWifiBtn: string;
    savingWifi: string;
    scanNetworksBtn: string;
    scanningNetworks: string;
    availableNetworksTitle: string;
    signalStrength: string;
    pingTestTitle: string;
    pingTestDesc: string;
    pingBtn: string;
    pinging: string;
    pingResult: string;
    ipAddressLabel: string;
    macAddressLabel: string;
    firmwareVersionLabel: string;
    rssiLabel: string;
    uptimeLabel: string;
    deviceStatsTitle: string;
    deviceStatusTitle: string;
    connectedOnline: string;
    reconnectBtn: string;
    signalMetricLabel: string;
    signalStrengthGood: string;
    signalStrengthFair: string;
    signalStrengthPoor: string;
    connectionTypeLabel: string;
    pingLatencyLabel: string;
    bleSectionSubtitle: string;
    bleDesc: string;
    scanningBle: string;
    scanBleBtn: string;
    wifiSectionSubtitle: string;
    scanWifiBtn: string;
    detectedNetworks: string;
    wifiSsidLabel: string;
    wifiSsidPlaceholder: string;
    wifiPassLabel: string;
    wifiPassPlaceholder: string;
    sendWifiBtn: string;
    irTestTitle: string;
    irTestSubtitle: string;
    irTxTestBtn: string;
    irRxTestBtn: string;
    openInNewTabNotice: string;
    openInNewTabBtn: string;
  };
  firmware: {
    title: string;
    subtitle: string;
    downloadBtn: string;
    copyBtn: string;
    copiedBtn: string;
    closeBtn: string;
    instructionsTitle: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    libraryNote: string;
  };
  modals: {
    addRemoteTitle: string;
    addRemoteSubtitle: string;
    remoteNameLabel: string;
    remoteNamePlaceholder: string;
    layoutTypeLabel: string;
    createRemoteBtn: string;
    manageRemotesTitle: string;
    manageRemotesSubtitle: string;
    deleteRemoteConfirm: string;
    defaultBadge: string;
    assignModalTitle: string;
    assignModalSubtitle: string;
    selectedCommandsCount: string;
    chooseCommandsLabel: string;
    noCommandsAvailable: string;
    goToCopyBtn: string;
    confirmAssignBtn: string;
    clearAssignBtn: string;
  };
}

export const translations: Record<AppLanguage, TranslationDictionary> = {
  pt: {
    common: {
      appName: 'ESP32 IR Remote',
      connected: 'Conectado',
      disconnected: 'Desconectado',
      online: 'ONLINE',
      offline: 'OFFLINE',
      save: 'Salvar',
      saving: 'Salvando...',
      saved: 'Salvo!',
      cancel: 'Cancelar',
      delete: 'Excluir',
      edit: 'Editar',
      close: 'Fechar',
      back: 'Voltar',
      copy: 'Copiar',
      copied: 'Copiado!',
      test: 'Testar',
      testing: 'Testando...',
      assign: 'Atribuir',
      assigned: 'Atribuído',
      clear: 'Limpar',
      reset: 'Restaurar',
      add: 'Adicionar',
      create: 'Criar',
      active: 'Ativo',
      inactive: 'Inativo',
      disabled: 'Desabilitado',
      enabled: 'Habilitado',
      today: 'Hoje',
      yesterday: 'Ontem',
      seconds: 's',
      minutes: 'm',
      hours: 'h',
      success: 'Sucesso',
      error: 'Erro',
      warning: 'Aviso',
      all: 'Todos',
      none: 'Nenhum',
      search: 'Buscar...',
      name: 'Nome',
      description: 'Descrição',
      notes: 'Observações',
      color: 'Cor',
      category: 'Categoria',
      confirmDelete: 'Deseja realmente excluir este item?',
      loading: 'Carregando...',
      undo: 'Desfazer',
    },
    nav: {
      home: 'Controle',
      copy: 'Copiar IR',
      automation: 'Automação',
      schedule: 'Agendamento',
      devices: 'Aparelhos',
      history: 'Histórico',
      sync: 'Sync',
      homeSub: 'Home',
      copySub: 'Copy',
      autoSub: 'Auto',
      scheduleSub: 'Agenda',
      devicesSub: 'Modelos',
      historySub: 'Log',
      syncSub: 'ESP32',
    },
    screenTitles: {
      home: 'Controle Remoto',
      copy: 'Copiar / Aprender IR',
      automation: 'Automação Infravermelho',
      schedule: 'Agendamento de Horários',
      devices: 'Biblioteca de Aparelhos IR',
      history: 'Histórico de Atividades',
      sync: 'Sincronização & Wi-Fi',
    },
    header: {
      themeLightTooltip: 'Mudar para tema escuro',
      themeDarkTooltip: 'Mudar para tema claro azul',
      quickSyncTooltip: 'Clique para abrir sincronização',
      menuTooltip: 'Menu Principal',
    },
    drawer: {
      mainMenu: 'Menu Principal',
      suiteTitle: 'ESP32 IR Controller Suite',
      statusLabel: 'ESP32',
      settingsModules: 'Configurações & Módulos',
      themes: 'Temas',
      themesSubtitle: 'Tema Claro / Escuro',
      themeActiveLight: 'Claro',
      themeActiveDark: 'Escuro',
      languages: 'Idiomas',
      languagesSubtitle: 'Português, Inglês e Espanhol',
      feedback: 'Avisos Sonoros & Feedback',
      feedbackSubtitle: 'Sons de bip e vibrações hápticas',
      feedbackStatusActive: 'Ativo',
      feedbackStatusMute: 'Mudo',
      espTools: 'Ferramentas do ESP32',
      espToolsSubtitle: 'Pinos GPIO, Firmware C++, Backup e Reset',
      espToolsBadge: 'GPIO & Config',
      footerSuite: 'ESP32 IR Controller Suite v2.5',
      footerDesc: 'Emissor & Receptor Infravermelho 38kHz. Controle total via Web BLE & Wi-Fi.',
      themesSectionTitle: 'Temas',
      themesSectionSubtitle: 'Aparência e esquema visual',
      themeLight: 'Tema Claro',
      themeDark: 'Tema Escuro',
      themeLightDesc: 'O Tema Claro foi projetado com tons azul suave e alta legibilidade para uso diurno.',
      themeDarkDesc: 'O Tema Escuro proporciona conforto visual e economia de bateria.',
      languagesSectionTitle: 'Idiomas',
      languagesSectionSubtitle: 'Selecione o idioma de preferência',
      langPtTitle: 'Português',
      langPtDesc: 'Brasil (Padrão)',
      langEnTitle: 'Inglês',
      langEnDesc: 'English (United States)',
      langEsTitle: 'Espanhol',
      langEsDesc: 'Español (España / LATAM)',
      langFooterNote: 'O idioma selecionado é aplicado instantaneamente em todas as telas e gravado localmente.',
      feedbackSectionTitle: 'Avisos Sonoros & Feedback',
      feedbackSectionSubtitle: 'Personalize áudio e vibração tátil',
      soundBeepTitle: 'Sons de Bip',
      soundBeepDesc: 'Áudio ao pressionar botões IR',
      hapticTitle: 'Vibração Tátil (Haptic)',
      hapticDesc: 'Resposta háptica no celular/tablet',
      testBeepBtn: 'Testar Som de Disparo',
      toolsSectionTitle: 'Ferramentas do ESP32',
      toolsSectionSubtitle: 'Configurações, Pinos GPIO & Firmware',
      hardwareStatusTitle: 'Status do ESP32',
      uptime: 'Tempo Ativo',
      firmwareBtnTitle: 'Gerador de Firmware Arduino C++',
      firmwareBtnDesc: 'Código .ino pronto para compilar no ESP32',
      gpioTitle: 'Mapeamento de Pinos GPIO',
      gpioSubtitle: 'Ajuste os pinos conforme a pinagem da sua placa',
      rxPinLabel: 'Pino Receptor IR (RX):',
      txPinLabel: 'Pino Emissor IR (TX):',
      ledPinLabel: 'LED de Status:',
      savePinsBtn: 'Salvar Pinos no ESP32',
      pinsSavedNotice: 'Configurações de Pinos Salvas no ESP32!',
      backupTitle: 'Backup & Restauração',
      backupSubtitle: 'Exporte ou importe seus controles e regras em arquivo JSON',
      exportBackupBtn: 'Exportar Backup JSON',
      importBackupBtn: 'Importar Backup JSON',
      factoryResetTitle: 'Redefinição de Fábrica',
      factoryResetSubtitle: 'Restaura todos os controles, regras e mapeamentos originais',
      factoryResetBtn: 'Restaurar Todos os Padrões',
      factoryResetConfirm: 'Tem certeza que deseja restaurar as configurações originais? Todos os controles e automações personalizados serão resetados.',
    },
    remote: {
      selectRemote: 'Selecionar Controle:',
      manageRemotes: 'Gerenciar Controles',
      addRemote: 'Adicionar Controle',
      noCommandsAssigned: 'Nenhum comando atribuído',
      assignedCount: '{count} comando(s) IR configurado(s)',
      holdToAssignHint: 'Pressione e segure qualquer tecla para configurar o comando IR associado.',
      transmitting: 'Transmitindo...',
      power: 'Power',
      mute: 'Mudo',
      volUp: 'Vol +',
      volDown: 'Vol -',
      chUp: 'CH +',
      chDown: 'CH -',
      menu: 'Menu',
      back: 'Voltar',
      home: 'Início',
      source: 'Source',
      input: 'Input',
      info: 'Info',
      exit: 'Sair',
      guide: 'Guia',
      navUp: 'Cima',
      navDown: 'Baixo',
      navLeft: 'Esquerda',
      navRight: 'Direita',
      navOk: 'OK',
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
      rewind: 'Retroceder',
      fastForward: 'Avançar',
      red: 'Vermelho',
      green: 'Verde',
      yellow: 'Amarelo',
      blue: 'Azul',
      acTempDisplay: 'Temperatura',
      acPower: 'Ligar/Desligar',
      acModeCool: 'Frio (Cool)',
      acModeHeat: 'Quente (Heat)',
      acModeFan: 'Ventilação',
      acModeAuto: 'Automático',
      acModeDry: 'Desumidificar',
      acFanAuto: 'Fan Auto',
      acFanLow: 'Fan Baixo',
      acFanMed: 'Fan Médio',
      acFanHigh: 'Fan Alto',
      acSwing: 'Oscilar (Swing)',
      acTurbo: 'Turbo / Max',
      acTimer: 'Timer (1h/2h)',
      soundSourceBT: 'Bluetooth',
      soundSourceAUX: 'Auxiliar',
      soundSourceFM: 'Rádio FM',
      soundSourceUSB: 'USB / CD',
      soundBassUp: 'Grave +',
      soundBassDown: 'Grave -',
      soundTrebUp: 'Agudo +',
      soundTrebDown: 'Agudo -',
      soundEqPop: 'EQ Pop',
      soundEqRock: 'EQ Rock',
      soundEqJazz: 'EQ Jazz',
      soundEqFlat: 'EQ Flat',
      lightBrightUp: 'Brilho +',
      lightBrightDown: 'Brilho -',
      lightWarm: 'Branco Quente (2700K)',
      lightCool: 'Branco Frio (6500K)',
      lightFade: 'Fade Suave',
      lightFlash: 'Flash Estroboscópico',
      projKeystoneUp: 'Keystone +',
      projKeystoneDown: 'Keystone -',
      projFocusNear: 'Foco Perto',
      projFocusFar: 'Foco Longe',
      projFreeze: 'Congelar Imagem',
      projBlank: 'Tela Preta (Blank)',
      customBtn: 'Tecla Personalizada',
      quickMapPrompt: 'Selecione a tecla para mapear este comando:',
    },
    copy: {
      title: 'Copiar / Aprender IR',
      subtitle: 'Capture sinais de qualquer controle remoto ou teste transmissões',
      rxTabTitle: 'Recepção (Aprender IR)',
      txTestTabTitle: 'Transmissão & Testes',
      receiverStatusWaiting: 'Aguardando Sinal IR...',
      receiverStatusActive: 'Receptor IR Ativado',
      startSniffingBtn: 'Iniciar Recepção de Sinal',
      stopSniffingBtn: 'Parar Receptor',
      sniffingInstruction: 'Aponte o controle remoto físico para o pino receptor do ESP32 e pressione uma tecla.',
      detectedSignalTitle: 'Sinal IR Interceptado com Sucesso!',
      protocol: 'Protocolo',
      hexCode: 'Código Hexadecimal',
      bits: 'Tamanho (Bits)',
      rawTimings: 'Pulsos Brutos (Raw Timings)',
      waveformTitle: 'Gráfico de Pulsos & Forma de Onda',
      commandNameLabel: 'Nome do Comando:',
      commandNamePlaceholder: 'Ex: TV Samsung - Ligar/Desligar',
      categoryLabel: 'Categoria do Aparelho:',
      colorLabel: 'Cor de Identificação:',
      notesLabel: 'Observações (Opcional):',
      notesPlaceholder: 'Ex: Tecla Power do controle original da sala',
      saveCommandBtn: 'Salvar Comando na Memória',
      savedCommandsTitle: 'Biblioteca de Comandos IR Salvos',
      noSavedCommands: 'Nenhum comando IR aprendido ainda. Clique em "Iniciar Recepção" acima para clonar o primeiro sinal!',
      searchPlaceholder: 'Buscar por nome, código hex ou protocolo...',
      transmitBtn: 'Transmitir via ESP32',
      assignToRemoteBtn: 'Atribuir a um Controle',
      deleteCommandConfirm: 'Deseja realmente excluir este comando da biblioteca?',
      quickCategoryTV: 'TV / Vídeo',
      quickCategoryAC: 'Ar Condicionado',
      quickCategorySound: 'Som / Áudio',
      quickCategoryLights: 'Iluminação',
      quickCategoryCustom: 'Personalizado',
      commandSavedSuccess: 'Comando IR salvo com sucesso na biblioteca!',
      commandDeletedNotice: 'Comando "{name}" excluído',
      commandRestoredNotice: 'Comando "{name}" restaurado com sucesso',
      filterAll: 'Todos',
      filterByCategory: 'Categoria',
      filterByColor: 'Cor',
      allCategories: 'Todas as Categorias',
      allColors: 'Todas as Cores',
      clearFilters: 'Limpar Filtros',
      noFilteredCommands: 'Nenhum comando encontrado com os filtros selecionados.',
    },
    automation: {
      title: 'Automação Infravermelho',
      subtitle: 'Crie rotinas automáticas ativadas por sinais IR recebidos ou por agendamento de horários.',
      createRuleBtn: 'Criar Nova Regra',
      ruleNameLabel: 'Nome da Regra:',
      ruleNamePlaceholder: 'Ex: Cinema em Casa (Ligar TV + Som)',
      ruleDescLabel: 'Descrição (Opcional):',
      ruleDescPlaceholder: 'Ex: Rotina ativada automaticamente às 19:30',
      triggerSectionTitle: '1. Gatilho de Ativação (Quando executar?)',
      triggerIRLabel: 'Gatilho por Sinal IR Recebido:',
      triggerIRDisabled: '[DESABILITADO] Gatilho IR Desabilitado (Apenas Horário)',
      disableIROption: 'DESABILITAR: Nenhum comando IR (apenas Horário)',
      disableIRHelp: 'Ao desabilitar o gatilho IR, a automação será ativada exclusivamente nos horários agendados abaixo.',
      triggerScheduleLabel: 'Gatilho por Horário Agendado (Relógio ESP32):',
      addScheduleTimeBtn: 'Adicionar Horário',
      noTimesAdded: 'Nenhum horário programado. Clique em "+ Adicionar Horário" se desejar disparo por horário.',
      removeTimeTooltip: 'Remover horário',
      timePrompt: 'Digite o horário no formato HH:MM (ex: 08:30 ou 19:45):',
      actionsSectionTitle: '2. Sequência de Ações IR (O que transmitir?)',
      addActionStepBtn: 'Adicionar Passo de Ação',
      stepNumber: 'Passo',
      commandSelectLabel: 'Comando IR a Transmitir:',
      postDelayLabel: 'Espera pós-disparo:',
      removeStepTooltip: 'Remover este passo',
      saveRuleBtn: 'Salvar Regra no ESP32',
      cancelBtn: 'Cancelar',
      activeRulesTitle: 'Regras de Automação Ativas',
      noRulesCreated: 'Nenhuma regra criada. Crie rotinas para acionar sequências de aparelhos automaticamente!',
      ruleEnabled: 'Regra Ativa',
      ruleDisabled: 'Regra Pausada',
      executionsCount: '{count} execuções',
      lastExecuted: 'Última execução: {time}',
      deleteRuleConfirm: 'Deseja excluir permanentemente esta regra de automação?',
      validationTriggerRequired: 'Defina ao menos um gatilho: selecione um comando IR ou adicione um horário programado.',
      validationActionRequired: 'Adicione pelo menos um comando IR de ação para o ESP32 transmitir.',
      ruleSavedSuccess: 'Regra "{name}" salva com sucesso no ESP32!',
      bothTriggersExplanation: '⚡ Esta regra será ativada se o comando IR for recebido OU se qualquer um dos horários programados chegar.',
      irOnlyExplanation: '⚡ Ativação imediata quando o comando IR for detectado pelo receptor do ESP32.',
      scheduleOnlyExplanation: '⏰ Ativação automática nos horários programados (Gatilho IR desabilitado).',
      ruleTypeSelectLabel: 'Tipo de Automação (Selecione um):',
      ruleTypeTrigger: 'Gatilho IR (Sinal)',
      ruleTypeSchedule: 'Agendamento (Horário)',
      ruleTypeTriggerSubtitle: 'Disparada quando o receptor do ESP32 detecta um sinal infravermelho de controle.',
      ruleTypeScheduleSubtitle: 'Disparada automaticamente pelo relógio interno do ESP32 nos horários definidos.',
      ruleTypeExclusiveNotice: 'Cada regra opera exclusivamente por Gatilho IR ou por Horário Agendado, nunca ambos.',
      filterAllRules: 'Todas as Regras',
      filterTriggerRules: 'Gatilhos IR',
      filterScheduleRules: 'Horários Agendados',
      errorSelectTriggerCmd: 'Selecione o comando IR de gatilho que ativará esta regra.',
      errorAddScheduleTime: 'Adicione pelo menos um horário programado para o agendamento.',
      triggerBadge: 'Gatilho IR',
      scheduleBadge: 'Agendamento',
    },
    schedule: {
      title: 'Agendamento de Horários',
      subtitle: 'Programações automáticas disparadas em horários específicos pelo ESP32.',
      createRuleBtn: 'Nova Regra',
      ruleNameLabel: 'Nome do Agendamento:',
      ruleNamePlaceholder: 'Ex: Desligar Tudo às 23:30',
      explanationNotice: 'Configure agendamentos diários. Nos horários definidos, o ESP32 transmitirá as ações infravermelhas em sequência com os atrasos especificados.',
      emptyNotice: 'Nenhum agendamento de horário cadastrado ainda.',
      saveRuleBtn: 'Salvar Agendamento',
    },
    history: {
      title: 'Histórico de Atividades',
      subtitle: 'Registro de sinais transmitidos, recebidos e rotinas executadas',
      clearHistoryBtn: 'Limpar Histórico',
      clearConfirm: 'Deseja realmente limpar todo o histórico de atividades?',
      filterAll: 'Todos',
      filterTx: 'Transmissões',
      filterRx: 'Recepções',
      filterAuto: 'Automações',
      filterClone: 'Clonagens',
      searchPlaceholder: 'Filtrar registros por nome, código hex ou protocolo...',
      emptyHistoryTitle: 'Nenhuma atividade registrada',
      emptyHistorySubtitle: 'Transmissões, recepções de sinais e execuções de automações aparecerão aqui.',
      repeatTxBtn: 'Repetir Disparo',
      deleteEntryTooltip: 'Excluir registro',
      todayGroup: 'Hoje',
      yesterdayGroup: 'Ontem',
      copyHexTooltip: 'Copiar código hex',
      detailsLabel: 'Detalhes:',
    },
    sync: {
      title: 'Sincronização & Wi-Fi',
      subtitle: 'Conecte o ESP32 via Bluetooth Low Energy (BLE) ou configure a rede Wi-Fi.',
      bleTab: 'Conexão BLE (Bluetooth)',
      wifiTab: 'Configuração Wi-Fi',
      bleSectionTitle: 'Pareamento Bluetooth Low Energy',
      bleSectionDesc: 'Conecte seu navegador diretamente ao ESP32 via Web Bluetooth sem precisar de servidores.',
      bleScanBtn: 'Buscar & Conectar ESP32 (BLE)',
      bleScanning: 'Buscando dispositivos ESP32 por proximidade...',
      bleConnectedTo: 'Conectado a:',
      bleDisconnectBtn: 'Desconectar BLE',
      wifiSectionTitle: 'Configuração de Rede Wi-Fi',
      wifiSectionDesc: 'Envie as credenciais da sua rede para o ESP32 operar de forma autônoma na rede local.',
      ssidLabel: 'Nome da Rede Wi-Fi (SSID):',
      ssidPlaceholder: 'Ex: MinhaRede_5G',
      passLabel: 'Senha da Rede Wi-Fi:',
      passPlaceholder: 'Digite a senha do Wi-Fi...',
      showPassword: 'Ver senha',
      hidePassword: 'Ocultar senha',
      saveWifiBtn: 'Gravar Wi-Fi no ESP32',
      savingWifi: 'Enviando credenciais ao ESP32...',
      scanNetworksBtn: 'Buscar Redes Próximas',
      scanningNetworks: 'Escaneando redes Wi-Fi...',
      availableNetworksTitle: 'Redes Wi-Fi Encontradas',
      signalStrength: 'Sinal:',
      pingTestTitle: 'Diagnóstico de Latência (Ping)',
      pingTestDesc: 'Meça o tempo de resposta e qualidade da comunicação com o módulo ESP32.',
      pingBtn: 'Testar Latência (Ping)',
      pinging: 'Medindo latência...',
      pingResult: 'Tempo de resposta: {ms}ms (Excelente)',
      ipAddressLabel: 'Endereço IP:',
      macAddressLabel: 'Endereço MAC:',
      firmwareVersionLabel: 'Versão do Firmware:',
      rssiLabel: 'Intensidade de Sinal (RSSI):',
      uptimeLabel: 'Tempo de Funcionamento:',
      deviceStatsTitle: 'Métricas de Hardware em Tempo Real',
      deviceStatusTitle: 'Status Geral do ESP32',
      connectedOnline: 'ONLINE',
      reconnectBtn: 'Reconectar',
      signalMetricLabel: 'Sinal Wi-Fi',
      signalStrengthGood: 'Excelente',
      signalStrengthFair: 'Bom',
      signalStrengthPoor: 'Fraco',
      connectionTypeLabel: 'Conexão Ativa',
      pingLatencyLabel: 'Latência (Ping)',
      bleSectionSubtitle: 'Pareamento direto via navegador com Web Bluetooth',
      bleDesc: 'Conecte seu computador ou celular diretamente ao ESP32 via Bluetooth sem depender de roteador.',
      scanningBle: 'Buscando ESP32 por proximidade BLE...',
      scanBleBtn: 'Buscar & Parear ESP32 (BLE)',
      wifiSectionSubtitle: 'Escaneamento e conexão à rede Wi-Fi local',
      scanWifiBtn: 'Escanear Redes',
      detectedNetworks: 'Redes Wi-Fi Detectadas',
      wifiSsidLabel: 'Nome da Rede (SSID):',
      wifiSsidPlaceholder: 'Ex: MinhaRede_5G',
      wifiPassLabel: 'Senha do Wi-Fi:',
      wifiPassPlaceholder: 'Digite a senha...',
      sendWifiBtn: 'Enviar Credenciais & Conectar',
      irTestTitle: 'Teste de Hardware Infravermelho (IR)',
      irTestSubtitle: 'Teste o emissor LED e o receptor TSOP do ESP32 em tempo real',
      irTxTestBtn: 'Testar Disparo Emissor (LED)',
      irRxTestBtn: 'Testar Receptor (Sniffer)',
      openInNewTabNotice: 'Para usar o Web Bluetooth no navegador, abra o app em uma nova aba.',
      openInNewTabBtn: 'Abrir em Nova Aba',
    },
    firmware: {
      title: 'Código-Fonte C++ para ESP32 (Arduino IDE)',
      subtitle: 'Gere e compile o firmware completo com suporte a emissor IR, receptor e BLE/Wi-Fi.',
      downloadBtn: 'Baixar Arquivo .ino',
      copyBtn: 'Copiar Código C++',
      copiedBtn: 'Copiado para a Área de Transferência!',
      closeBtn: 'Fechar',
      instructionsTitle: 'Instruções de Instalação no Arduino IDE:',
      step1: '1. Abra o Arduino IDE e instale as bibliotecas "IRremoteESP8266" e "ArduinoJson".',
      step2: '2. Conecte sua placa ESP32 na porta USB do computador.',
      step3: '3. Selecione a placa "ESP32 Dev Module" e a porta serial COM correta.',
      step4: '4. Cole o código gerado e clique em "Upload" (Carregar).',
      libraryNote: 'O código utiliza modulação de hardware de 38kHz nos pinos GPIO configurados na aba de ferramentas.',
    },
    modals: {
      addRemoteTitle: 'Adicionar Novo Controle Remoto',
      addRemoteSubtitle: 'Escolha o tipo de dispositivo e defina um nome para o controle',
      remoteNameLabel: 'Nome do Controle Remoto:',
      remoteNamePlaceholder: 'Ex: Smart TV da Sala, Ar Condicionado Quarto',
      layoutTypeLabel: 'Layout & Categoria do Dispositivo:',
      createRemoteBtn: 'Criar e Adicionar Controle',
      manageRemotesTitle: 'Gerenciar Controles Remotos',
      manageRemotesSubtitle: 'Adicione, renomeie ou remova controles virtuais cadastrados',
      deleteRemoteConfirm: 'Deseja realmente remover este controle remoto?',
      defaultBadge: 'Padrão do Sistema',
      assignModalTitle: 'Atribuir Comando IR à Tecla',
      assignModalSubtitle: 'Selecione um ou mais comandos IR para serem disparados por esta tecla',
      selectedCommandsCount: '{count} comando(s) selecionado(s)',
      chooseCommandsLabel: 'Comandos IR Disponíveis na Biblioteca:',
      noCommandsAvailable: 'Nenhum comando IR salvo na biblioteca.',
      goToCopyBtn: 'Ir para tela de Captura IR',
      confirmAssignBtn: 'Salvar Mapeamento da Tecla',
      clearAssignBtn: 'Desvincular Tecla (Limpar)',
    },
  },

  en: {
    common: {
      appName: 'ESP32 IR Remote',
      connected: 'Connected',
      disconnected: 'Disconnected',
      online: 'ONLINE',
      offline: 'OFFLINE',
      save: 'Save',
      saving: 'Saving...',
      saved: 'Saved!',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      copy: 'Copy',
      copied: 'Copied!',
      test: 'Test',
      testing: 'Testing...',
      assign: 'Assign',
      assigned: 'Assigned',
      clear: 'Clear',
      reset: 'Reset',
      add: 'Add',
      create: 'Create',
      active: 'Active',
      inactive: 'Inactive',
      disabled: 'Disabled',
      enabled: 'Enabled',
      today: 'Today',
      yesterday: 'Yesterday',
      seconds: 's',
      minutes: 'm',
      hours: 'h',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      all: 'All',
      none: 'None',
      search: 'Search...',
      name: 'Name',
      description: 'Description',
      notes: 'Notes',
      color: 'Color',
      category: 'Category',
      confirmDelete: 'Are you sure you want to delete this item?',
      loading: 'Loading...',
      undo: 'Undo',
    },
    nav: {
      home: 'Remote',
      copy: 'Copy IR',
      automation: 'Automation',
      schedule: 'Schedule',
      devices: 'Devices',
      history: 'History',
      sync: 'Sync',
      homeSub: 'Home',
      copySub: 'Copy',
      autoSub: 'Auto',
      scheduleSub: 'Time',
      devicesSub: 'Brands',
      historySub: 'Log',
      syncSub: 'ESP32',
    },
    screenTitles: {
      home: 'Remote Control',
      copy: 'Copy / Learn IR',
      automation: 'Infrared Automation',
      schedule: 'Scheduled Automations',
      devices: 'IR Devices Library',
      history: 'Activity History',
      sync: 'Sync & Wi-Fi',
    },
    header: {
      themeLightTooltip: 'Switch to dark theme',
      themeDarkTooltip: 'Switch to soft blue light theme',
      quickSyncTooltip: 'Click to open device sync',
      menuTooltip: 'Main Menu',
    },
    drawer: {
      mainMenu: 'Main Menu',
      suiteTitle: 'ESP32 IR Controller Suite',
      statusLabel: 'ESP32',
      settingsModules: 'Settings & Modules',
      themes: 'Themes',
      themesSubtitle: 'Light / Dark Theme',
      themeActiveLight: 'Light',
      themeActiveDark: 'Dark',
      languages: 'Languages',
      languagesSubtitle: 'Portuguese, English & Spanish',
      feedback: 'Sound & Haptic Feedback',
      feedbackSubtitle: 'Beep sounds and vibration responses',
      feedbackStatusActive: 'Active',
      feedbackStatusMute: 'Muted',
      espTools: 'ESP32 Tools',
      espToolsSubtitle: 'GPIO Pins, C++ Firmware, Backup & Reset',
      espToolsBadge: 'GPIO & Config',
      footerSuite: 'ESP32 IR Controller Suite v2.5',
      footerDesc: '38kHz Infrared Transmitter & Receiver. Full control via Web BLE & Wi-Fi.',
      themesSectionTitle: 'Themes',
      themesSectionSubtitle: 'Visual theme and color scheme',
      themeLight: 'Light Theme',
      themeDark: 'Dark Theme',
      themeLightDesc: 'The Light Theme is crafted with soft blue tones and high contrast for daytime usability.',
      themeDarkDesc: 'The Dark Theme provides ocular comfort and maximizes battery efficiency.',
      languagesSectionTitle: 'Languages',
      languagesSectionSubtitle: 'Select your preferred application language',
      langPtTitle: 'Portuguese',
      langPtDesc: 'Português (Brasil)',
      langEnTitle: 'English',
      langEnDesc: 'English (United States)',
      langEsTitle: 'Spanish',
      langEsDesc: 'Español (Spain / LATAM)',
      langFooterNote: 'The selected language updates instantly across all views and is persisted in local storage.',
      feedbackSectionTitle: 'Sound & Haptic Feedback',
      feedbackSectionSubtitle: 'Customize audio feedback and vibration tactile cues',
      soundBeepTitle: 'Beep Audio Feedback',
      soundBeepDesc: 'Audio tone when pressing IR remote buttons',
      hapticTitle: 'Haptic Vibration',
      hapticDesc: 'Haptic physical feedback on smartphones and tablets',
      testBeepBtn: 'Test Trigger Beep',
      toolsSectionTitle: 'ESP32 Tools',
      toolsSectionSubtitle: 'Hardware settings, GPIO pins & C++ Firmware',
      hardwareStatusTitle: 'ESP32 Hardware Status',
      uptime: 'Uptime',
      firmwareBtnTitle: 'Arduino C++ Firmware Generator',
      firmwareBtnDesc: 'Complete ready-to-flash .ino source code for ESP32',
      gpioTitle: 'GPIO Pin Assignments',
      gpioSubtitle: 'Match the pin configuration to your physical board header',
      rxPinLabel: 'IR Receiver Pin (RX):',
      txPinLabel: 'IR Transmitter Pin (TX):',
      ledPinLabel: 'Status LED Pin:',
      savePinsBtn: 'Save Pins to ESP32',
      pinsSavedNotice: 'GPIO Pin Settings Saved on ESP32!',
      backupTitle: 'Backup & Restore',
      backupSubtitle: 'Export or import remotes, commands, and rules in JSON format',
      exportBackupBtn: 'Export JSON Backup',
      importBackupBtn: 'Import JSON Backup',
      factoryResetTitle: 'Factory Reset',
      factoryResetSubtitle: 'Revert all remotes, rules, and mappings to system defaults',
      factoryResetBtn: 'Restore All Defaults',
      factoryResetConfirm: 'Are you sure you want to reset everything to defaults? Custom remotes and automations will be removed.',
    },
    remote: {
      selectRemote: 'Select Remote:',
      manageRemotes: 'Manage Remotes',
      addRemote: 'Add Remote',
      noCommandsAssigned: 'No command mapped',
      assignedCount: '{count} IR command(s) configured',
      holdToAssignHint: 'Press and hold any key to map or configure its associated IR command.',
      transmitting: 'Transmitting...',
      power: 'Power',
      mute: 'Mute',
      volUp: 'Vol +',
      volDown: 'Vol -',
      chUp: 'CH +',
      chDown: 'CH -',
      menu: 'Menu',
      back: 'Back',
      home: 'Home',
      source: 'Source',
      input: 'Input',
      info: 'Info',
      exit: 'Exit',
      guide: 'Guide',
      navUp: 'Up',
      navDown: 'Down',
      navLeft: 'Left',
      navRight: 'Right',
      navOk: 'OK',
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
      rewind: 'Rewind',
      fastForward: 'Fast Forward',
      red: 'Red',
      green: 'Green',
      yellow: 'Yellow',
      blue: 'Blue',
      acTempDisplay: 'Temperature',
      acPower: 'Power On/Off',
      acModeCool: 'Cool',
      acModeHeat: 'Heat',
      acModeFan: 'Fan',
      acModeAuto: 'Auto',
      acModeDry: 'Dry',
      acFanAuto: 'Fan Auto',
      acFanLow: 'Fan Low',
      acFanMed: 'Fan Med',
      acFanHigh: 'Fan High',
      acSwing: 'Swing',
      acTurbo: 'Turbo / Max',
      acTimer: 'Timer (1h/2h)',
      soundSourceBT: 'Bluetooth',
      soundSourceAUX: 'Auxiliary',
      soundSourceFM: 'FM Radio',
      soundSourceUSB: 'USB / CD',
      soundBassUp: 'Bass +',
      soundBassDown: 'Bass -',
      soundTrebUp: 'Treble +',
      soundTrebDown: 'Treble -',
      soundEqPop: 'EQ Pop',
      soundEqRock: 'EQ Rock',
      soundEqJazz: 'EQ Jazz',
      soundEqFlat: 'EQ Flat',
      lightBrightUp: 'Brightness +',
      lightBrightDown: 'Brightness -',
      lightWarm: 'Warm White (2700K)',
      lightCool: 'Cool White (6500K)',
      lightFade: 'Smooth Fade',
      lightFlash: 'Strobe Flash',
      projKeystoneUp: 'Keystone +',
      projKeystoneDown: 'Keystone -',
      projFocusNear: 'Focus Near',
      projFocusFar: 'Focus Far',
      projFreeze: 'Freeze Frame',
      projBlank: 'Blank Screen',
      customBtn: 'Custom Key',
      quickMapPrompt: 'Select the key to map this command:',
    },
    copy: {
      title: 'Copy / Learn IR',
      subtitle: 'Capture signals from any physical remote or test transmitter signals',
      rxTabTitle: 'Receiver (Learn IR)',
      txTestTabTitle: 'Transmitter & Testing',
      receiverStatusWaiting: 'Waiting for IR Signal...',
      receiverStatusActive: 'IR Receiver Active',
      startSniffingBtn: 'Start Signal Capture',
      stopSniffingBtn: 'Stop Receiver',
      sniffingInstruction: 'Point your physical remote at the ESP32 receiver pin and press the target button.',
      detectedSignalTitle: 'IR Signal Intercepted Successfully!',
      protocol: 'Protocol',
      hexCode: 'Hexadecimal Code',
      bits: 'Bit Length',
      rawTimings: 'Raw Timings (Pulses)',
      waveformTitle: 'Pulse Timing & Waveform Graph',
      commandNameLabel: 'Command Name:',
      commandNamePlaceholder: 'E.g.: Samsung TV - Power Toggle',
      categoryLabel: 'Device Category:',
      colorLabel: 'Identification Color:',
      notesLabel: 'Notes (Optional):',
      notesPlaceholder: 'E.g.: Power button from living room remote',
      saveCommandBtn: 'Save Command to Library',
      savedCommandsTitle: 'Saved IR Commands Library',
      noSavedCommands: 'No IR commands learned yet. Click "Start Signal Capture" above to clone your first remote signal!',
      searchPlaceholder: 'Search by name, hex code or protocol...',
      transmitBtn: 'Transmit via ESP32',
      assignToRemoteBtn: 'Assign to a Remote',
      deleteCommandConfirm: 'Are you sure you want to delete this command from the library?',
      quickCategoryTV: 'TV / Video',
      quickCategoryAC: 'Air Conditioner',
      quickCategorySound: 'Audio / Sound',
      quickCategoryLights: 'Lighting',
      quickCategoryCustom: 'Custom',
      commandSavedSuccess: 'IR command saved to library successfully!',
      commandDeletedNotice: 'Command "{name}" deleted',
      commandRestoredNotice: 'Command "{name}" restored successfully',
      filterAll: 'All',
      filterByCategory: 'Category',
      filterByColor: 'Color',
      allCategories: 'All Categories',
      allColors: 'All Colors',
      clearFilters: 'Clear Filters',
      noFilteredCommands: 'No commands found with the selected filters.',
    },
    automation: {
      title: 'Infrared Automation',
      subtitle: 'Build automated routines triggered by received IR signals or scheduled clock times.',
      createRuleBtn: 'Create New Rule',
      ruleNameLabel: 'Rule Name:',
      ruleNamePlaceholder: 'E.g.: Home Cinema (Turn on TV + Audio)',
      ruleDescLabel: 'Description (Optional):',
      ruleDescPlaceholder: 'E.g.: Routine triggered automatically at 19:30',
      triggerSectionTitle: '1. Activation Trigger (When to run?)',
      triggerIRLabel: 'Trigger by Received IR Signal:',
      triggerIRDisabled: '[DISABLED] IR Trigger Disabled (Schedule Only)',
      disableIROption: 'DISABLE: No IR command (Schedule only)',
      disableIRHelp: 'Disabling the IR trigger means the automation runs purely on the scheduled times below.',
      triggerScheduleLabel: 'Trigger by Scheduled Time (ESP32 Clock):',
      addScheduleTimeBtn: 'Add Schedule Time',
      noTimesAdded: 'No scheduled times yet. Click "+ Add Schedule Time" to enable clock-based triggers.',
      removeTimeTooltip: 'Remove time',
      timePrompt: 'Enter time in HH:MM format (e.g., 08:30 or 19:45):',
      actionsSectionTitle: '2. IR Action Sequence (What to transmit?)',
      addActionStepBtn: 'Add Action Step',
      stepNumber: 'Step',
      commandSelectLabel: 'IR Command to Transmit:',
      postDelayLabel: 'Post-transmission delay:',
      removeStepTooltip: 'Remove this step',
      saveRuleBtn: 'Save Rule to ESP32',
      cancelBtn: 'Cancel',
      activeRulesTitle: 'Active Automation Rules',
      noRulesCreated: 'No automation rules yet. Create routines to trigger sequences of devices automatically!',
      ruleEnabled: 'Rule Active',
      ruleDisabled: 'Rule Paused',
      executionsCount: '{count} executions',
      lastExecuted: 'Last execution: {time}',
      deleteRuleConfirm: 'Are you sure you want to permanently delete this automation rule?',
      validationTriggerRequired: 'Define at least one trigger: select an IR command or add a scheduled time.',
      validationActionRequired: 'Add at least one IR action command for the ESP32 to transmit.',
      ruleSavedSuccess: 'Rule "{name}" saved successfully to ESP32!',
      bothTriggersExplanation: '⚡ This rule will trigger if the IR signal is received OR when any of the scheduled times arrive.',
      irOnlyExplanation: '⚡ Immediate activation when the IR command is detected by the ESP32 receiver.',
      scheduleOnlyExplanation: '⏰ Automatic activation at scheduled times (IR Trigger disabled).',
      ruleTypeSelectLabel: 'Automation Type (Select one):',
      ruleTypeTrigger: 'IR Trigger (Signal)',
      ruleTypeSchedule: 'Schedule (Time)',
      ruleTypeTriggerSubtitle: 'Triggered when the ESP32 receiver detects an IR remote signal.',
      ruleTypeScheduleSubtitle: 'Triggered automatically by the ESP32 internal clock at set times.',
      ruleTypeExclusiveNotice: 'Each rule operates exclusively via IR Trigger or Scheduled Time, never both.',
      filterAllRules: 'All Rules',
      filterTriggerRules: 'IR Triggers',
      filterScheduleRules: 'Scheduled Times',
      errorSelectTriggerCmd: 'Please select the trigger IR command that will activate this rule.',
      errorAddScheduleTime: 'Please add at least one scheduled time for the automation.',
      triggerBadge: 'IR Trigger',
      scheduleBadge: 'Schedule',
    },
    schedule: {
      title: 'Clock Scheduling',
      subtitle: 'Automated IR routines triggered at designated clock times by the ESP32.',
      createRuleBtn: 'New Rule',
      ruleNameLabel: 'Schedule Name:',
      ruleNamePlaceholder: 'E.g.: Turn Off All at 23:30',
      explanationNotice: 'Set daily clock schedules. At the specified times, the ESP32 will automatically transmit the infrared actions with your chosen delays.',
      emptyNotice: 'No clock schedules created yet.',
      saveRuleBtn: 'Save Schedule',
    },
    history: {
      title: 'Activity History',
      subtitle: 'Log of transmitted, received signals and executed automation routines',
      clearHistoryBtn: 'Clear History',
      clearConfirm: 'Are you sure you want to clear all activity history?',
      filterAll: 'All',
      filterTx: 'Transmissions',
      filterRx: 'Receptions',
      filterAuto: 'Automations',
      filterClone: 'Clonings',
      searchPlaceholder: 'Filter logs by name, hex code or protocol...',
      emptyHistoryTitle: 'No activity logged yet',
      emptyHistorySubtitle: 'Transmissions, received signals, and automated routines will appear here in real time.',
      repeatTxBtn: 'Repeat Transmission',
      deleteEntryTooltip: 'Delete log entry',
      todayGroup: 'Today',
      yesterdayGroup: 'Yesterday',
      copyHexTooltip: 'Copy hex code',
      detailsLabel: 'Details:',
    },
    sync: {
      title: 'Sync & Wi-Fi',
      subtitle: 'Connect the ESP32 via Bluetooth Low Energy (BLE) or configure Wi-Fi network settings.',
      bleTab: 'BLE Connection (Bluetooth)',
      wifiTab: 'Wi-Fi Configuration',
      bleSectionTitle: 'Bluetooth Low Energy Pairing',
      bleSectionDesc: 'Connect your browser directly to the ESP32 over Web Bluetooth without any intermediary servers.',
      bleScanBtn: 'Scan & Connect ESP32 (BLE)',
      bleScanning: 'Scanning for nearby ESP32 devices...',
      bleConnectedTo: 'Connected to:',
      bleDisconnectBtn: 'Disconnect BLE',
      wifiSectionTitle: 'Wi-Fi Network Configuration',
      wifiSectionDesc: 'Provision network credentials so the ESP32 can operate autonomously on your local network.',
      ssidLabel: 'Wi-Fi Network Name (SSID):',
      ssidPlaceholder: 'E.g.: MyHome_5GHz',
      passLabel: 'Wi-Fi Network Password:',
      passPlaceholder: 'Enter Wi-Fi password...',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      saveWifiBtn: 'Save Wi-Fi to ESP32',
      savingWifi: 'Sending credentials to ESP32...',
      scanNetworksBtn: 'Scan Nearby Networks',
      scanningNetworks: 'Scanning Wi-Fi access points...',
      availableNetworksTitle: 'Discovered Wi-Fi Networks',
      signalStrength: 'Signal:',
      pingTestTitle: 'Latency Diagnostic (Ping)',
      pingTestDesc: 'Measure round-trip response time and link quality with the ESP32 module.',
      pingBtn: 'Test Latency (Ping)',
      pinging: 'Measuring round-trip ping...',
      pingResult: 'Response time: {ms}ms (Optimal)',
      ipAddressLabel: 'IP Address:',
      macAddressLabel: 'MAC Address:',
      firmwareVersionLabel: 'Firmware Version:',
      rssiLabel: 'Signal Strength (RSSI):',
      uptimeLabel: 'System Uptime:',
      deviceStatsTitle: 'Real-Time Hardware Metrics',
      deviceStatusTitle: 'ESP32 Device Status',
      connectedOnline: 'ONLINE',
      reconnectBtn: 'Reconnect',
      signalMetricLabel: 'Wi-Fi Signal',
      signalStrengthGood: 'Optimal',
      signalStrengthFair: 'Good',
      signalStrengthPoor: 'Weak',
      connectionTypeLabel: 'Active Link',
      pingLatencyLabel: 'Latency (Ping)',
      bleSectionSubtitle: 'Direct Web Bluetooth connection via browser',
      bleDesc: 'Pair your computer or phone directly with the ESP32 via Bluetooth without depending on a router.',
      scanningBle: 'Scanning for nearby BLE ESP32 devices...',
      scanBleBtn: 'Scan & Pair ESP32 (BLE)',
      wifiSectionSubtitle: 'Scan and join local residential Wi-Fi network',
      scanWifiBtn: 'Scan Wi-Fi',
      detectedNetworks: 'Detected Wi-Fi Networks',
      wifiSsidLabel: 'Network Name (SSID):',
      wifiSsidPlaceholder: 'E.g.: MyHome_5GHz',
      wifiPassLabel: 'Wi-Fi Password:',
      wifiPassPlaceholder: 'Enter password...',
      sendWifiBtn: 'Send Credentials & Connect',
      irTestTitle: 'Infrared (IR) Hardware Testing',
      irTestSubtitle: 'Test the LED transmitter and TSOP receiver of the ESP32 in real time',
      irTxTestBtn: 'Test Transmitter (LED)',
      irRxTestBtn: 'Test Receiver (Sniffer)',
      openInNewTabNotice: 'To use Web Bluetooth in your browser, open the app in a new tab.',
      openInNewTabBtn: 'Open in New Tab',
    },
    firmware: {
      title: 'C++ Source Code for ESP32 (Arduino IDE)',
      subtitle: 'Generate and compile the full firmware with IR transmitter, receiver, and BLE/Wi-Fi stack.',
      downloadBtn: 'Download .ino File',
      copyBtn: 'Copy C++ Code',
      copiedBtn: 'Copied to Clipboard!',
      closeBtn: 'Close',
      instructionsTitle: 'Arduino IDE Setup Instructions:',
      step1: '1. Open Arduino IDE and install "IRremoteESP8266" and "ArduinoJson" from Library Manager.',
      step2: '2. Connect your ESP32 development board to your computer via USB.',
      step3: '3. Select the board "ESP32 Dev Module" and select the correct COM serial port.',
      step4: '4. Paste the generated sketch code and click "Upload".',
      libraryNote: 'The code uses hardware 38kHz PWM modulation on the GPIO pins configured in the tools drawer.',
    },
    modals: {
      addRemoteTitle: 'Add New Virtual Remote',
      addRemoteSubtitle: 'Select a device layout template and name your new virtual remote control',
      remoteNameLabel: 'Remote Control Name:',
      remoteNamePlaceholder: 'E.g.: Living Room OLED TV, Bedroom Air Conditioner',
      layoutTypeLabel: 'Device Category & Template Layout:',
      createRemoteBtn: 'Create and Add Remote',
      manageRemotesTitle: 'Manage Virtual Remotes',
      manageRemotesSubtitle: 'Create, rename, or remove registered remote controllers',
      deleteRemoteConfirm: 'Are you sure you want to delete this remote control?',
      defaultBadge: 'System Preset',
      assignModalTitle: 'Map IR Command to Button',
      assignModalSubtitle: 'Select one or more IR commands to be triggered by this button',
      selectedCommandsCount: '{count} command(s) selected',
      chooseCommandsLabel: 'Available IR Commands in Library:',
      noCommandsAvailable: 'No IR commands stored in library.',
      goToCopyBtn: 'Go to IR Capture Screen',
      confirmAssignBtn: 'Save Key Mapping',
      clearAssignBtn: 'Unmap Key (Clear)',
    },
  },

  es: {
    common: {
      appName: 'ESP32 IR Remote',
      connected: 'Conectado',
      disconnected: 'Desconectado',
      online: 'ONLINE',
      offline: 'OFFLINE',
      save: 'Guardar',
      saving: 'Guardando...',
      saved: '¡Guardado!',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      back: 'Volver',
      copy: 'Copiar',
      copied: '¡Copiado!',
      test: 'Probar',
      testing: 'Probando...',
      assign: 'Asignar',
      assigned: 'Asignado',
      clear: 'Limpiar',
      reset: 'Restaurar',
      add: 'Añadir',
      create: 'Crear',
      active: 'Activo',
      inactive: 'Inactivo',
      disabled: 'Deshabilitado',
      enabled: 'Habilitado',
      today: 'Hoy',
      yesterday: 'Ayer',
      seconds: 's',
      minutes: 'm',
      hours: 'h',
      success: 'Éxito',
      error: 'Error',
      warning: 'Advertencia',
      all: 'Todos',
      none: 'Ninguno',
      search: 'Buscar...',
      name: 'Nombre',
      description: 'Descripción',
      notes: 'Notas',
      color: 'Color',
      category: 'Categoría',
      confirmDelete: '¿Estás seguro de que deseas eliminar este elemento?',
      loading: 'Cargando...',
      undo: 'Deshacer',
    },
    nav: {
      home: 'Control',
      copy: 'Copiar IR',
      automation: 'Automatización',
      schedule: 'Agendamiento',
      devices: 'Aparatos',
      history: 'Historial',
      sync: 'Sync',
      homeSub: 'Home',
      copySub: 'Copy',
      autoSub: 'Auto',
      scheduleSub: 'Agenda',
      devicesSub: 'Modelos',
      historySub: 'Log',
      syncSub: 'ESP32',
    },
    screenTitles: {
      home: 'Control Remoto',
      copy: 'Copiar / Aprender IR',
      automation: 'Automatización Infrarroja',
      schedule: 'Agendamiento de Horarios',
      devices: 'Biblioteca de Aparatos IR',
      history: 'Historial de Actividades',
      sync: 'Sincronización y Wi-Fi',
    },
    header: {
      themeLightTooltip: 'Cambiar a tema oscuro',
      themeDarkTooltip: 'Cambiar a tema claro azul',
      quickSyncTooltip: 'Haz clic para abrir sincronización',
      menuTooltip: 'Menú Principal',
    },
    drawer: {
      mainMenu: 'Menú Principal',
      suiteTitle: 'ESP32 IR Controller Suite',
      statusLabel: 'ESP32',
      settingsModules: 'Configuración y Módulos',
      themes: 'Temas',
      themesSubtitle: 'Tema Claro / Oscuro',
      themeActiveLight: 'Claro',
      themeActiveDark: 'Oscuro',
      languages: 'Idiomas',
      languagesSubtitle: 'Portugués, Inglés y Español',
      feedback: 'Avisos Sonoros y Feedback',
      feedbackSubtitle: 'Sonidos de bip y vibraciones táctiles',
      feedbackStatusActive: 'Activo',
      feedbackStatusMute: 'Mudo',
      espTools: 'Herramientas del ESP32',
      espToolsSubtitle: 'Pines GPIO, Firmware C++, Copia de seguridad y Reset',
      espToolsBadge: 'GPIO y Config',
      footerSuite: 'ESP32 IR Controller Suite v2.5',
      footerDesc: 'Emisor y Receptor Infrarrojo 38kHz. Control total mediante Web BLE y Wi-Fi.',
      themesSectionTitle: 'Temas',
      themesSectionSubtitle: 'Apariencia y esquema visual',
      themeLight: 'Tema Claro',
      themeDark: 'Tema Oscuro',
      themeLightDesc: 'El Tema Claro está diseñado con tonos azules suaves y alto contraste para uso diurno.',
      themeDarkDesc: 'El Tema Oscuro proporciona comodidad visual y ahorra batería.',
      languagesSectionTitle: 'Idiomas',
      languagesSectionSubtitle: 'Selecciona tu idioma de preferencia',
      langPtTitle: 'Portugués',
      langPtDesc: 'Português (Brasil)',
      langEnTitle: 'Inglés',
      langEnDesc: 'English (United States)',
      langEsTitle: 'Español',
      langEsDesc: 'Español (España / LATAM)',
      langFooterNote: 'El idioma seleccionado se aplica al instante en toda la app y se guarda en el dispositivo.',
      feedbackSectionTitle: 'Avisos Sonoros y Feedback',
      feedbackSectionSubtitle: 'Personaliza el audio y la vibración táctil',
      soundBeepTitle: 'Sonidos de Bip',
      soundBeepDesc: 'Audio al pulsar botones IR',
      hapticTitle: 'Vibración Táctil (Haptic)',
      hapticDesc: 'Respuesta háptica en el móvil o tablet',
      testBeepBtn: 'Probar Sonido de Disparo',
      toolsSectionTitle: 'Herramientas del ESP32',
      toolsSectionSubtitle: 'Configuración, Pines GPIO y Firmware',
      hardwareStatusTitle: 'Estado del ESP32',
      uptime: 'Tiempo Activo',
      firmwareBtnTitle: 'Generador de Firmware Arduino C++',
      firmwareBtnDesc: 'Código .ino listo para compilar en el ESP32',
      gpioTitle: 'Mapeo de Pines GPIO',
      gpioSubtitle: 'Ajusta los pines según la placa que estés usando',
      rxPinLabel: 'Pin Receptor IR (RX):',
      txPinLabel: 'Pin Emisor IR (TX):',
      ledPinLabel: 'LED de Estado:',
      savePinsBtn: 'Guardar Pines en ESP32',
      pinsSavedNotice: '¡Configuración de Pines Guardada en ESP32!',
      backupTitle: 'Copia de Seguridad y Restauración',
      backupSubtitle: 'Exporta o importa tus controles y reglas en archivo JSON',
      exportBackupBtn: 'Exportar Copia JSON',
      importBackupBtn: 'Importar Copia JSON',
      factoryResetTitle: 'Restablecimiento de Fábrica',
      factoryResetSubtitle: 'Restaura todos los controles, reglas y asignaciones originales',
      factoryResetBtn: 'Restaurar Valores Predeterminados',
      factoryResetConfirm: '¿Estás seguro de que deseas restablecer los valores originales? Se perderán las reglas y controles personalizados.',
    },
    remote: {
      selectRemote: 'Seleccionar Control:',
      manageRemotes: 'Administrar Controles',
      addRemote: 'Añadir Control',
      noCommandsAssigned: 'Ningún comando asignado',
      assignedCount: '{count} comando(s) IR configurado(s)',
      holdToAssignHint: 'Mantén presionada cualquier tecla para configurar el comando IR asociado.',
      transmitting: 'Transmitiendo...',
      power: 'Power',
      mute: 'Silencio',
      volUp: 'Vol +',
      volDown: 'Vol -',
      chUp: 'CH +',
      chDown: 'CH -',
      menu: 'Menú',
      back: 'Volver',
      home: 'Inicio',
      source: 'Source',
      input: 'Input',
      info: 'Info',
      exit: 'Salir',
      guide: 'Guía',
      navUp: 'Arriba',
      navDown: 'Abajo',
      navLeft: 'Izquierda',
      navRight: 'Derecha',
      navOk: 'OK',
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
      rewind: 'Retroceder',
      fastForward: 'Avanzar',
      red: 'Rojo',
      green: 'Verde',
      yellow: 'Amarillo',
      blue: 'Azul',
      acTempDisplay: 'Temperatura',
      acPower: 'Encender/Apagar',
      acModeCool: 'Frío (Cool)',
      acModeHeat: 'Calor (Heat)',
      acModeFan: 'Ventilación',
      acModeAuto: 'Automático',
      acModeDry: 'Deshumidificar',
      acFanAuto: 'Fan Auto',
      acFanLow: 'Fan Bajo',
      acFanMed: 'Fan Medio',
      acFanHigh: 'Fan Alto',
      acSwing: 'Oscilación (Swing)',
      acTurbo: 'Turbo / Máx',
      acTimer: 'Timer (1h/2h)',
      soundSourceBT: 'Bluetooth',
      soundSourceAUX: 'Auxiliar',
      soundSourceFM: 'Radio FM',
      soundSourceUSB: 'USB / CD',
      soundBassUp: 'Graves +',
      soundBassDown: 'Graves -',
      soundTrebUp: 'Agudos +',
      soundTrebDown: 'Agudos -',
      soundEqPop: 'EQ Pop',
      soundEqRock: 'EQ Rock',
      soundEqJazz: 'EQ Jazz',
      soundEqFlat: 'EQ Flat',
      lightBrightUp: 'Brillo +',
      lightBrightDown: 'Brillo -',
      lightWarm: 'Blanco Cálido (2700K)',
      lightCool: 'Blanco Frío (6500K)',
      lightFade: 'Desvanecimiento Suave',
      lightFlash: 'Flash Estroboscópico',
      projKeystoneUp: 'Keystone +',
      projKeystoneDown: 'Keystone -',
      projFocusNear: 'Enfoque Cerca',
      projFocusFar: 'Enfoque Lejos',
      projFreeze: 'Congelar Imagen',
      projBlank: 'Pantalla Negra (Blank)',
      customBtn: 'Tecla Personalizada',
      quickMapPrompt: 'Selecciona la tecla para mapear este comando:',
    },
    copy: {
      title: 'Copiar / Aprender IR',
      subtitle: 'Captura señales de cualquier control remoto o prueba transmisiones',
      rxTabTitle: 'Recepción (Aprender IR)',
      txTestTabTitle: 'Transmisión y Pruebas',
      receiverStatusWaiting: 'Esperando Señal IR...',
      receiverStatusActive: 'Receptor IR Activo',
      startSniffingBtn: 'Iniciar Recepción de Señal',
      stopSniffingBtn: 'Detener Receptor',
      sniffingInstruction: 'Apunta el control remoto físico al pin receptor del ESP32 y presiona una tecla.',
      detectedSignalTitle: '¡Señal IR Interceptada con Éxito!',
      protocol: 'Protocolo',
      hexCode: 'Código Hexadecimal',
      bits: 'Tamaño (Bits)',
      rawTimings: 'Pulsos Crudos (Raw Timings)',
      waveformTitle: 'Gráfico de Pulsos y Forma de Onda',
      commandNameLabel: 'Nombre del Comando:',
      commandNamePlaceholder: 'Ej: TV Samsung - Encender/Apagar',
      categoryLabel: 'Categoría del Dispositivo:',
      colorLabel: 'Color de Identificación:',
      notesLabel: 'Notas (Opcional):',
      notesPlaceholder: 'Ej: Botón Power del control original de la sala',
      saveCommandBtn: 'Guardar Comando en Memoria',
      savedCommandsTitle: 'Biblioteca de Comandos IR Guardados',
      noSavedCommands: 'No hay comandos IR aprendidos aún. ¡Haz clic en "Iniciar Recepción" para clonar tu primera señal!',
      searchPlaceholder: 'Buscar por nombre, código hex o protocolo...',
      transmitBtn: 'Transmitir mediante ESP32',
      assignToRemoteBtn: 'Asignar a un Control',
      deleteCommandConfirm: '¿Realmente deseas eliminar este comando de la biblioteca?',
      quickCategoryTV: 'TV / Video',
      quickCategoryAC: 'Aire Acondicionado',
      quickCategorySound: 'Sonido / Audio',
      quickCategoryLights: 'Iluminación',
      quickCategoryCustom: 'Personalizado',
      commandSavedSuccess: '¡Comando IR guardado con éxito en la biblioteca!',
      commandDeletedNotice: 'Comando "{name}" eliminado',
      commandRestoredNotice: 'Comando "{name}" restaurado con éxito',
      filterAll: 'Todos',
      filterByCategory: 'Categoría',
      filterByColor: 'Color',
      allCategories: 'Todas las Categorías',
      allColors: 'Todos los Colores',
      clearFilters: 'Limpiar Filtros',
      noFilteredCommands: 'No se encontraron comandos con los filtros seleccionados.',
    },
    automation: {
      title: 'Automatización Infrarroja',
      subtitle: 'Crea rutinas automáticas activadas por señales IR recibidas o por horarios programados.',
      createRuleBtn: 'Crear Nueva Regla',
      ruleNameLabel: 'Nombre de la Regla:',
      ruleNamePlaceholder: 'Ej: Cine en Casa (Encender TV + Sonido)',
      ruleDescLabel: 'Descripción (Opcional):',
      ruleDescPlaceholder: 'Ej: Rutina activada automáticamente a las 19:30',
      triggerSectionTitle: '1. Gatillo de Activación (¿Cuándo ejecutar?)',
      triggerIRLabel: 'Gatillo por Señal IR Recibida:',
      triggerIRDisabled: '[DESHABILITADO] Gatillo IR Deshabilitado (Solo Horario)',
      disableIROption: 'DESHABILITAR: Ningún comando IR (solo Horario)',
      disableIRHelp: 'Al deshabilitar el gatillo IR, la regla se activará exclusivamente en los horarios programados.',
      triggerScheduleLabel: 'Gatillo por Horario Programado (Reloj ESP32):',
      addScheduleTimeBtn: 'Añadir Horario',
      noTimesAdded: 'Ningún horario programado. Haz clic en "+ Añadir Horario" si deseas activación por reloj.',
      removeTimeTooltip: 'Eliminar horario',
      timePrompt: 'Introduce el horario en formato HH:MM (ej: 08:30 o 19:45):',
      actionsSectionTitle: '2. Secuencia de Acciones IR (¿Qué transmitir?)',
      addActionStepBtn: 'Añadir Paso de Acción',
      stepNumber: 'Paso',
      commandSelectLabel: 'Comando IR a Transmitir:',
      postDelayLabel: 'Espera posterior:',
      removeStepTooltip: 'Eliminar este paso',
      saveRuleBtn: 'Guardar Regla en ESP32',
      cancelBtn: 'Cancelar',
      activeRulesTitle: 'Reglas de Automatización Activas',
      noRulesCreated: 'No hay reglas creadas. ¡Crea rutinas para accionar secuencias de dispositivos automáticamente!',
      ruleEnabled: 'Regla Activa',
      ruleDisabled: 'Regla Pausada',
      executionsCount: '{count} ejecuciones',
      lastExecuted: 'Última ejecución: {time}',
      deleteRuleConfirm: '¿Estás seguro de que deseas eliminar permanentemente esta regla de automatización?',
      validationTriggerRequired: 'Define al menos un gatillo: selecciona un comando IR o añade un horario programado.',
      validationActionRequired: 'Añade al menos un comando IR de acción para que el ESP32 transmita.',
      ruleSavedSuccess: '¡Regla "{name}" guardada con éxito en el ESP32!',
      bothTriggersExplanation: '⚡ Esta regla se activará si se recibe la señal IR O si llega cualquiera de los horarios programados.',
      irOnlyExplanation: '⚡ Activación inmediata cuando el receptor del ESP32 detecta el comando IR.',
      scheduleOnlyExplanation: '⏰ Activación automática en los horarios programados (Gatillo IR deshabilitado).',
      ruleTypeSelectLabel: 'Tipo de Automatización (Selecciona uno):',
      ruleTypeTrigger: 'Gatillo IR (Señal)',
      ruleTypeSchedule: 'Programación (Horario)',
      ruleTypeTriggerSubtitle: 'Activada cuando el receptor del ESP32 detecta una señal infrarroja del mando.',
      ruleTypeScheduleSubtitle: 'Activada automáticamente por el reloj interno del ESP32 en las horas indicadas.',
      ruleTypeExclusiveNotice: 'Cada regla opera exclusivamente por Gatillo IR o por Horario Programado, nunca ambos.',
      filterAllRules: 'Todas las Reglas',
      filterTriggerRules: 'Gatillos IR',
      filterScheduleRules: 'Horarios Programados',
      errorSelectTriggerCmd: 'Selecciona el comando IR de gatillo que activará esta regla.',
      errorAddScheduleTime: 'Añade al menos un horario programado para la automatización.',
      triggerBadge: 'Gatillo IR',
      scheduleBadge: 'Programación',
    },
    schedule: {
      title: 'Agendamiento de Horarios',
      subtitle: 'Programaciones automáticas disparadas en horarios específicos por el ESP32.',
      createRuleBtn: 'Nueva Regla',
      ruleNameLabel: 'Nombre del Agendamiento:',
      ruleNamePlaceholder: 'Ej: Apagar Todo a las 23:30',
      explanationNotice: 'Configura horarios diarios. En las horas programadas, el ESP32 transmitirá automáticamente los comandos infrarrojos con las pausas configuradas.',
      emptyNotice: 'Aún no hay agendamientos programados.',
      saveRuleBtn: 'Guardar Agendamiento',
    },
    history: {
      title: 'Historial de Actividades',
      subtitle: 'Registro de señales transmitidas, recibidas y rutinas ejecutadas',
      clearHistoryBtn: 'Limpiar Historial',
      clearConfirm: '¿Realmente deseas borrar todo el historial de actividades?',
      filterAll: 'Todos',
      filterTx: 'Transmisiones',
      filterRx: 'Recepciones',
      filterAuto: 'Automatizaciones',
      filterClone: 'Clonaciones',
      searchPlaceholder: 'Filtrar registros por nombre, código hex o protocolo...',
      emptyHistoryTitle: 'No hay actividad registrada',
      emptyHistorySubtitle: 'Las transmisiones, señales recibidas y ejecuciones automáticas aparecerán aquí.',
      repeatTxBtn: 'Repetir Disparo',
      deleteEntryTooltip: 'Eliminar registro',
      todayGroup: 'Hoy',
      yesterdayGroup: 'Ayer',
      copyHexTooltip: 'Copiar código hex',
      detailsLabel: 'Detalles:',
    },
    sync: {
      title: 'Sincronización y Wi-Fi',
      subtitle: 'Conecta el ESP32 mediante Bluetooth Low Energy (BLE) o configura la red Wi-Fi.',
      bleTab: 'Conexión BLE (Bluetooth)',
      wifiTab: 'Configuración Wi-Fi',
      bleSectionTitle: 'Emparejamiento Bluetooth Low Energy',
      bleSectionDesc: 'Conecta tu navegador directamente al ESP32 vía Web Bluetooth sin servidores intermedios.',
      bleScanBtn: 'Buscar y Conectar ESP32 (BLE)',
      bleScanning: 'Buscando dispositivos ESP32 cercanos...',
      bleConnectedTo: 'Conectado a:',
      bleDisconnectBtn: 'Desconectar BLE',
      wifiSectionTitle: 'Configuración de Red Wi-Fi',
      wifiSectionDesc: 'Envía las credenciales de red para que el ESP32 funcione de manera autónoma en tu red local.',
      ssidLabel: 'Nombre de la Red Wi-Fi (SSID):',
      ssidPlaceholder: 'Ej: MiRed_5G',
      passLabel: 'Contraseña de la Red Wi-Fi:',
      passPlaceholder: 'Introduce la contraseña de Wi-Fi...',
      showPassword: 'Ver contraseña',
      hidePassword: 'Ocultar contraseña',
      saveWifiBtn: 'Guardar Wi-Fi en ESP32',
      savingWifi: 'Enviando credenciales al ESP32...',
      scanNetworksBtn: 'Buscar Redes Cercanas',
      scanningNetworks: 'Escaneando redes Wi-Fi...',
      availableNetworksTitle: 'Redes Wi-Fi Encontradas',
      signalStrength: 'Señal:',
      pingTestTitle: 'Diagnóstico de Latencia (Ping)',
      pingTestDesc: 'Mide el tiempo de respuesta y la calidad del enlace con el módulo ESP32.',
      pingBtn: 'Probar Latencia (Ping)',
      pinging: 'Midiendo latencia...',
      pingResult: 'Tiempo de respuesta: {ms}ms (Excelente)',
      ipAddressLabel: 'Dirección IP:',
      macAddressLabel: 'Dirección MAC:',
      firmwareVersionLabel: 'Versión de Firmware:',
      rssiLabel: 'Intensidad de Señal (RSSI):',
      uptimeLabel: 'Tiempo en Funcionamiento:',
      deviceStatsTitle: 'Métricas de Hardware en Tiempo Real',
      deviceStatusTitle: 'Estado General del ESP32',
      connectedOnline: 'ONLINE',
      reconnectBtn: 'Reconectar',
      signalMetricLabel: 'Señal Wi-Fi',
      signalStrengthGood: 'Excelente',
      signalStrengthFair: 'Bueno',
      signalStrengthPoor: 'Débil',
      connectionTypeLabel: 'Conexión Activa',
      pingLatencyLabel: 'Latencia (Ping)',
      bleSectionSubtitle: 'Emparejamiento directo vía navegador con Web Bluetooth',
      bleDesc: 'Conecta tu ordenador o móvil directamente al ESP32 vía Bluetooth sin depender de un router.',
      scanningBle: 'Buscando ESP32 por proximidad BLE...',
      scanBleBtn: 'Buscar y Emparejar ESP32 (BLE)',
      wifiSectionSubtitle: 'Escaneo y conexión a la red Wi-Fi local',
      scanWifiBtn: 'Escanear Redes',
      detectedNetworks: 'Redes Wi-Fi Detectadas',
      wifiSsidLabel: 'Nombre de la Red (SSID):',
      wifiSsidPlaceholder: 'Ej: MiRed_5G',
      wifiPassLabel: 'Contraseña de Wi-Fi:',
      wifiPassPlaceholder: 'Introduce la contraseña...',
      sendWifiBtn: 'Enviar Credenciales y Conectar',
      irTestTitle: 'Prueba de Hardware Infrarrojo (IR)',
      irTestSubtitle: 'Prueba el emisor LED y el receptor TSOP del ESP32 en tiempo real',
      irTxTestBtn: 'Probar Emisor (LED)',
      irRxTestBtn: 'Probar Receptor (Sniffer)',
      openInNewTabNotice: 'Para usar Web Bluetooth en el navegador, abre la app en una nueva pestaña.',
      openInNewTabBtn: 'Abrir en Nueva Pestaña',
    },
    firmware: {
      title: 'Código Fuente C++ para ESP32 (Arduino IDE)',
      subtitle: 'Genera y compila el firmware completo con soporte para emisor IR, receptor y BLE/Wi-Fi.',
      downloadBtn: 'Descargar Archivo .ino',
      copyBtn: 'Copiar Código C++',
      copiedBtn: '¡Copiado al Portapapeles!',
      closeBtn: 'Cerrar',
      instructionsTitle: 'Instrucciones de Instalación en Arduino IDE:',
      step1: '1. Abre Arduino IDE e instala las librerías "IRremoteESP8266" y "ArduinoJson".',
      step2: '2. Conecta tu placa ESP32 al puerto USB del ordenador.',
      step3: '3. Selecciona la placa "ESP32 Dev Module" y el puerto serie COM correcto.',
      step4: '4. Pega el código generado y haz clic en "Upload" (Subir).',
      libraryNote: 'El código utiliza modulación de hardware de 38kHz en los pines GPIO configurados en herramientas.',
    },
    modals: {
      addRemoteTitle: 'Añadir Nuevo Control Remoto',
      addRemoteSubtitle: 'Elige la plantilla de dispositivo y asigna un nombre a tu nuevo control',
      remoteNameLabel: 'Nombre del Control Remoto:',
      remoteNamePlaceholder: 'Ej: Smart TV Sala, Aire Acondicionado Dormitorio',
      layoutTypeLabel: 'Categoría y Plantilla del Dispositivo:',
      createRemoteBtn: 'Crear y Añadir Control',
      manageRemotesTitle: 'Administrar Controles Remotos',
      manageRemotesSubtitle: 'Añade, renombra o elimina controles virtuales registrados',
      deleteRemoteConfirm: '¿Realmente deseas eliminar este control remoto?',
      defaultBadge: 'Predeterminado del Sistema',
      assignModalTitle: 'Asignar Comando IR a la Tecla',
      assignModalSubtitle: 'Selecciona uno o más comandos IR para que sean transmitidos por esta tecla',
      selectedCommandsCount: '{count} comando(s) seleccionado(s)',
      chooseCommandsLabel: 'Comandos IR Disponibles en la Biblioteca:',
      noCommandsAvailable: 'No hay comandos IR guardados en la biblioteca.',
      goToCopyBtn: 'Ir a Captura IR',
      confirmAssignBtn: 'Guardar Asignación de Tecla',
      clearAssignBtn: 'Desvincular Tecla (Limpiar)',
    },
  },
};
