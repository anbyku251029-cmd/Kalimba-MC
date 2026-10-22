/**
 * kalimbaTouchController.ts
 * 모바일·태블릿 멀티터치 최적화 및 17음 칼림바 건반 포인터 컨트롤러
 * 
 * Pointer Events (pointerdown, pointerup, pointercancel, lostpointercapture)를 기반으로
 * 복수의 손가락(화음 연주)을 독립적으로 추적하고, 지연 없는 즉각적 반응과 제스처 충돌을 방지합니다.
 */

export interface KalimbaKeyPointerHandler {
  onKeyDown: (keyIndex: number, pointerId: number) => void;
  onKeyUp: (keyIndex: number, pointerId: number) => void;
}

export class KalimbaTouchController {
  // pointerId -> keyIndex 매핑
  private activePointers = new Map<number, number>();
  // keyIndex -> active pointer count (동일 건반을 여러 포인터가 누를 경우 대비)
  private keyPointerCounts = new Map<number, number>();
  private handlers: KalimbaKeyPointerHandler | null = null;

  constructor(handlers?: KalimbaKeyPointerHandler) {
    if (handlers) {
      this.handlers = handlers;
    }
  }

  public setHandlers(handlers: KalimbaKeyPointerHandler) {
    this.handlers = handlers;
  }

  /**
   * 포인터가 건반에 닿았을 때 (터치, 마우스 클릭, 스타일러스)
   */
  public handlePointerDown(
    e: React.PointerEvent | PointerEvent,
    keyIndex: number
  ): void {
    // 기본 브라우저 제스처(더블탭 줌, 스크롤 끌림 등) 방지
    if (e.cancelable) {
      e.preventDefault();
    }

    const pointerId = e.pointerId;

    // 이미 등록된 포인터라면 이전 건반 릴리즈
    if (this.activePointers.has(pointerId)) {
      const prevKey = this.activePointers.get(pointerId)!;
      this.decrementKeyCount(prevKey, pointerId);
    }

    // 새로운 건반 등록
    this.activePointers.set(pointerId, keyIndex);
    const count = (this.keyPointerCounts.get(keyIndex) || 0) + 1;
    this.keyPointerCounts.set(keyIndex, count);

    if (this.handlers) {
      this.handlers.onKeyDown(keyIndex, pointerId);
    }

    // 포인터 캡처 시도 (브라우저가 지원하고 target이 Element일 때)
    try {
      const target = e.currentTarget as HTMLElement | null;
      if (target && typeof target.setPointerCapture === 'function') {
        target.setPointerCapture(pointerId);
      }
    } catch {
      // 일부 브라우저/가상환경 무시
    }
  }

  /**
   * 포인터가 건반에서 떨어졌을 때
   */
  public handlePointerUp(
    e: React.PointerEvent | PointerEvent,
    expectedKeyIndex?: number
  ): void {
    const pointerId = e.pointerId;
    const keyIndex = this.activePointers.get(pointerId) ?? expectedKeyIndex;

    if (keyIndex !== undefined) {
      this.decrementKeyCount(keyIndex, pointerId);
      this.activePointers.delete(pointerId);
    }

    try {
      const target = e.currentTarget as HTMLElement | null;
      if (target && typeof target.releasePointerCapture === 'function' && target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    } catch {
      // 무시
    }
  }

  /**
   * 시스템 알림, 제스처 전환 등으로 포인터가 취소되었을 때
   */
  public handlePointerCancel(
    e: React.PointerEvent | PointerEvent,
    expectedKeyIndex?: number
  ): void {
    this.handlePointerUp(e, expectedKeyIndex);
  }

  /**
   * 포인터 캡처가 상실되었을 때 안전 복구
   */
  public handleLostPointerCapture(
    e: React.PointerEvent | PointerEvent,
    expectedKeyIndex?: number
  ): void {
    this.handlePointerUp(e, expectedKeyIndex);
  }

  private decrementKeyCount(keyIndex: number, pointerId: number): void {
    const current = this.keyPointerCounts.get(keyIndex) || 0;
    if (current <= 1) {
      this.keyPointerCounts.delete(keyIndex);
      if (this.handlers) {
        this.handlers.onKeyUp(keyIndex, pointerId);
      }
    } else {
      this.keyPointerCounts.set(keyIndex, current - 1);
    }
  }

  /**
   * 특정 건반이 현재 눌려있는지 여부
   */
  public isKeyActive(keyIndex: number): boolean {
    return (this.keyPointerCounts.get(keyIndex) || 0) > 0;
  }

  /**
   * 현재 눌려있는 모든 건반 인덱스 목록
   */
  public getActiveKeyIndices(): number[] {
    return Array.from(this.keyPointerCounts.keys());
  }

  /**
   * 현재 추적 중인 활성 포인터 수
   */
  public getActivePointerCount(): number {
    return this.activePointers.size;
  }

  /**
   * 화면 전환이나 일시정지 시 모든 터치 상태 초기화
   */
  public resetAll(): void {
    const activeKeys = Array.from(this.keyPointerCounts.keys());
    this.activePointers.clear();
    this.keyPointerCounts.clear();

    if (this.handlers) {
      for (const k of activeKeys) {
        this.handlers.onKeyUp(k, -1);
      }
    }
  }
}
