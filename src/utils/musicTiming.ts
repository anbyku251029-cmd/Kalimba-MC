import { Song, KalimbaNote } from '../types/music';
import { PITCH_TO_KEY } from '../constants/kalimbaKeys';
import { calculateDynamicAccent } from './audioEngine';

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
  const items: TimedNoteItem[] = [];
  const playableItems: TimedNoteItem[] = [];

  song.notes.forEach((note: KalimbaNote, idx: number) => {
    const isRest = Boolean(note.isRest || note.pitch === 'REST' || note.pitch === '0');
    const startBeat = currentBeat;
    const durationBeats = Math.max(0.01, note.duration || 1);
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
    };

    items.push(item);
    if (!isRest) {
      playableItems.push(item);
    }

    currentBeat += durationBeats;
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
    totalPlayableNotes: playableItems.length,
    totalBeats,
    musicalEndBeat,
    audibleEndBeat,
    musicalDurationSeconds,
    audibleDurationSeconds,
  };
}
