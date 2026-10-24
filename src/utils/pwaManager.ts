/**
 * pwaManager.ts
 * Kalimba-MC STEP 02-F: PWA 오프라인 감지, 서비스 워커 등록 및 설치 프롬프트 관리자
 */

export type NetworkStatus = 'ONLINE' | 'OFFLINE';

export interface PwaState {
  networkStatus: NetworkStatus;
  isInstallable: boolean;
  isInstalled: boolean;
  updateAvailable: boolean;
  isServiceWorkerReady: boolean;
}

type PwaListener = (state: PwaState) => void;

class PwaManager {
  private state: PwaState = {
    networkStatus: typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE' : 'OFFLINE',
    isInstallable: false,
    isInstalled: false,
    updateAvailable: false,
    isServiceWorkerReady: false,
  };

  private listeners: Set<PwaListener> = new Set();
  private deferredPrompt: any = null;
  private registration: ServiceWorkerRegistration | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initListeners();
    }
  }

  private initListeners(): void {
    // 1. 온라인 / 오프라인 이벤트 감지
    window.addEventListener('online', () => {
      this.state.networkStatus = 'ONLINE';
      this.notify();
    });

    window.addEventListener('offline', () => {
      this.state.networkStatus = 'OFFLINE';
      this.notify();
    });

    // 2. 브라우저 PWA 설치 가능 이벤트 (beforeinstallprompt)
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.state.isInstallable = true;
      this.notify();
    });

    // 3. 앱 설치 완료 이벤트 (appinstalled)
    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.state.isInstallable = false;
      this.state.isInstalled = true;
      this.notify();
    });

    // 4. 이미 Standalone 모드로 실행 중인지 확인
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      this.state.isInstalled = true;
    }
  }

  /**
   * 서비스 워커를 등록합니다.
   */
  public registerServiceWorker(): void {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    window.addEventListener('load', () => {
      // 상대 경로 또는 기본 경로로 sw.js 등록
      const swUrl = './sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then((reg) => {
          this.registration = reg;
          this.state.isServiceWorkerReady = true;
          this.notify();

          // 새 버전 업데이트 감지
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  this.state.updateAvailable = true;
                  this.notify();
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });

      // 컨트롤러 변경 감지 (새 버전 활성화 시)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        this.notify();
      });
    });
  }

  /**
   * 사용자가 설치 버튼을 눌렀을 때 브라우저 네이티브 설치 대화상자를 호출합니다.
   */
  public async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.state.isInstallable = false;
      this.notify();
      return choice.outcome === 'accepted';
    } catch (err) {
      console.warn('[PWA] Install prompt failed', err);
      return false;
    }
  }

  /**
   * 새 버전이 있을 때 즉시 업데이트(새로고침)를 적용합니다.
   */
  public applyUpdate(): void {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }

  public getState(): PwaState {
    return { ...this.state };
  }

  public subscribe(listener: PwaListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((fn) => fn(currentState));
  }
}

export const pwaManager = new PwaManager();
