import { Song } from '../types/music';
import { parseSimpleNotation } from '../utils/noteParser';

export function makeHymnSong(
  id: string,
  hymnNumber: number | undefined,
  title: string,
  subTitle: string,
  description: string,
  tempoBpm: number,
  timeSignature: '4/4' | '3/4' | '2/4' | '6/8',
  recommendedHandHint: string,
  tags: string[],
  rawNotation: string,
  isCustom: boolean = false
): Song {
  return {
    id,
    hymnNumber,
    title,
    subTitle,
    level: 'hymn',
    levelLabel: '찬송가',
    description,
    estimatedMinutes: 4,
    timeSignature,
    tempoBpm,
    recommendedHandHint,
    tags,
    rawNotation,
    isCustom,
    notes: parseSimpleNotation(rawNotation),
  };
}

export const DEFAULT_HYMN_SONGS: Song[] = [
  makeHymnSong(
    'hymn-305',
    305,
    '나 같은 죄인 살리신',
    '새찬송가 305장 (Amazing Grace)',
    '전 세계에서 가장 사랑받는 은혜로운 찬송가로, 칼림바의 맑고 깊은 5음계 울림이 마음을 평안하게 합니다.',
    72,
    '3/4',
    '솔(5)-도\'(1\')-미\'(3\')-도\'(1\')-미\'(3\')로 이어지는 따뜻한 3박자 호흡을 느껴보세요.',
    ['새찬송가 305장', 'Amazing Grace', '대표 찬송가'],
    '5 1\'- 3\' 1\' | 3\'- 2\' | 1\'- 6 | 5-- | 5 1\'- 3\' 1\' | 3\'- 2\' | 5\'-- | 5\'-- | 3\' 5\'- 3\' 5\' | 3\' 1\'- 5 | 6 1\'- 1\' 6 | 5-- | 5 1\'- 3\' 1\' | 3\'- 2\' | 1\'--'
  ),
  makeHymnSong(
    'hymn-79',
    79,
    '주 하나님 지으신 모든 세계',
    '새찬송가 79장 (How Great Thou Art)',
    '창조주 하나님의 광대하심을 찬양하는 웅장하고 아름다운 찬송가입니다.',
    74,
    '4/4',
    '후렴구 "주님의 높고 위대하심을"에서 높은 미(3\')와 솔(5\')을 힘차게 울려주세요.',
    ['새찬송가 79장', '창조 찬양'],
    '5 5 5 3 | 5 5 5 6 | 6 4 6- | 6 6 6 5 | 3 5 5 4 | 4 3- | 5 5 1\' 3\' | 2\'- 1\' 7 | 6 5- | 5 5 1\' 3\' | 4\'- 2\' 7 | 1\' 2\' 3\'- | 2\'- 1\'-'
  ),
  makeHymnSong(
    'hymn-8',
    8,
    '거룩 거룩 거룩 전능하신 주님',
    '새찬송가 8장 (Holy, Holy, Holy)',
    '예배를 여는 가장 경건하고 장엄한 찬송가로, 도-미-솔-도\' 화음 진행이 돋보입니다.',
    76,
    '4/4',
    '도(1)-도(1)-미(3)-미(3)-솔(5)-솔(5) 계단을 또렷하고 경건하게 튕겨보세요.',
    ['새찬송가 8장', '경배와 찬양'],
    '1 1 3 3 | 5- 5- | 6 6 6 6 | 5- 3- | 5 5 5 5 | 1\'- 7- | 6 3 5 4 | 5- - 0 | 1 1 3 3 | 5- 5- | 6 6 6 6 | 5- 5- | 1\'- 5 5 | 6- 3- | 4 2 2 7 | 1- - 0'
  ),
  makeHymnSong(
    'hymn-563',
    563,
    '예수 사랑하심은',
    '새찬송가 563장 (Jesus Loves Me)',
    '어린이부터 어른까지 누구나 쉽게 따라 연주할 수 있는 가장 따뜻하고 친숙한 찬송가입니다.',
    78,
    '4/4',
    '솔-미-미-레-미-솔-솔, 5음계 위주의 쉬운 건반으로 구성되어 있어요.',
    ['새찬송가 563장', '어린이 찬송'],
    '5 3 3 2 | 3 5 5- | 6 6 1\' 6 | 6 5 5- | 5 3 3 2 | 3 5 5- | 6 6 5 1 | 3 2 1- | 5- 3 5 | 6 1\'- | 5- 3 1 | 3 2- | 5- 3 5 | 6 1\' 6 | 5 1 3 2 | 1- - 0'
  ),
  makeHymnSong(
    'hymn-478',
    478,
    '참 아름다워라',
    '새찬송가 478장 (This Is My Father\'s World)',
    '하나님이 지으신 아름다운 자연 세계를 노래하는 맑고 서정적인 찬송가입니다.',
    76,
    '4/4',
    '도-레-미-솔-미-도, 자연스럽게 흐르는 선율을 부드럽게 이어가세요.',
    ['새찬송가 478장', '자연과 은혜'],
    '1 2 3 5 | 3 2 1- | 6 5 3 1 | 2- - 0 | 5 1\'- 7 6 | 5 6 5 3 | 4 3 2 1 | 1- - 0'
  ),
  makeHymnSong(
    'hymn-338',
    338,
    '내 주를 가까이 하게 함은',
    '새찬송가 338장 (Nearer, My God, to Thee)',
    '고난 속에서도 주님께 더 가까이 나아가기를 소망하는 깊은 영성의 찬송가입니다.',
    70,
    '4/4',
    '느리고 경건한 호흡으로 한 음 한 음 기도를 담아 튕겨보세요.',
    ['새찬송가 338장', '기도와 헌신'],
    '3- 2- | 1- 6 | 6- 5- | 5-- 0 | 1- 3- | 2- - 0 | 3- 2- | 1- 6 | 6- 5 3 | 2- 1- | 1-- 0'
  ),
  makeHymnSong(
    'hymn-1',
    1,
    '만복의 근원 하나님',
    '새찬송가 1장 (송영)',
    '새찬송가의 첫 장을 여는 송영으로, 단정하고 힘찬 4분음표 진행이 특징입니다.',
    76,
    '4/4',
    '모든 음이 균일한 박자와 크기로 울리도록 안정감 있게 타건하세요.',
    ['새찬송가 1장', '송영'],
    '1 1 7 6 | 5 1\' 2\' 3\' | 3\' 3\' 3\' 2\' | 1\' 4\' 3\' 2\' | 1\' 2\' 3\' 2\' | 1\' 6 7 1\' | 5\' 3\' 1\' 2\' | 4\' 3\' 2\' 1\''
  ),
  makeHymnSong(
    'hymn-288',
    288,
    '예수로 나의 구주 삼고',
    '새찬송가 288장 (Blessed Assurance)',
    '구원의 기쁨과 간증이 넘치는 경쾌한 9/8(3/4)박자 애창 찬송가입니다.',
    80,
    '3/4',
    '3박자 왈츠 리듬을 타며 "이것이 나의 간증이요" 후렴을 밝게 연주해 보세요.',
    ['새찬송가 288장', '간증과 기쁨'],
    '3 2 1 | 5- 5 | 4 5 6 | 5-- | 5 3 5 | 1\'- 7 | 7 6 5 | 6-- | 3 2 1 | 5- 5 | 4 5 6 | 5-- | 1 2 3 | 4 2 7 | 1--'
  ),
  makeHymnSong(
    'hymn-369',
    369,
    '죄에서 자유를 얻게 함은',
    '새찬송가 369장 (There Is Power in the Blood)',
    '보혈의 능력을 힘차게 찬양하는 밝고 리드미컬한 복음 찬송가입니다.',
    84,
    '4/4',
    '도-미-솔-솔, 라-솔-솔-미로 이어지는 경쾌한 리듬을 살려보세요.',
    ['새찬송가 369장', '보혈과 능력'],
    '1 3 5 5 | 6 5 5 3 | 2 2 2 3 | 4 3 1- | 1 3 5 5 | 6 5 5 3 | 2 5 5 7 | 1\'- - 0'
  ),
  makeHymnSong(
    'hymn-438',
    438,
    '내 영혼이 은총 입어',
    '새찬송가 438장 (태산을 넘어 험곡에 가도)',
    '초막이나 궁궐이나 주 예수와 동행하는 하늘나라의 기쁨을 노래합니다.',
    82,
    '4/4',
    '밝고 희망찬 느낌으로 오른손과 왼손을 경쾌하게 번갈아 튕겨요.',
    ['새찬송가 438장', '동행과 천국'],
    '5 5 6 5 | 3 1 1- | 2 2 1 2 | 3- - 0 | 5 5 6 5 | 3 1 1- | 2 3 2 1 | 1- - 0 | 5 1\' 1\' 1\' | 7 6 6- | 6 2\' 2\' 2\' | 1\' 7 5- | 5 1\' 1\' 1\' | 6 4 3 1 | 2 5 3 2 | 1- - 0'
  ),
  makeHymnSong(
    'hymn-412',
    412,
    '내 영혼의 그윽히 깊은 데서',
    '새찬송가 412장 (평화 평화로다)',
    '마음 깊은 곳에 하늘의 평화가 넘쳐흐르는 감동적인 찬송가입니다.',
    76,
    '4/4',
    '"평화 평화로다" 후렴의 높은 미(3\')-레(2\')-도(1\') 라인을 맑게 울려주세요.',
    ['새찬송가 412장', '하늘의 평화'],
    '3 4 5 5 | 6 5 1\'- | 2\' 1\' 6 1\' | 5- - 0 | 3\' 2\' 1\'- | 6 1\' 5- | 3 5 2 3 | 1- - 0'
  ),
  makeHymnSong(
    'hymn-430',
    430,
    '주와 같이 길 가는 것',
    '새찬송가 430장 (징검다리 찬송)',
    '주님과 한 걸음씩 동행하는 기쁨을 차분하고 다정한 걸음걸이 리듬으로 표현합니다.',
    78,
    '4/4',
    '한 걸음 한 걸음 걷듯이 4분음표 박자를 또박또박 지켜주세요.',
    ['새찬송가 430장', '주님과 동행'],
    '5 3 2 1 | 1\' 7 6 5 | 5 2 3 4 | 3- - 0 | 5 3 2 1 | 1\' 7 6 5 | 6 5 7 2\' | 1\'- - 0'
  ),
  makeHymnSong(
    'hymn-559',
    559,
    '사철에 봄바람 불어 잇고',
    '새찬송가 559장 (가정 예배 대표 찬송)',
    '온 가족이 모여 가정 예배를 드릴 때 가장 많이 부르는 은혜로운 찬송가입니다.',
    76,
    '4/4',
    '온 가족이 함께 노래 부르며 칼림바로 반주해 보세요!',
    ['새찬송가 559장', '믿음의 가정'],
    '3 5 6 5 | 3 2 1- | 2 2 3 5 | 6- 5- | 1\' 1\' 6 1\' | 5 3 1- | 2 3 5 2 | 1- - 0'
  ),
  makeHymnSong(
    'hymn-370',
    370,
    '주 안에 있는 나에게',
    '새찬송가 370장 (딴 근심 있으랴)',
    '두려움과 근심을 물리치고 주님을 찬송하게 하는 소망의 찬송가입니다.',
    78,
    '3/4',
    '3박자 리듬의 첫 박을 든든하게 짚어주며 "주님을 찬송하면서" 후렴으로 이어가세요.',
    ['새찬송가 370장', '소망과 찬송'],
    '5 5 4 | 3- 2 | 1- 5 | 6-- | 6 2\' 1\' | 7- 6 | 5-- | 5-- | 5 1\' 2\' | 3\'- 2\' | 1\'- 6 | 5-- | 3 5 3 | 2- 1 | 1--'
  ),
  makeHymnSong(
    'hymn-413',
    413,
    '내 평생에 가는 길',
    '새찬송가 413장 (It Is Well with My Soul)',
    '어떤 형편에서도 "내 영혼 평안해"라고 고백하는 깊이 있는 명곡 찬송가입니다.',
    72,
    '4/4',
    '점음표와 긴 음표가 많으니 칼림바의 잔향이 맑게 퍼지도록 여유 있게 타건해요.',
    ['새찬송가 413장', '내 영혼 평안해'],
    '5- 5 4 | 3- 3 2 | 3 4 6 5 | 4 3- | 3- 6 7 | 1\'- 7 6 | 5 6 5- | 5- 5- | 1\'- - 0 | 7- 7- | 1\'- - 0'
  ),
  makeHymnSong(
    'hymn-310',
    310,
    '아 하나님의 은혜로',
    '새찬송가 310장 (I Know Whom I Have Believed)',
    '구원의 은혜와 확신을 고백하는 한국 성도들의 대표적인 애창 찬송가입니다.',
    76,
    '4/4',
    '"내가 믿고 또 의지함은" 후렴에서 높은 도(1\')와 레(2\')를 힘있게 연주하세요.',
    ['새찬송가 310장', '은혜와 확신'],
    '1 3 5 5 | 6 5 3- | 1 2 2 1 | 3 5- | 1 3 5 5 | 6 5 3- | 2 5 4 2 | 1- - 0 | 5 1\' 1\' 7 | 1\' 2\' 6- | 6 7 7 6 | 7 1\' 5- | 5 1\' 1\' 7 | 1\' 6 5 3 | 2 5 4 2 | 1- - 0'
  ),
  makeHymnSong(
    'hymn-301',
    301,
    '지금까지 지내온 것',
    '새찬송가 301장 (주의 크신 은혜라)',
    '지나온 모든 순간이 하나님의 은혜임을 고백하는 감사의 찬송가입니다.',
    74,
    '3/4',
    '차분한 3/4박자 흐름에 맞춰 감사의 마음으로 부드럽게 연주해요.',
    ['새찬송가 301장', '감사와 은혜'],
    '3 5 5 | 6 5 3 | 1 2 3 | 2-- | 3 5 5 | 6 1\' 6 | 5-- | 5-- | 1\' 3\' 2\' | 1\'- 6 | 5 6 5 | 3- 1 | 2 3 5 | 2- 1 | 1--'
  ),
  makeHymnSong(
    'hymn-588',
    588,
    '공중 나는 새를 보라',
    '새찬송가 588장 (어린이·주일학교 찬송)',
    '공중의 새와 들의 백합화를 돌보시는 하나님의 사랑을 노래하는 밝은 찬송가입니다.',
    82,
    '4/4',
    '어린이들이 따라 부르기 쉬운 순차 진행 멜로디로 되어 있어요.',
    ['새찬송가 588장', '주일학교'],
    '1 2 3 5 | 6 5 3- | 4 3 2 1 | 2- - 0 | 1 2 3 5 | 1\' 6 5- | 4 3 2 5 | 1- - 0'
  ),
  makeHymnSong(
    'hymn-365',
    365,
    '마음속에 근심 있는 사람',
    '새찬송가 365장 (주 예수 앞에 다 아뢰어라)',
    '위로와 격려가 필요할 때 조용히 칼림바로 연주하면 큰 힘이 되는 찬송가입니다.',
    74,
    '4/4',
    '부드럽고 따뜻한 터치로 위로를 전하듯 연주해 보세요.',
    ['새찬송가 365장', '위로와 기도'],
    '3 5 5 6 | 5 3 1- | 2 3 4 6 | 5- - 0 | 1\' 7 6 5 | 6 5 3- | 2 5 4 2 | 1- - 0'
  ),
  makeHymnSong(
    'hymn-ccm-1',
    undefined,
    '당신은 사랑받기 위해 태어난 사람',
    '축복과 사랑의 대표 복음성가 (CCM)',
    '생일이나 축복의 자리에서 서로를 축복하며 연주하기 가장 좋은 찬양입니다.',
    76,
    '4/4',
    '3-5-1\'-7-6-5로 이어지는 따뜻한 축복의 선율을 선물해 보세요!',
    ['축복 찬양', '대표 복음성가'],
    '3 5 1\' 1\' | 7 5 6- | 4 6 2\' 2\' | 1\' 6 5- | 3 5 1\' 1\' | 3\' 2\' 1\' 6 | 4 6 5 7 | 1\'- - 0'
  ),
];

const CUSTOM_HYMNS_STORAGE_KEY = 'kalimba_custom_hymns_v1';

interface StoredHymnData {
  id: string;
  hymnNumber?: number;
  title: string;
  subTitle: string;
  description: string;
  tempoBpm: number;
  timeSignature: '4/4' | '3/4' | '2/4' | '6/8';
  recommendedHandHint: string;
  tags: string[];
  rawNotation: string;
  isCustom?: boolean;
  isDeleted?: boolean;
}

/**
 * 로컬 스토리지에 저장된 찬송가 업데이트/추가 내역을 불러와 기본 찬송가 목록과 병합합니다.
 */
export function loadAllHymns(): Song[] {
  try {
    const raw = localStorage.getItem(CUSTOM_HYMNS_STORAGE_KEY);
    if (!raw) return DEFAULT_HYMN_SONGS;

    const storedList: StoredHymnData[] = JSON.parse(raw);
    if (!Array.isArray(storedList)) return DEFAULT_HYMN_SONGS;

    const overrideMap = new Map<string, StoredHymnData>();
    storedList.forEach((item) => {
      if (item && item.id) {
        overrideMap.set(item.id, item);
      }
    });

    const result: Song[] = [];

    // 1. 기본 찬송가 반영 (수정되었으면 수정본 사용, 삭제되었으면 제외)
    for (const defSong of DEFAULT_HYMN_SONGS) {
      const override = overrideMap.get(defSong.id);
      if (override) {
        overrideMap.delete(defSong.id);
        if (override.isDeleted) continue;
        result.push(
          makeHymnSong(
            override.id,
            override.hymnNumber,
            override.title,
            override.subTitle,
            override.description,
            override.tempoBpm || 76,
            override.timeSignature || '4/4',
            override.recommendedHandHint || '마음을 담아 은혜롭게 연주해 보세요.',
            override.tags || ['찬송가'],
            override.rawNotation,
            Boolean(override.isCustom)
          )
        );
      } else {
        result.push(defSong);
      }
    }

    // 2. 사용자가 새로 추가한 찬송가들을 맨 앞 또는 뒤에 추가 (최신 추가분이 잘 보이도록 앞에 배치)
    const customAdded: Song[] = [];
    overrideMap.forEach((custom) => {
      if (!custom.isDeleted && custom.rawNotation) {
        customAdded.push(
          makeHymnSong(
            custom.id,
            custom.hymnNumber,
            custom.title,
            custom.subTitle,
            custom.description,
            custom.tempoBpm || 76,
            custom.timeSignature || '4/4',
            custom.recommendedHandHint || '마음을 담아 은혜롭게 연주해 보세요.',
            custom.tags || ['사용자 추가 찬송가'],
            custom.rawNotation,
            true
          )
        );
      }
    });

    return [...customAdded, ...result];
  } catch (e) {
    console.warn('Failed to load custom hymns', e);
    return DEFAULT_HYMN_SONGS;
  }
}

/**
 * 새 찬송가를 추가하거나 기존 찬송가를 업데이트(수정)합니다.
 */
export function saveOrUpdateHymn(hymnData: {
  id?: string;
  hymnNumber?: number;
  title: string;
  subTitle?: string;
  description?: string;
  tempoBpm: number;
  timeSignature?: '4/4' | '3/4' | '2/4' | '6/8';
  recommendedHandHint?: string;
  tags?: string[];
  rawNotation: string;
}): Song[] {
  try {
    const raw = localStorage.getItem(CUSTOM_HYMNS_STORAGE_KEY);
    const storedList: StoredHymnData[] = raw ? JSON.parse(raw) : [];

    const isDefaultId = DEFAULT_HYMN_SONGS.some((s) => s.id === hymnData.id);
    const targetId = hymnData.id || `hymn-custom-${Date.now()}`;

    const entry: StoredHymnData = {
      id: targetId,
      hymnNumber: hymnData.hymnNumber,
      title: hymnData.title.trim(),
      subTitle:
        hymnData.subTitle?.trim() ||
        (hymnData.hymnNumber ? `새찬송가 ${hymnData.hymnNumber}장` : '은혜로운 찬양'),
      description:
        hymnData.description?.trim() ||
        '직접 업데이트한 칼림바 찬송가 악보입니다.',
      tempoBpm: hymnData.tempoBpm || 76,
      timeSignature: hymnData.timeSignature || '4/4',
      recommendedHandHint:
        hymnData.recommendedHandHint?.trim() ||
        '가사를 묵상하며 한 음 한 음 정성껏 튕겨보세요.',
      tags: hymnData.tags && hymnData.tags.length > 0
        ? hymnData.tags
        : [hymnData.hymnNumber ? `새찬송가 ${hymnData.hymnNumber}장` : '찬송가 업데이트'],
      rawNotation: hymnData.rawNotation.trim(),
      isCustom: !isDefaultId,
    };

    const existingIdx = storedList.findIndex((item) => item.id === targetId);
    if (existingIdx >= 0) {
      storedList[existingIdx] = entry;
    } else {
      storedList.push(entry);
    }

    localStorage.setItem(CUSTOM_HYMNS_STORAGE_KEY, JSON.stringify(storedList));
  } catch (e) {
    console.warn('Failed to save custom hymn', e);
  }

  return loadAllHymns();
}

/**
 * 사용자 찬송가를 삭제하거나 기본 찬송가 수정본을 원래대로 되돌립니다.
 */
export function deleteOrResetHymn(id: string): Song[] {
  try {
    const raw = localStorage.getItem(CUSTOM_HYMNS_STORAGE_KEY);
    if (!raw) return loadAllHymns();
    const storedList: StoredHymnData[] = JSON.parse(raw);
    const filtered = storedList.filter((item) => item.id !== id);
    localStorage.setItem(CUSTOM_HYMNS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to delete custom hymn', e);
  }
  return loadAllHymns();
}
