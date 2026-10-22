/**
 * multitouchController.test.ts
 * 모바일·태블릿 멀티터치 컨트롤러 단위 테스트
 */

import { KalimbaTouchController } from '../src/utils/kalimbaTouchController';

function createMockPointerEvent(pointerId: number): PointerEvent {
  return {
    pointerId,
    cancelable: true,
    preventDefault: () => {},
    currentTarget: {
      setPointerCapture: () => {},
      releasePointerCapture: () => {},
      hasPointerCapture: () => true,
    },
  } as unknown as PointerEvent;
}

function runTests() {
  console.log('🧪 Starting KalimbaTouchController Multi-Touch Tests...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // TEST 1: 단일 포인터 기본 동작
  {
    console.log('Test 1: Single Pointer Down / Up Tracking');
    const controller = new KalimbaTouchController();
    const downCalls: { key: number; pointer: number }[] = [];
    const upCalls: { key: number; pointer: number }[] = [];

    controller.setHandlers({
      onKeyDown: (key, pointer) => downCalls.push({ key, pointer }),
      onKeyUp: (key, pointer) => upCalls.push({ key, pointer }),
    });

    const evt1 = createMockPointerEvent(101);
    controller.handlePointerDown(evt1, 8); // C4 중심 건반(8번 인덱스)

    assert(controller.isKeyActive(8) === true, 'Key 8 should be active after pointer down');
    assert(controller.getActivePointerCount() === 1, 'Active pointer count should be 1');
    assert(downCalls.length === 1 && downCalls[0].key === 8, 'onKeyDown handler should be called for key 8');

    controller.handlePointerUp(evt1, 8);
    assert(controller.isKeyActive(8) === false, 'Key 8 should be inactive after pointer up');
    assert(controller.getActivePointerCount() === 0, 'Active pointer count should be 0');
    assert(upCalls.length === 1 && upCalls[0].key === 8, 'onKeyUp handler should be called for key 8');
  }

  // TEST 2: 멀티터치 동시 타건 (화음 연주)
  {
    console.log('\nTest 2: Multi-Touch Simultaneous Chord Playing');
    const controller = new KalimbaTouchController();
    const activeKeys: number[] = [];

    controller.setHandlers({
      onKeyDown: (key) => activeKeys.push(key),
      onKeyUp: (key) => {
        const idx = activeKeys.indexOf(key);
        if (idx >= 0) activeKeys.splice(idx, 1);
      },
    });

    // 왼손 엄지: 건반 0 (D6) 터치
    const leftThumb = createMockPointerEvent(1);
    controller.handlePointerDown(leftThumb, 0);

    // 오른손 엄지: 건반 16 (E6) 터치
    const rightThumb = createMockPointerEvent(2);
    controller.handlePointerDown(rightThumb, 16);

    assert(controller.getActivePointerCount() === 2, 'Should track 2 simultaneous pointers');
    assert(controller.isKeyActive(0) === true, 'Key 0 (left tine) should be active');
    assert(controller.isKeyActive(16) === true, 'Key 16 (right tine) should be active');
    assert(activeKeys.includes(0) && activeKeys.includes(16), 'Both keys should trigger independent onKeyDown');

    // 한 손가락만 떼기
    controller.handlePointerUp(leftThumb, 0);
    assert(controller.isKeyActive(0) === false, 'Key 0 should become inactive');
    assert(controller.isKeyActive(16) === true, 'Key 16 should remain active while held');
    assert(controller.getActivePointerCount() === 1, '1 pointer should remain active');

    // 나머지 손가락 떼기
    controller.handlePointerUp(rightThumb, 16);
    assert(controller.isKeyActive(16) === false, 'Key 16 should become inactive');
    assert(controller.getActivePointerCount() === 0, 'No active pointers remaining');
  }

  // TEST 3: 포인터 취소 (PointerCancel) 및 캡처 상실 (LostPointerCapture)
  {
    console.log('\nTest 3: Pointer Cancel and Lost Pointer Capture Recovery');
    const controller = new KalimbaTouchController();
    controller.setHandlers({
      onKeyDown: () => {},
      onKeyUp: () => {},
    });

    const evt = createMockPointerEvent(99);
    controller.handlePointerDown(evt, 5);
    assert(controller.isKeyActive(5) === true, 'Key 5 should be active');

    // 시스템 제스처나 전화 수신 등으로 인한 pointercancel 발생
    controller.handlePointerCancel(evt, 5);
    assert(controller.isKeyActive(5) === false, 'Key 5 should be safely released on pointercancel');
    assert(controller.getActivePointerCount() === 0, 'Active pointer count reset to 0');

    // lostpointercapture 테스트
    controller.handlePointerDown(evt, 6);
    assert(controller.isKeyActive(6) === true, 'Key 6 active');
    controller.handleLostPointerCapture(evt, 6);
    assert(controller.isKeyActive(6) === false, 'Key 6 safely released on lostpointercapture');
  }

  // TEST 4: resetAll 전체 초기화
  {
    console.log('\nTest 4: ResetAll Clears All Pointers');
    const controller = new KalimbaTouchController();
    controller.handlePointerDown(createMockPointerEvent(10), 1);
    controller.handlePointerDown(createMockPointerEvent(11), 2);
    controller.handlePointerDown(createMockPointerEvent(12), 3);

    assert(controller.getActivePointerCount() === 3, '3 active pointers before reset');
    controller.resetAll();
    assert(controller.getActivePointerCount() === 0, '0 pointers after resetAll');
    assert(controller.isKeyActive(1) === false, 'Key 1 inactive');
    assert(controller.isKeyActive(2) === false, 'Key 2 inactive');
    assert(controller.isKeyActive(3) === false, 'Key 3 inactive');
  }

  console.log(`\n========================================`);
  console.log(`Multi-Touch Controller Tests: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
