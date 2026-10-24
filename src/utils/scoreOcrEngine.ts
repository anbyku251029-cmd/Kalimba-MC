/**
 * scoreOcrEngine.ts
 * Kalimba-MC STEP 02-D: 악보 이미지 검증, Canvas 오선 검출 및 음표 데이터 파이프라인
 */

import {
  ExtractedNote,
  ScoreOcrSession,
  DetectedStaffSystem,
} from '../types/scoreOcrTypes';
import { PITCH_TO_KEY, KALIMBA_KEYS } from '../constants/kalimbaKeys';
import { parseSimpleNotation } from './noteParser';

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
export const MAX_IMAGE_DIMENSION = 4096; // 4096px
export const SUPPORTED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
]);

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  width?: number;
  height?: number;
}

/**
 * 업로드된 이미지 파일의 MIME 타입, 크기, 해상도 및 무결성을 검증합니다.
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  // 1. 파일 크기 검사
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `파일 크기가 너무 큽니다 (${sizeMb}MB). 15MB 이하의 악보 이미지를 선택해 주세요.`,
    };
  }

  // 2. MIME 타입 검사
  if (!SUPPORTED_MIME_TYPES.has(file.type.toLowerCase())) {
    return {
      valid: false,
      error: '지원하지 않는 파일 형식입니다. PNG, JPG 또는 WebP 이미지를 선택해 주세요.',
    };
  }

  // 3. 브라우저 이미지 디코딩 및 해상도 검사
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      URL.revokeObjectURL(objectUrl);

      if (width === 0 || height === 0) {
        resolve({
          valid: false,
          error: '이미지를 읽을 수 없습니다. 파일이 손상되지 않았는지 확인해 주세요.',
        });
        return;
      }

      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        resolve({
          valid: false,
          error: `이미지 해상도(${width}x${height})가 너무 큽니다. 가로·세로 4096px 이하의 이미지를 올려주세요.`,
        });
        return;
      }

      resolve({ valid: true, width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        error: '이미지 디코딩에 실패했습니다. 올바른 이미지 파일인지 확인해 주세요.',
      });
    };

    img.src = objectUrl;
  });
}

/**
 * 브라우저 Canvas를 활용하여 이미지에서 오선(5줄 Staff Line) 패턴을 분석합니다.
 * 수평 투영(Horizontal Projection)을 통해 검은 픽셀이 집중된 수평선 피크를 탐색합니다.
 */
export async function analyzeStaffLines(
  imageSource: HTMLImageElement | string
): Promise<{ detectedStaffs: DetectedStaffSystem[]; isOmrConfident: boolean }> {
  return new Promise((resolve) => {
    const img = typeof imageSource === 'string' ? new Image() : imageSource;

    const runAnalysis = (imageEl: HTMLImageElement) => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve({ detectedStaffs: [], isOmrConfident: false });
          return;
        }

        // 연산 속도를 위해 가로 800px 기준으로 리스케일링
        const targetWidth = Math.min(800, imageEl.naturalWidth || imageEl.width);
        const scale = targetWidth / (imageEl.naturalWidth || imageEl.width);
        const targetHeight = Math.round((imageEl.naturalHeight || imageEl.height) * scale);

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.drawImage(imageEl, 0, 0, targetWidth, targetHeight);

        const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
        const data = imgData.data;

        // 수평 투영 배열 (각 y 좌표별 어두운 픽셀 수 카운트)
        const rowDarkness = new Float32Array(targetHeight);
        const threshold = 140; // 흑백 이진화 임계값

        for (let y = 0; y < targetHeight; y++) {
          let darkCount = 0;
          for (let x = 0; x < targetWidth; x++) {
            const idx = (y * targetWidth + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            if (brightness < threshold) {
              darkCount++;
            }
          }
          // 전체 가로 폭의 35% 이상이 어두운 선이면 오선 후보선으로 감지
          rowDarkness[y] = darkCount / targetWidth;
        }

        // 피크 검출
        const candidateLineY: number[] = [];
        for (let y = 2; y < targetHeight - 2; y++) {
          const val = rowDarkness[y];
          if (
            val > 0.35 &&
            val > rowDarkness[y - 1] &&
            val > rowDarkness[y - 2] &&
            val >= rowDarkness[y + 1] &&
            val >= rowDarkness[y + 2]
          ) {
            candidateLineY.push(Math.round(y / scale)); // 원본 해상도 y로 환원
          }
        }

        // 5개 단위의 오선 묶음(Staff System) 클러스터링
        const detectedStaffs: DetectedStaffSystem[] = [];
        let currentGroup: number[] = [];

        for (let i = 0; i < candidateLineY.length; i++) {
          const y = candidateLineY[i];
          if (currentGroup.length === 0) {
            currentGroup.push(y);
          } else {
            const prevY = currentGroup[currentGroup.length - 1];
            const diff = y - prevY;
            // 오선 간격은 대개 8px ~ 45px 사이
            if (diff >= 6 && diff <= 55) {
              currentGroup.push(y);
              if (currentGroup.length === 5) {
                const spacing = (currentGroup[4] - currentGroup[0]) / 4;
                detectedStaffs.push({
                  id: `staff_${detectedStaffs.length + 1}`,
                  yTop: currentGroup[0],
                  yBottom: currentGroup[4],
                  lineSpacing: spacing,
                  lines: [...currentGroup],
                });
                currentGroup = [];
              }
            } else {
              currentGroup = [y];
            }
          }
        }

        const isOmrConfident = detectedStaffs.length >= 1;
        resolve({ detectedStaffs, isOmrConfident });
      } catch (err) {
        console.warn('Staff line detection failed', err);
        resolve({ detectedStaffs: [], isOmrConfident: false });
      }
    };

    if (typeof imageSource === 'string') {
      img.onload = () => runAnalysis(img);
      img.onerror = () => resolve({ detectedStaffs: [], isOmrConfident: false });
      img.src = imageSource;
    } else {
      if (imageSource.complete) {
        runAnalysis(imageSource);
      } else {
        imageSource.onload = () => runAnalysis(imageSource);
        imageSource.onerror = () => resolve({ detectedStaffs: [], isOmrConfident: false });
      }
    }
  });
}

/**
 * 초기 세션을 생성합니다.
 */
export function createScoreOcrSession(
  fileName: string,
  fileSize: number,
  mimeType: string,
  imageUrl: string,
  width: number,
  height: number
): ScoreOcrSession {
  const defaultTitle = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .trim() || '새로운 악보 연주';

  return {
    id: `ocr_session_${Date.now()}`,
    fileName,
    fileSize,
    mimeType,
    imageUrl,
    imageWidth: width,
    imageHeight: height,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'ANALYZING',
    statusMessage: '악보 이미지와 오선 패턴을 분석하는 중입니다...',
    detectedStaffSystems: [],
    notes: [],
    originalNotes: [],
    history: [],
    future: [],
    metadata: {
      title: defaultTitle,
      timeSignature: '4/4',
      tempoBpm: 80,
      difficulty: '보통',
    },
  };
}

/**
 * 추출된 ExtractedNote 배열을 기존 Kalimba-MC 숫자 악보(rawNotation) 텍스트로 인코딩합니다.
 */
export function notesToRawNotation(notes: ExtractedNote[]): string {
  if (!notes || notes.length === 0) return '';

  const parts: string[] = [];
  let currentMeasure = 1;

  notes.forEach((n, idx) => {
    if (idx > 0 && n.measureIndex > currentMeasure) {
      parts.push('|');
      currentMeasure = n.measureIndex;
    }

    let token = '';
    if (n.isRest || n.pitch === 'REST' || n.pitch === '0') {
      token = '0';
    } else {
      token = n.numberNotation || '1';
    }

    // 박자 표기 (예: duration 2 -> 1(2) 또는 1-)
    if (n.duration === 0.5) {
      token += '_';
    } else if (n.duration === 1.5) {
      token += '(1.5)';
    } else if (n.duration === 2) {
      token += '-';
    } else if (n.duration === 3) {
      token += '--';
    } else if (n.duration === 4) {
      token += '---';
    } else if (n.duration !== 1) {
      token += `(${n.duration})`;
    }

    if (n.lyric) {
      token += `/${n.lyric}`;
    }

    parts.push(token);
  });

  return parts.join(' ');
}

/**
 * 숫자 악보 문자열에서 ExtractedNote 배열을 복원합니다.
 */
export function rawNotationToExtractedNotes(rawText: string): ExtractedNote[] {
  const kalimbaNotes = parseSimpleNotation(rawText);
  let measure = 1;
  let beatInMeasure = 0;

  return kalimbaNotes.map((kn, idx) => {
    beatInMeasure += kn.duration || 1;
    if (beatInMeasure > 4.0) {
      measure++;
      beatInMeasure = kn.duration || 1;
    }

    return {
      id: `ext_note_${idx + 1}`,
      order: idx + 1,
      pitch: kn.pitch,
      solfege: kn.solfege,
      octaveLevel: kn.octaveLevel,
      numberNotation: kn.numberNotation,
      duration: kn.duration || 1,
      isRest: Boolean(kn.isRest),
      measureIndex: measure,
      lyric: kn.lyric,
      userModified: false,
    };
  });
}
