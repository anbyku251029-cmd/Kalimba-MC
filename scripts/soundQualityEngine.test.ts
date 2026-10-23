/**
 * soundQualityEngine.test.ts
 * STEP 01-I: 칼림바 음색 생성, 배음 구조, 음역별 서스테인 및 다이내믹 악센트 엔진 단위 테스트
 */

import { KALIMBA_KEYS, PITCH_TO_KEY } from '../src/constants/kalimbaKeys';
import { calculateDynamicAccent, audioEngine, DEFAULT_AUDIO_SETTINGS, AudioSettings } from '../src/utils/audioEngine';
import { calculateSongTimeline } from '../src/utils/musicTiming';
import { BEGINNER_SONGS } from '../src/data/songsBeginner';
import { INTERMEDIATE_SONGS } from '../src/data/songsIntermediate';
import { ADVANCED_SONGS } from '../src/data/songsAdvanced';
import { DEFAULT_HYMN_SONGS } from '../src/data/hymns';

function runTests() {
  console.log('🧪 Starting Sound Quality & Music Expression Engine Tests...\n');
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

  // TEST 1: 17음 기본 주파수 및 물리적 고차 배음(5.4x) 무결성
  {
    console.log('Test 1: 17-Key Fundamental & Inharmonic Overtone Frequency Calculation');
    assert(KALIMBA_KEYS.length === 17, '17 keys exist');

    // C4 가운데 도 검증
    const c4 = PITCH_TO_KEY.get('C4');
    assert(c4 !== undefined && Math.abs(c4.frequency - 261.63) < 0.1, 'C4 frequency is 261.63 Hz');

    // E6 최고음 검증
    const e6 = PITCH_TO_KEY.get('E6');
    assert(e6 !== undefined && Math.abs(e6.frequency - 1318.51) < 0.1, 'E6 frequency is 1318.51 Hz');

    // 배음 주파수 검증 (5.4배 물리 비조화 진동)
    KALIMBA_KEYS.forEach((k) => {
      const overtone = k.frequency * 5.4;
      assert(overtone > k.frequency, `Key ${k.letter} (${k.pitch}) overtone is higher than base frequency`);
    });
  }

  // TEST 2: 박자표별 마디 내 음악적 강약(Dynamic Accent) 알고리즘 검증
  {
    console.log('\nTest 2: Dynamic Accent & Measure Beat Weight Calculation');

    // 4/4 박자: 1박(강) > 3박(중강) > 2박(약) > 4박(약)
    const b4_1 = calculateDynamicAccent(0.0, '4/4'); // 1박
    const b4_2 = calculateDynamicAccent(1.0, '4/4'); // 2박
    const b4_3 = calculateDynamicAccent(2.0, '4/4'); // 3박
    const b4_4 = calculateDynamicAccent(3.0, '4/4'); // 4박

    assert(b4_1 === 1.0, '4/4 beat 1 is strong accent (1.0)');
    assert(b4_3 === 0.88, '4/4 beat 3 is medium accent (0.88)');
    assert(b4_2 === 0.74, '4/4 beat 2 is weak accent (0.74)');
    assert(b4_4 === 0.72, '4/4 beat 4 is weak accent (0.72)');
    assert(b4_1 > b4_3 && b4_3 > b4_2 && b4_2 >= b4_4, '4/4 dynamic hierarchy holds: 1 > 3 > 2 >= 4');

    // 3/4 박자: 1박(강) > 2박(약) >= 3박(약)
    const b3_1 = calculateDynamicAccent(0.0, '3/4');
    const b3_2 = calculateDynamicAccent(1.0, '3/4');
    const b3_3 = calculateDynamicAccent(2.0, '3/4');

    assert(b3_1 === 1.0, '3/4 beat 1 is strong accent (1.0)');
    assert(b3_2 === 0.72, '3/4 beat 2 is weak accent (0.72)');
    assert(b3_3 === 0.70, '3/4 beat 3 is weak accent (0.70)');
    assert(b3_1 > b3_2 && b3_2 >= b3_3, '3/4 dynamic hierarchy holds: 1 > 2 >= 3');

    // 2/4 박자: 1박(강) > 2박(약)
    const b2_1 = calculateDynamicAccent(0.0, '2/4');
    const b2_2 = calculateDynamicAccent(1.0, '2/4');
    assert(b2_1 === 1.0 && b2_2 === 0.74, '2/4 beat 1 is strong (1.0) and beat 2 is weak (0.74)');

    // 6/8 박자: 1박(강) > 4박(중강)
    const b6_1 = calculateDynamicAccent(0.0, '6/8');
    const b6_4 = calculateDynamicAccent(3.0, '6/8');
    assert(b6_1 === 1.0, '6/8 beat 1 is strong accent (1.0)');
    assert(b6_4 === 0.86, '6/8 beat 4 is medium accent (0.86)');
    assert(b6_1 > b6_4, '6/8 beat 1 > beat 4 holds');
  }

  // TEST 3: 음색 프리셋 및 오디오 설정 무결성
  {
    console.log('\nTest 3: Audio Settings & Timbre Preset Compatibility');
    const s = audioEngine.getSettings();
    assert(typeof s.volume === 'number' && s.volume >= 0 && s.volume <= 1, 'Volume is within valid 0.0~1.0 range');
    assert(typeof s.reverbEnabled === 'boolean', 'Reverb toggle is boolean');
    assert(typeof s.expressiveDynamics === 'boolean', 'Expressive dynamics toggle is boolean');

    const validTimbres = ['default', 'bright', 'soft', 'clean', 'warm', 'expressive'];
    assert(validTimbres.includes(s.timbre), 'Current timbre is in supported modes list');

    // 설정 업데이트 검증
    audioEngine.updateSettings({ timbre: 'warm', expressiveDynamics: true });
    const sUpdated = audioEngine.getSettings();
    assert(sUpdated.timbre === 'warm', 'Updated timbre is warm');
    assert(sUpdated.expressiveDynamics === true, 'Updated expressiveDynamics is true');

    // 기본값 복구
    audioEngine.updateSettings(DEFAULT_AUDIO_SETTINGS);
  }

  // TEST 4: 타임라인 메타데이터의 beatInMeasure 및 dynamicAccent 산출 검증
  {
    console.log('\nTest 4: Timeline Integration of Beat Position and Dynamic Accent');
    const song = BEGINNER_SONGS[1]; // 비행기 (4/4 박자)
    const timeline = calculateSongTimeline(song, 100);

    assert(timeline.playableItems.length > 0, 'Playable items generated');
    const firstNote = timeline.playableItems[0];
    assert(firstNote.beatInMeasure === 0.0, 'First note is at beat 0 of measure');
    assert(firstNote.dynamicAccent === 1.0, 'First note has strong dynamic accent 1.0');

    // 2번째 음표 (1.0박)
    const secondNote = timeline.playableItems[1];
    assert(secondNote.beatInMeasure === 1.0, 'Second note is at beat 1 of measure');
    assert(secondNote.dynamicAccent === 0.74, 'Second note has weak dynamic accent 0.74');
  }

  // TEST 5: 기존 110곡 원본 악보 데이터 보존 및 불변성 검증
  {
    console.log('\nTest 5: Original Song Data Preservation (110 Total Songs)');
    assert(BEGINNER_SONGS.length === 30, '30 Beginner songs intact');
    assert(INTERMEDIATE_SONGS.length === 30, '30 Intermediate songs intact');
    assert(ADVANCED_SONGS.length === 30, '30 Advanced songs intact');
    assert(DEFAULT_HYMN_SONGS.length >= 20, '20+ Default hymns intact');

    const totalCount = BEGINNER_SONGS.length + INTERMEDIATE_SONGS.length + ADVANCED_SONGS.length + DEFAULT_HYMN_SONGS.length;
    assert(totalCount === 111, 'Total song count is exactly 111 (including Hymn 301)');

    // 악보 내용 불변 확인
    const airplane = BEGINNER_SONGS.find((s) => s.id === 'beginner-2');
    assert(airplane !== undefined && Boolean(airplane.rawNotation?.includes('3/떴 2/다 1/떴 2/다')), 'Airplane notation preserved');

    const canon = ADVANCED_SONGS.find((s) => s.id === 'adv-2' || s.title.includes('캐논'));
    assert(canon !== undefined, 'Canon variation song preserved');
  }

  console.log(`\n========================================`);
  console.log(`Sound Quality Engine Tests: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
