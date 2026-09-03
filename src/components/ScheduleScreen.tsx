import React from 'react';
import { AutomationScreen } from './AutomationScreen';
import { AutomationRule, IRCommand, ESP32DeviceState, ActivityLogItem } from '../types';

interface ScheduleScreenProps {
  automations: AutomationRule[];
  commands: IRCommand[];
  onSaveAutomation: (rule: AutomationRule) => void;
  onDeleteAutomation: (id: string) => void;
  onToggleAutomation: (id: string) => void;
  espState: ESP32DeviceState;
  onLogActivity?: (log: Omit<ActivityLogItem, 'id' | 'timestamp'>) => void;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = (props) => {
  return <AutomationScreen {...props} mode="schedule" />;
};
