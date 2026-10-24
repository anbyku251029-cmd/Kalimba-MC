import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { pwaManager } from '../src/utils/pwaManager';
import { getAllSongsWithCustomHymns } from '../src/data/songs';
import { audioEngine } from '../src/utils/audioEngine';

console.log('🧪 [TEST] STEP 02-F PWA 오프라인 기능 및 설치형 웹앱 종합 검증 시작...');

// ---------------------------------------------------------------------
// 1. Web App Manifest 및 아이콘 검증
// ---------------------------------------------------------------------
console.log('--- 1. Web App Manifest 무결성 검증 ---');
const manifestPath = path.resolve('public/manifest.json');
assert.ok(fs.existsSync(manifestPath), 'public/manifest.json 파일이 존재해야 함');

const manifestRaw = fs.readFileSync(manifestPath, 'utf-8');
const manifest = JSON.parse(manifestRaw);

assert.strictEqual(manifest.name, '우리 아이 칼림바 음악 교실');
assert.strictEqual(manifest.short_name, '칼림바 교실');
assert.strictEqual(manifest.display, 'standalone');
assert.strictEqual(manifest.start_url, './', 'Vercel 및 GitHub Pages 양방향 호환을 위해 ./ 상대경로여야 함');
assert.strictEqual(manifest.scope, './', 'Vercel 및 GitHub Pages 양방향 호환을 위해 ./ 상대경로여야 함');
assert.strictEqual(manifest.background_color, '#0c0827');
assert.strictEqual(manifest.theme_color, '#0c0827');
assert.ok(Array.isArray(manifest.icons), 'icons 배열이 존재해야 함');
assert.ok(manifest.icons.length >= 2, '최소 192px 및 512px 아이콘 2개 이상 포함');

// 실제 아이콘 파일 물리적 존재 및 바이트 검사
manifest.icons.forEach((icon: any) => {
  const iconRelPath = icon.src.replace(/^\.\//, 'public/');
  const iconFullPath = path.resolve(iconRelPath);
  assert.ok(fs.existsSync(iconFullPath), `아이콘 파일이 실제로 존재해야 함: ${icon.src}`);
  const stats = fs.statSync(iconFullPath);
  assert.ok(stats.size > 0, `아이콘 파일 크기가 0보다 커야 함: ${icon.src}`);
});
console.log('✅ [PASS] Web App Manifest 및 물리적 아이콘 파일 무결성 검증 완료');

// ---------------------------------------------------------------------
// 2. Service Worker (public/sw.js) 코드 검증
// ---------------------------------------------------------------------
console.log('--- 2. Service Worker 캐시 스크립트 검증 ---');
const swPath = path.resolve('public/sw.js');
assert.ok(fs.existsSync(swPath), 'public/sw.js 파일이 존재해야 함');

const swContent = fs.readFileSync(swPath, 'utf-8');
assert.ok(swContent.includes('CACHE_NAME'), 'CACHE_NAME 버전 관리 변수 포함');
assert.ok(swContent.includes('PRECACHE_ASSETS'), '사전 캐시 리소스 목록 포함');
assert.ok(swContent.includes("addEventListener('install'"), 'install 이벤트 리스너 포함');
assert.ok(swContent.includes("addEventListener('activate'"), 'activate 이벤트 리스너 포함');
assert.ok(swContent.includes("addEventListener('fetch'"), 'fetch 이벤트 리스너 포함');
assert.ok(swContent.includes('caches.match'), '오프라인 캐시 매칭 로직 포함');
console.log('✅ [PASS] Service Worker 핵심 캐시 이벤트 및 오프라인 로직 검증 완료');

// ---------------------------------------------------------------------
// 3. PWA Manager 상태 관리자 단위 검증
// ---------------------------------------------------------------------
console.log('--- 3. PWA Manager 상태 관리자 검증 ---');
const initialState = pwaManager.getState();
assert.ok(['ONLINE', 'OFFLINE'].includes(initialState.networkStatus), '네트워크 상태 정상 조회');

let subscriberNotified = false;
const unsubscribe = pwaManager.subscribe((st) => {
  assert.ok(st, '구독자에게 상태 객체 전달');
  subscriberNotified = true;
});
assert.strictEqual(subscriberNotified, true, '구독 즉시 1회 알림 호출 확인');
unsubscribe();
console.log('✅ [PASS] PWA Manager 상태 조회 및 구독자 리스너 검증 완료');

// ---------------------------------------------------------------------
// 4. 오프라인 칼림바 오디오 합성 및 111곡 완전 자립성 검증
// ---------------------------------------------------------------------
console.log('--- 4. 오프라인 사운드 생성 및 111곡 자립성 검증 ---');
assert.ok(audioEngine, 'audioEngine 인스턴스 정상 로드');
assert.strictEqual(typeof audioEngine.playNote, 'function', 'Web Audio API 오프라인 신호 합성 지원');

const songs = getAllSongsWithCustomHymns();
const beginner = songs.filter((s) => s.level === 'beginner');
const intermediate = songs.filter((s) => s.level === 'intermediate');
const advanced = songs.filter((s) => s.level === 'advanced');
const hymn = songs.filter((s) => s.level === 'hymn');

assert.strictEqual(beginner.length, 30, '초급 30곡 완전 보존');
assert.strictEqual(intermediate.length, 30, '중급 30곡 완전 보존');
assert.strictEqual(advanced.length, 30, '고급 30곡 완전 보존');
assert.strictEqual(hymn.length, 21, '찬송가 21곡 완전 보존');
assert.strictEqual(songs.length, 111, '총 111곡 완전 보존 (오프라인 번들 내장)');

// 고급곡 전곡 50음표 이상 유지
advanced.forEach((s) => {
  const noteEvents = s.notes.filter((n) => !n.isRest && n.note !== 0);
  assert.ok(noteEvents.length >= 50, `고급곡 ${s.title}은 50음표 이상이어야 함 (실제: ${noteEvents.length})`);
});
console.log('✅ [PASS] 외부 사운드 다운로드 없는 오프라인 111곡 자립 연주 무결성 확인');

// ---------------------------------------------------------------------
// 5. 로컬 데이터 격리 및 보존 원칙 검증
// ---------------------------------------------------------------------
console.log('--- 5. 캐시 정리와 사용자 데이터 물리적 격리 검증 ---');
// sw.js 내에 localStorage나 IndexedDB를 삭제하는 코드가 없음을 확인
assert.ok(!swContent.includes('localStorage.clear'), 'sw.js는 localStorage를 삭제하지 않음');
assert.ok(!swContent.includes('indexedDB.deleteDatabase'), 'sw.js는 IndexedDB를 삭제하지 않음');
console.log('✅ [PASS] 서비스 워커와 사용자 로컬 데이터 간 안전한 물리적 격리 확인');

console.log('🎉 [TEST] STEP 02-F PWA 오프라인 및 설치형 웹앱 모든 단위 및 회귀 테스트 통과!');
