/**
 * PwaStatusBanner.tsx
 * Kalimba-MC STEP 02-F: PWA 오프라인 알림, 설치 버튼 및 업데이트 배너 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, Download, Sparkles, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { pwaManager, PwaState } from '../utils/pwaManager';

export const PwaStatusBanner: React.FC = () => {
  const [pwaState, setPwaState] = useState<PwaState>(() => pwaManager.getState());
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = pwaManager.subscribe((newState) => {
      setPwaState(newState);
      // 오프라인으로 전환되거나 업데이트가 발견되면 닫힘 상태 리셋
      if (newState.networkStatus === 'OFFLINE' || newState.updateAvailable) {
        setIsDismissed(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleInstallClick = async () => {
    await pwaManager.promptInstall();
  };

  const handleUpdateClick = () => {
    pwaManager.applyUpdate();
  };

  // 1. 새 버전 업데이트 안내 배너 (최우선)
  if (pwaState.updateAvailable) {
    return (
      <div className="relative z-50 w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-['Jua',sans-serif] shadow-lg flex items-center justify-between animate-fadeIn">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span>새로운 칼림바 음악 교실 버전이 준비되었어요!</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUpdateClick}
            className="px-3 py-1 rounded-xl bg-white text-indigo-950 font-black text-xs hover:bg-amber-300 transition active:scale-95 cursor-pointer shadow"
          >
            지금 업데이트
          </button>
        </div>
      </div>
    );
  }

  // 2. 오프라인 상태 배너
  if (pwaState.networkStatus === 'OFFLINE' && !isDismissed) {
    return (
      <div className="relative z-50 w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white px-3 py-2 text-xs sm:text-sm font-['Jua',sans-serif] shadow-md flex items-center justify-between animate-fadeIn">
        <div className="flex items-center space-x-2">
          <WifiOff className="w-4 h-4 text-amber-200 shrink-0" />
          <span>
            <strong>현재 오프라인 모드입니다.</strong> 기기에 저장된 111곡과 나만의 칼림바를 인터넷 없이 자유롭게 연주할 수 있어요! 🎵
          </span>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 3. 앱 설치 가능 배너 (온라인이고 설치 가능한 경우에만 가볍게 노출)
  if (pwaState.isInstallable && !pwaState.isInstalled && !isDismissed) {
    return (
      <div className="relative z-40 w-full bg-[#17113e] border-b border-cyan-400/30 text-white px-3 py-1.5 sm:px-4 text-xs font-['Jua',sans-serif] flex items-center justify-between">
        <div className="flex items-center space-x-2 text-cyan-200">
          <Download className="w-3.5 h-3.5 text-cyan-300" />
          <span className="hidden sm:inline">
            홈 화면이나 데스크톱에 앱으로 설치하면 더 빠르고 인터넷 없이도 즐길 수 있어요!
          </span>
          <span className="sm:hidden">앱으로 설치하여 언제든 오프라인 연주!</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-cyan-950 font-black text-[11px] sm:text-xs transition active:scale-95 cursor-pointer shadow"
          >
            📲 앱 설치하기
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-white/50 hover:text-white cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
