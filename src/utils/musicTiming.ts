import { Song, KalimbaNote, KalimbaHand } from '../types/music';
import { PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { calculateDynamicAccent } from './audioEngine';
import { ChordGroupItem } from '../types/chordTypes';

export interface TimedNoteItem {
  id: string;
  originalIndex: number;
  playableIndex: number;
  noteIndex: number; // 하위 호환용 (playableIndex와 동일) // 쉼표 제외 순번 (0-indexed)
  pitch: string;
  numberNotation: string;
  keyIndex: number;
  startBeat: number;
  beatTime: number; // 하위 호환용 (startBeat와 동일)
  durationBeats: number;
  duration: number; // 하위 호환용 (durationBeats와 동일)
  endBeat: number;
  startSeconds: number;
  endSeconds: number;
  isRest: boolean;
  color: 'orange' | 'green' | 'blue' | 'teal';
  lyric?: string;
  beatInMeasure?: number; // 마디 내 박자 위치 (0-based)
  dynamicAccent?: number; // 0.65 ~ 1.0 음악적 강약 가중치
  // STEP 03-A: 화음 및 양손 연주 확장 필드
  hand: KalimbaHand; // 'left' | 'right' | 'center'
  chordId?: string;
  isChord?: boolean;
  isChordSecondary?: boolean; // 화음의 두 번째 이상 음표
  chordPartnerPitches?: string[];
}

export interface SongTimingTimeline {
  songId: string;
  tempoBpm: number;
  speedPercent: number;
  speedMultiplier: number;
  beatDurationSeconds: number; // 1박의 실제 초 ( (60 / tempoBpm) * (1 / speedMultiplier) )
  initialLeadInBeats: number; // -2.0 (2박 예비박)
  initialLeadInSeconds: number;
  items: TimedNoteItem[]; // 쉼표 포함 전체 타임라인
  playableItems: TimedNoteItem[]; // 실제 떨어지는 블록 및 발음 대상
  chordGroups: ChordGroupItem[]; // STEP 03-A: 동일 시점 화음 그룹 배열
  hasChords: boolean; // STEP 03-A: 화음 포함 여부
  totalPlayableNotes: number;
  totalBeats: number;
  musicalEndBeat: number;
  audibleEndBeat: number; // 마지막 음표 서스테인 및 여운(+2.0박) 포함
  musicalDurationSeconds: number;
  audibleDurationSeconds: number;
}

export const INITIAL_LEAD_IN_BEATS = -2.0;

/**
 * 곡 데이터와 속도 배율을 받아 완벽하게 일치하는 단일 기준 타임라인을 계산합니다.
 */
export function calculateSongTimeline(
  song: Readonly<Song>,
  speedPercent: number = 100,
  leadInBeats: number = INITIAL_LEAD_IN_BEATS
): SongTimingTimeline {
  const speedMultiplier = Math.max(0.1, speedPercent / 100);
  const beatDurationSeconds = (60 / Math.max(1, song.tempoBpm)) * (1 / speedMultiplier);
  const initialLeadInSeconds = Math.abs(leadInBeats) * beatDurationSeconds;

  let currentBeat = 0.0;
  let lastNoteStartBeat = 0.0;
  let maxDurationInCurrentBeat = 0.0;
  const items: TimedNoteItem[] = [];
  const playableItems: TimedNoteItem[] = [];

  song.notes.forEach((note: KalimbaNote, idx: number) => {
    const isRest = Boolean(note.isRest || note.pitch === 'REST' || note.pitch === '0');
    const isSimultaneous = Boolean(note.isSimultaneousWithPrevious && idx > 0);

    let startBeat: number;
    const durationBeats = Math.max(0.01, note.duration || 1);

    if (isSimultaneous) {
      // 이전 음과 동시 시작: currentBeat를 증가시키지 않고 이전 시작 비트 공유
      startBeat = lastNoteStartBeat;
      maxDurationInCurrentBeat = Math.max(maxDurationInCurrentBeat, durationBeats);
    } else {
      // 새로운 시점: 이전 화음 묶음의 최대 duration만큼 currentBeat 전진
      if (idx > 0) {
        currentBeat += maxDurationInCurrentBeat;
      }
      startBeat = currentBeat;
      lastNoteStartBeat = startBeat;
      maxDurationInCurrentBeat = durationBeats;
    }

    const endBeat = startBeat + durationBeats;
    const startSeconds = startBeat * beatDurationSeconds;
    const endSeconds = endBeat * beatDurationSeconds;

    const key = PITCH_TO_KEY.get(note.pitch);
    const keyIndex = key ? key.index : 8;

    let color: 'orange' | 'green' | 'blue' | 'teal' = 'orange';
    if (note.pitch.startsWith('E')) {
      color = 'green';
    } else if (note.pitch.startsWith('G') || note.pitch.startsWith('B')) {
      color = 'blue';
    } else if (note.pitch.startsWith('F')) {
      color = 'teal';
    } else {
      color = 'orange';
    }

    const timeSig = song.timeSignature || '4/4';
    const measureBeats = timeSig === '3/4' ? 3.0 : timeSig === '2/4' ? 2.0 : timeSig === '6/8' ? 3.0 : 4.0;
    const beatInMeasure = Math.round((startBeat % measureBeats) * 100) / 100;
    const dynamicAccent = calculateDynamicAccent(beatInMeasure, timeSig);

    // 기본 손 배정: note.hand가 있으면 그것을 사용, 없으면 키의 물리적 위치(0~7: left, 8: center, 9~16: right) 기준
    const hand: KalimbaHand = note.hand || (key ? key.hand : 'center');

    const item: TimedNoteItem = {
      id: `${song.id}-note-${idx}-${note.pitch}`,
      originalIndex: idx,
      playableIndex: isRest ? -1 : playableItems.length,
      noteIndex: isRest ? -1 : playableItems.length,
      pitch: note.pitch,
      numberNotation: key ? key.numberNotation : '1',
      keyIndex,
      startBeat,
      beatTime: startBeat,
      durationBeats,
      duration: durationBeats,
      endBeat,
      startSeconds,
      endSeconds,
      isRest,
      color,
      lyric: note.lyric,
      beatInMeasure,
      dynamicAccent,
      hand,
      chordId: note.chordId,
      isChord: isSimultaneous,
      isChordSecondary: isSimultaneous,
    };

    items.push(item);
    if (!isRest) {
      playableItems.push(item);
    }
  });

  // 마지막 음표 묶음의 duration 반영
  if (song.notes.length > 0) {
    currentBeat += maxDurationInCurrentBeat;
  }

  // STEP 03-A: 동일 startBeat를 갖는 음표들을 묶어 ChordGroupItem 생성
  const beatGroupMap = new Map<number, TimedNoteItem[]>();
  playableItems.forEach((item) => {
    const roundedBeat = Math.round(item.startBeat * 1000) / 1000;
    const group = beatGroupMap.get(roundedBeat) || [];
    group.push(item);
    beatGroupMap.set(roundedBeat, group);
  });

  const chordGroups: ChordGroupItem[] = [];
  let hasChords = false;

  beatGroupMap.forEach((notesInBeat, beat) => {
    if (notesInBeat.length >= 2) {
      hasChords = true;
      const groupChordId = notesInBeat[0].chordId || `chord-${song.id}-${beat}`;
      const pitches = notesInBeat.map((n) => n.pitch);
      const keyIndexes = notesInBeat.map((n) => n.keyIndex);
      const assignedHands = notesInBeat.map((n) => n.hand);
      const hasLeft = assignedHands.includes('left');
      const hasRight = assignedHands.includes('right');

      notesInBeat.forEach((n) => {
        n.isChord = true;
        n.chordId = groupChordId;
        n.chordPartnerPitches = pitches.filter((p) => p !== n.pitch);
      });

      chordGroups.push({
        chordId: groupChordId,
        startBeat: beat,
        durationBeats: Math.max(...notesInBeat.map((n) => n.durationBeats)),
        startSeconds: beat * beatDurationSeconds,
        endSeconds: (beat + Math.max(...notesInBeat.map((n) => n.durationBeats))) * beatDurationSeconds,
        notes: notesInBeat,
        pitches,
        keyIndexes,
        isTwoHanded: hasLeft && hasRight,
        assignedHands,
        chordName: `${pitches.join('·')} 화음`,
      });
    }
  });

  const totalBeats = Math.round(currentBeat * 100) / 100;
  const musicalEndBeat = totalBeats;

  // 마지막 음표의 길이를 고려한 여운 및 완주 대기 박자 (최소 2박 또는 마지막 음 길이 + 1박)
  const lastPlayable = playableItems[playableItems.length - 1];
  const tailSustainBeats = lastPlayable ? Math.max(2.0, lastPlayable.durationBeats + 1.0) : 2.0;
  const audibleEndBeat = musicalEndBeat + tailSustainBeats;

  const musicalDurationSeconds = Math.round(musicalEndBeat * beatDurationSeconds * 10) / 10;
  const audibleDurationSeconds = Math.round(audibleEndBeat * beatDurationSeconds * 10) / 10;

  return {
    songId: song.id,
    tempoBpm: song.tempoBpm,
    speedPercent,
    speedMultiplier,
    beatDurationSeconds,
    initialLeadInBeats: leadInBeats,
    initialLeadInSeconds,
    items,
    playableItems,
    chordGroups,
    hasChords,
    totalPlayableNotes: playableItems.length,
    totalBeats,
    musicalEndBeat,
    audibleEndBeat,
    musicalDurationSeconds,
    audibleDurationSeconds,
  };
}
