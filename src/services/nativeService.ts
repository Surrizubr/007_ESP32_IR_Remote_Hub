import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

class NativeService {
  private isInitialized = false;

  public isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  public getPlatform(): 'android' | 'ios' | 'web' {
    return Capacitor.getPlatform() as 'android' | 'ios' | 'web';
  }

  public async init(isLight: boolean = false): Promise<void> {
    if (!this.isNative()) return;
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // Hide native splash screen smoothly
      await SplashScreen.hide();
    } catch {
      // ignore
    }

    try {
      // Configure Status Bar style
      await this.updateTheme(isLight);
    } catch {
      // ignore
    }
  }

  public async updateTheme(isLight: boolean): Promise<void> {
    if (!this.isNative()) return;
    try {
      await StatusBar.setStyle({
        style: isLight ? Style.Light : Style.Dark,
      });
      await StatusBar.setBackgroundColor({
        color: isLight ? '#f0f9ff' : '#020617',
      });
    } catch {
      // ignore
    }
  }

  // Setup hardware back button handler for Android
  public registerBackButtonHandler(callback: () => boolean): () => void {
    if (!this.isNative()) return () => {};

    const listener = CapApp.addListener('backButton', (event) => {
      const handled = callback();
      if (!handled && !event.canGoBack) {
        CapApp.exitApp();
      }
    });

    return () => {
      listener.then((l) => l.remove()).catch(() => {});
    };
  }

  // Haptic Feedback integrations
  public async hapticLight(): Promise<void> {
    if (this.isNative()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
        return;
      } catch {
        // fallback
      }
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(12); } catch {}
    }
  }

  public async hapticMedium(): Promise<void> {
    if (this.isNative()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
        return;
      } catch {
        // fallback
      }
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(25); } catch {}
    }
  }

  public async hapticSuccess(): Promise<void> {
    if (this.isNative()) {
      try {
        await Haptics.notification({ type: NotificationType.Success });
        return;
      } catch {
        // fallback
      }
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([15, 40, 30]); } catch {}
    }
  }

  public async hapticWarning(): Promise<void> {
    if (this.isNative()) {
      try {
        await Haptics.notification({ type: NotificationType.Warning });
        return;
      } catch {
        // fallback
      }
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([30, 50, 40]); } catch {}
    }
  }
}

export const nativeService = new NativeService();
