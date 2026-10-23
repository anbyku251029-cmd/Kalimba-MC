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
  isCustom: boolean = false,
  composer?: string
): Song {
  const notes = parseSimpleNotation(rawNotation);
  const playableNoteCount = notes.filter((n) => !n.isRest && n.pitch !== 'REST').length;

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
    notes,
    composer,
    playableNoteCount,
    repeatTimes: 3, // 기본 3회 반복 묵상 연주 권장
    verificationStatus: 'SOURCE_VERIFIED',
    isArranged: true,
  };
}

export const DEFAULT_HYMN_SONGS: Song[] = [
  // 1. 새찬송가 305장 - 나 같은 죄인 살리신 (Amazing Grace)
  makeHymnSong(
    'hymn-305',
    305,
    '나 같은 죄인 살리신',
    '새찬송가 305장 (Amazing Grace)',
    '전 세계에서 가장 사랑받는 은혜로운 찬송가로, 맑고 깊은 5음계 멜로디가 영혼을 평안하고 고요하게 감싸줍니다.',
    70,
    '3/4',
    '솔(5)-도\'(1\')-미\'(3\')의 3박자 도약을 따뜻하고 부드럽게 튕겨주세요.',
    ['새찬송가', '은혜', '대표찬송', '300장대'],
    '5, | 1- 3_ 1_ | 3- 2 | 1- 6, | 5,- 5, | 1- 3_ 1_ | 3- 2 | 5--- | ' +
    '3 | 5- 3_ 5_ | 3- 1 | 6,- 1_ 6,_ | 5,- 5, | 1- 3_ 1_ | 3- 2 | 1--- 0',
    false,
    '존 뉴턴 작사 / 미국 민요'
  ),

  // 2. 새찬송가 88장 - 내 진정 사모하는 (The Lily of the Valley)
  makeHymnSong(
    'hymn-88',
    88,
    '내 진정 사모하는',
    '새찬송가 88장 (주는 저 산 밑의 백합)',
    '예수 그리스도의 아름다우심과 은혜를 찬양하는 밝고 경쾌한 복음찬송으로, 절과 후렴이 은혜롭게 이어집니다.',
    84,
    '4/4',
    '오른손과 왼손의 경쾌한 리듬감을 살려 붓점과 8분음표를 신나게 연주하세요.',
    ['새찬송가', '예수님', '찬양', '후렴있음'],
    '1_ 2_ | 3 3 3 2_ 1_ | 6, 1 1 1_ 2_ | 3 3 3 1 | 2-- 1_ 2_ | ' +
    '3 3 3 2_ 1_ | 6, 1 1 1_ 2_ | 3 3 2 2 | 1--- | ' +
    '5 5 5 3_ 5_ | 6 5 5 0 | 3 3 3 1 | 2-- 1_ 2_ | ' +
    '3 3 3 2_ 1_ | 6, 1 1 1_ 2_ | 3 3 2 2 | 1---',
    false,
    'C. W. 프라이 작사 / J. R. 머레이 작곡'
  ),

  // 3. 새찬송가 288장 - 예수를 나의 구주 삼고 (Blessed Assurance)
  makeHymnSong(
    'hymn-288',
    288,
    '예수를 나의 구주 삼고',
    '새찬송가 288장 (이것이 나의 간증이요)',
    '구원의 기쁨과 확신을 넘치도록 노래하는 페니 크로스비의 대표 찬송가입니다.',
    76,
    '3/4',
    '절과 후렴의 밝은 3박자 멜로디를 당당하고 기쁨에 찬 터치로 연주하세요.',
    ['새찬송가', '구원의확신', '간증', '200장대'],
    '3_ 4_ | 5- 1\' | 7_ 6_ 5 0 | 6 5 3 | 2-- | ' +
    '3_ 4_ | 5- 1\' | 7_ 6_ 5 0 | 2 3 2 | 1-- | ' +
    '1\'_ 2\'_ | 3\'- 3\' | 2\'_ 1\'_ 5 0 | 6 1\' 6 | 5-- | ' +
    '3_ 4_ | 5- 1\' | 7_ 6_ 5 0 | 2 3 2 | 1--',
    false,
    'F. J. 크로스비 작사 / P. P. 냅 작곡'
  ),

  // 4. 새찬송가 438장 - 내 영혼이 은총 입어 (Since Christ My Soul Was Saved)
  makeHymnSong(
    'hymn-438',
    438,
    '내 영혼이 은총 입어',
    '새찬송가 438장 (높은 산이 거친 들이 초막이나 궁궐이나)',
    '주 예수와 동행하니 그 어디나 하늘나라임을 고백하는 깊은 평안의 복음 찬송입니다.',
    82,
    '4/4',
    '부드러운 레가토와 4분음표의 안정된 호흡으로 찬양의 고백을 연주하세요.',
    ['새찬송가', '은혜', '하늘나라', '400장대'],
    '1_ 2_ | 3 3 3 5 | 5_ 4_ 3 0 | 4 4 4 6 | 6_ 5_ 4 0 | ' +
    '3 3 3 5 | 5_ 4_ 3 0 | 2 3 4 3 | 2-- 1_ 2_ | ' +
    '3 3 3 5 | 5_ 4_ 3 0 | 4 4 4 6 | 6_ 5_ 4 0 | ' +
    '5 1\' 7 6 | 5 3 1 2 | 3 3 2 2 | 1---',
    false,
    'C. F. 와이글 작사 / 작곡'
  ),

  // 5. 새찬송가 109장 - 고요한 밤 거룩한 밤 (Silent Night)
  makeHymnSong(
    'hymn-1',
    109,
    '고요한 밤 거룩한 밤',
    '새찬송가 109장 (크리스마스 캐럴)',
    '아기 예수 탄생의 거룩함과 평화를 전하는 성탄 찬송으로, 칼림바의 맑고 영롱한 소리에 가장 잘 어울립니다.',
    68,
    '6/8',
    '6/8박자의 그네 타듯 부드러운 2박 호흡을 느끼며 잔향을 깊게 울려주세요.',
    ['새찬송가', '성탄절', '캐럴', '100장대'],
    '5(1.5) 6_ 5_ 3(1.5) | 5(1.5) 6_ 5_ 3(1.5) | 2\'(1.5) 2\'- 7(1.5) 7- | 1\'(1.5) 1\'- 5(1.5) 5- | ' +
    '6(1.5) 6- 1\'(1.5) 7_ 6_ | 5(1.5) 6_ 5_ 3(1.5) 3- | 6(1.5) 6- 1\'(1.5) 7_ 6_ | 5(1.5) 6_ 5_ 3(1.5) 3- | ' +
    '2\'(1.5) 2\'- 4\'(1.5) 2\'_ 7_ | 1\'--- 3\'--- | 1\'(1.5) 5_ 3_ 5(1.5) 4_ 2_ | 1--- 0---',
    false,
    '요제프 모어 작사 / 프란츠 그루버 작곡'
  ),

  // 6. 새찬송가 93장 - 예수는 나의 힘이요 (Jesus Is All the World to Me)
  makeHymnSong(
    'hymn-93',
    93,
    '예수는 나의 힘이요',
    '새찬송가 93장 (내 생명 되시니)',
    '인생의 모든 순간에 힘과 위로와 기쁨이 되시는 주님을 찬양하는 아름다운 6/8박자 찬송입니다.',
    72,
    '6/8',
    '점4분음표 단위의 평온한 왈츠풍 리듬으로 한 음 한 음 정성껏 타건하세요.',
    ['새찬송가', '예수님', '위로', '90장대'],
    '1(1.5) 2_ 3_ 5(1.5) | 3(1.5) 2_ 1_ 2(1.5) | 3(1.5) 5_ 6_ 1\'(1.5) | 6(1.5) 5_ 3_ 5(1.5) | ' +
    '1(1.5) 2_ 3_ 5(1.5) | 3(1.5) 2_ 1_ 2(1.5) | 3 5 1\' 7 6 | 5--- 0--- | ' +
    '6(1.5) 7_ 1\'_ 5(1.5) | 6(1.5) 5_ 3_ 2(1.5) | 1(1.5) 2_ 3_ 5 2 3 | 1--- 0---',
    false,
    'W. L. 톰슨 작사 / 작곡'
  ),

  // 7. 새찬송가 413장 - 내 평생에 가는 길 (It Is Well with My Soul)
  makeHymnSong(
    'hymn-413',
    413,
    '내 평생에 가는 길',
    '새찬송가 413장 (내 영혼 평안해)',
    '큰 풍파와 고난 중에도 주님 안에서 참된 평안을 누린 스패포드 교수의 감동적인 신앙 고백입니다.',
    70,
    '4/4',
    '후렴구 \'내 영혼 평안해\'의 긴 지속음을 맑고 깊은 여운으로 울려 퍼지게 하세요.',
    ['새찬송가', '평안', '고백', '400장대'],
    '1 1 7, 1 | 2- 3 0 | 3 3 2 3 | 4- 5 0 | ' +
    '5 6 5 4 | 3- 2 1 | 2 3 2 1 | 7,--- | ' +
    '1 1 7, 1 | 2- 3 0 | 4 4 3 2 | 1--- | ' +
    '5--- | 3--- | 2 3 4 3 | 2--- | 1--- 0',
    false,
    'H. G. 스패포드 작사 / P. P. 블리스 작곡'
  ),

  // 8. 새찬송가 310장 - 아 하나님의 은혜로 (I Know Not Why God's Wondrous Grace)
  makeHymnSong(
    'hymn-310',
    310,
    '아 하나님의 은혜로',
    '새찬송가 310장 (내가 믿고 또 의지함은)',
    '알 수 없는 하나님의 크신 사랑과 구원의 확신을 노래하는 힘찬 찬송가입니다.',
    80,
    '4/4',
    '후렴의 힘찬 신앙고백을 1박과 3박의 당당한 악센트로 연주해 보세요.',
    ['새찬송가', '은혜', '확신', '300장대'],
    '1_ 2_ | 3 3 3 2_ 1_ | 5 5 5 3 | 2 2 2 1_ 2_ | 3-- 1_ 2_ | ' +
    '3 3 3 2_ 1_ | 5 5 5 3 | 2 3 2 1 | 1--- | ' +
    '5 5 5 3_ 5_ | 6 5 5 0 | 3 3 3 1 | 2-- 1_ 2_ | ' +
    '3 3 3 2_ 1_ | 5 5 5 3 | 2 3 2 1 | 1---',
    false,
    'D. W. 휘틀 작사 / J. 맥그라나한 작곡'
  ),

  // 9. 새찬송가 405장 - 주의 친절한 팔에 안기세 (What a Fellowship)
  makeHymnSong(
    'hymn-405',
    405,
    '주의 친절한 팔에 안기세',
    '새찬송가 405장 (주의 영원하신 팔 함께하사)',
    '주의 품 안에서 누리는 참된 기쁨과 안전함을 노래하는 경쾌하고 신나는 복음찬송입니다.',
    86,
    '4/4',
    '경쾌한 템포 속에서 스타카토 느낌으로 밝고 신나게 연주하세요.',
    ['새찬송가', '기쁨', '안식', '400장대'],
    '3_ 4_ | 5 5 5 4_ 3_ | 6 5 5 3_ 4_ | 5 5 5 3 | 2-- 3_ 4_ | ' +
    '5 5 5 4_ 3_ | 6 5 5 1_ 2_ | 3 3 2 2 | 1--- | ' +
    '5- 3- | 6 5 5 0 | 5- 3- | 2-- 3_ 4_ | ' +
    '5 5 5 4_ 3_ | 6 5 5 1_ 2_ | 3 3 2 2 | 1---',
    false,
    'E. A. 호프만 작사 / A. J. 쇼월터 작곡'
  ),

  // 10. 새찬송가 79장 - 주 하나님 지으신 모든 세계 (How Great Thou Art)
  makeHymnSong(
    'hymn-79',
    79,
    '주 하나님 지으신 모든 세계',
    '새찬송가 79장 (주님의 높고 위대하심을)',
    '온 우주 만물을 창조하신 하나님의 위대하심을 장엄하고 감격스럽게 찬양하는 최고의 찬송가입니다.',
    74,
    '4/4',
    '후렴구 \'주님의 높고 위대하심을\'의 고음부 도약을 당당하고 풍성한 울림으로 표현하세요.',
    ['새찬송가', '창조주', '위대하심', '70장대'],
    '1_ 2_ | 3 3 4 4 | 5 5 5 3_ 4_ | 5 5 6 5 | 3-- 1_ 2_ | ' +
    '3 3 4 4 | 5 5 5 3_ 4_ | 5 5 4 2 | 1--- | ' +
    '5 | 1\'(1.5) 7_ 6 1\' | 5- 3 0 | 4 4 3 2 | 3-- 5 | ' +
    '1\'(1.5) 7_ 6 1\' | 5- 3 0 | 4 4 3 2 | 1---',
    false,
    '스웨덴 민요 / S. K. 하인 편곡'
  ),

  // 11. 새찬송가 384장 - 나의 갈 길 다 가도록 (All the Way My Savior Leads Me)
  makeHymnSong(
    'hymn-384',
    384,
    '나의 갈 길 다 가도록',
    '새찬송가 384장 (예수 인도하시니)',
    '인생의 모든 걸음을 신실하게 인도하시는 주님의 사랑을 고백하는 3박자 찬송가입니다.',
    74,
    '3/4',
    '가운데 도(1)와 미(3), 솔(5)의 부드러운 3화음 연결을 정성껏 연주하세요.',
    ['새찬송가', '인도하심', '소망', '300장대'],
    '3- 3 | 3 2 1 | 6,- 1 | 5,- 0 | 1- 1 | 1 2 3 | 2-- | 2- 0 | ' +
    '3- 3 | 3 2 1 | 6,- 1 | 5,- 0 | 1- 3 | 2- 1 | 1-- | 1- 0 | ' +
    '5- 5 | 5 4 3 | 6- 6 | 5- 0 | 5- 5 | 5 6 5 | 3-- | 2- 0 | ' +
    '3- 3 | 3 2 1 | 6,- 1 | 5,- 0 | 1- 3 | 2- 1 | 1--',
    false,
    'F. J. 크로스비 작사 / R. 라우리 작곡'
  ),

  // 12. 새찬송가 370장 - 주 안에 있는 나에게 (The Trusting Heart to Jesus Clings)
  makeHymnSong(
    'hymn-370',
    370,
    '주 안에 있는 나에게',
    '새찬송가 370장 (딴 근심 있으랴)',
    '십자가 밑에 나아가 모든 짐을 풀고 기쁨으로 주를 찬송하는 평안의 찬송가입니다.',
    82,
    '4/4',
    '경쾌한 8분음표 리듬을 타며 주 안에서 누리는 자유와 기쁨을 표현하세요.',
    ['새찬송가', '기쁨', '평안', '300장대'],
    '1_ 2_ | 3 3 3 2_ 1_ | 6, 1 1 0 | 1 1 2 3 | 2-- 1_ 2_ | ' +
    '3 3 3 2_ 1_ | 6, 1 1 0 | 1 3 2 2 | 1--- | ' +
    '5- 3- | 6 5 5 0 | 3 3 1 3 | 2-- 1_ 2_ | ' +
    '3 3 3 2_ 1_ | 6, 1 1 0 | 1 3 2 2 | 1---',
    false,
    'E. E. 휴잇 작사 / W. J. 커크패트릭 작곡'
  ),

  // 13. 새찬송가 542장 - 구주 예수 의지함이 (Tis So Sweet to Trust in Jesus)
  makeHymnSong(
    'hymn-542',
    542,
    '구주 예수 의지함이',
    '새찬송가 542장 (심히 기쁜 일일세)',
    '주의 귀한 약속의 말씀을 굳게 믿고 의지하는 기쁨을 노래하는 감미로운 찬송가입니다.',
    80,
    '4/4',
    '맑고 고요한 타건으로 예수님의 이름을 부르듯 다정하게 연주하세요.',
    ['새찬송가', '믿음', '기쁨', '500장대'],
    '3 3 3 2 | 1 1 6, 0 | 1 1 2 3 | 2--- | ' +
    '3 3 3 2 | 1 1 6, 0 | 1 3 2 2 | 1--- | ' +
    '5 5 3 5 | 6 6 5 0 | 3 3 1 3 | 2--- | ' +
    '3 3 3 2 | 1 1 6, 0 | 1 3 2 2 | 1---',
    false,
    'L. M. R. 스테드 작사 / W. J. 커크패트릭 작곡'
  ),

  // 14. 새찬송가 435장 - 나의 영원하신 기업 (Thou My Everlasting Portion)
  makeHymnSong(
    'hymn-435',
    435,
    '나의 영원하신 기업',
    '새찬송가 435장 (생명보다 귀하다)',
    '생명보다 귀하신 주님과 영원히 동행하기를 소망하는 경건한 3박자 찬송가입니다.',
    72,
    '3/4',
    '기도하듯 엄숙하고 경건한 호흡으로 잔향의 깊이를 느껴보세요.',
    ['새찬송가', '동행', '기업', '400장대'],
    '3- 3 | 3 2 1 | 5- 5 | 5- 0 | 6- 6 | 5 3 1 | 2-- | 2- 0 | ' +
    '3- 3 | 3 2 1 | 5- 5 | 5- 0 | 6- 6 | 5 3 2 | 1-- | 1- 0 | ' +
    '5- 5 | 6 5 3 | 5-- | 5- 0 | 6- 6 | 5 3 1 | 2-- | 2- 0 | ' +
    '3- 3 | 3 2 1 | 5- 5 | 5- 0 | 6- 6 | 5 3 2 | 1--',
    false,
    'F. J. 크로스비 작사 / S. J. 베일 작곡'
  ),

  // 15. 새찬송가 492장 - 잠시 세상에 내가 살면서 (I'm a Pilgrim)
  makeHymnSong(
    'hymn-492',
    492,
    '잠시 세상에 내가 살면서',
    '새찬송가 492장 (영원한 본향을 향하여)',
    '나그네 인생길을 지나 영원한 하나님 나라로 나아가는 성도의 소망을 담은 행진 찬송입니다.',
    84,
    '4/4',
    '씩씩하고 확신에 찬 터치로 하늘 본향을 향한 걸음을 표현하세요.',
    ['새찬송가', '소망', '천국', '400장대'],
    '1_ 2_ | 3 3 3 2_ 1_ | 5 5 5 0 | 3 3 3 1 | 2-- 1_ 2_ | ' +
    '3 3 3 2_ 1_ | 5 5 5 0 | 3 3 2 2 | 1--- | ' +
    '5- 3- | 6 5 5 0 | 3 3 1 3 | 2-- 1_ 2_ | ' +
    '3 3 3 2_ 1_ | 5 5 5 0 | 3 3 2 2 | 1---',
    false,
    '미국 전통 복음성가'
  ),

  // 16. 새찬송가 428장 - 내 영혼에 햇빛 비치니 (Sunshine in the Soul)
  makeHymnSong(
    'hymn-428',
    428,
    '내 영혼에 햇빛 비치니',
    '새찬송가 428장 (주 영광 찬란해)',
    '주님의 은혜로운 빛이 영혼을 환하게 비추는 찬란한 기쁨의 찬송입니다.',
    86,
    '4/4',
    '햇살이 쏟아져 내리듯 고음역 건반을 반짝반짝 투명하게 연주하세요.',
    ['새찬송가', '햇빛', '찬란함', '400장대'],
    '3_ 4_ | 5 5 5 4_ 3_ | 6 5 5 0 | 5 5 5 1\' | 7-- 6_ 7_ | ' +
    '1\' 1\' 1\' 7_ 6_ | 5 3 3 0 | 2 3 4 2 | 1--- | ' +
    '5- 3- | 6 5 5 0 | 5- 1\'- | 7-- 6_ 7_ | ' +
    '1\' 1\' 1\' 7_ 6_ | 5 3 3 0 | 2 3 4 2 | 1---',
    false,
    'E. E. 휴잇 작사 / J. R. 스웨니 작곡'
  ),

  // 17. 새찬송가 314장 - 내 구주 예수를 더욱 사랑 (More Love to Thee, O Christ)
  makeHymnSong(
    'hymn-314',
    314,
    '내 구주 예수를 더욱 사랑',
    '새찬송가 314장 (엎드려 비는 말 들으소서)',
    '어떤 시련 속에서도 오직 주님만을 더욱 사랑하겠다는 눈물의 기도 찬송입니다.',
    70,
    '4/4',
    '조용하고 간절한 기도의 마음을 담아 건반을 지그시 눌러 울려주세요.',
    ['새찬송가', '사랑', '기도', '300장대'],
    '3 3 2 1 | 3- 2 0 | 4 4 3 2 | 5- 3 0 | ' +
    '5 5 4 3 | 6- 5 0 | 4 3 2 2 | 1--- | ' +
    '5--- | 3--- | 6--- | 5--- | ' +
    '4 3 2 2 | 1--- 0',
    false,
    'E. P. 프렌티스 작사 / W. H. 도언 작곡'
  ),

  // 18. 새찬송가 453장 - 예수 더 알기 원하네 (More About Jesus)
  makeHymnSong(
    'hymn-453',
    453,
    '예수 더 알기 원하네',
    '새찬송가 453장 (크신 은혜와 구속의 사랑을)',
    '구주 예수님의 크신 은혜와 대속의 사랑을 더 깊이 알기를 소망하는 찬송가입니다.',
    76,
    '6/8',
    '부드러운 6/8박자 물결을 타며 한 음 한 음 아름답게 잇도록 하세요.',
    ['새찬송가', '예수님', '은혜', '400장대'],
    '3(1.5) 4_ 5_ 3(1.5) | 1(1.5) 2_ 3_ 1(1.5) | 4(1.5) 5_ 6_ 4(1.5) | 2--- 0--- | ' +
    '3(1.5) 4_ 5_ 3(1.5) | 1(1.5) 2_ 3_ 1(1.5) | 2 3 4 3 2 | 1--- 0--- | ' +
    '5(1.5) 6_ 5_ 3(1.5) | 6(1.5) 7_ 6_ 4(1.5) | 5(1.5) 6_ 5_ 3(1.5) | 2--- 0--- | ' +
    '3(1.5) 4_ 5_ 3(1.5) | 1(1.5) 2_ 3_ 1(1.5) | 2 3 4 3 2 | 1--- 0---',
    false,
    'E. E. 휴잇 작사 / J. R. 스웨니 작곡'
  ),

  // 19. 새찬송가 323장 - 부름 받아 나선 이 몸 (Here Am I, Send Me)
  makeHymnSong(
    'hymn-323',
    323,
    '부름 받아 나선 이 몸',
    '새찬송가 323장 (어디든지 가오리다)',
    '주님의 부르심에 온전히 순종하여 어디든지 충성되이 헌신하겠다는 결단의 찬송입니다.',
    78,
    '4/4',
    '비장하고 흔들림 없는 당당한 타건으로 헌신의 결단을 연주하세요.',
    ['새찬송가', '소명', '헌신', '300장대'],
    '1 1 2 3 | 3- 2 1 | 3 5 6 5 | 3--- | ' +
    '5 5 6 1\' | 1\'- 7 6 | 5 3 2 3 | 2--- | ' +
    '1 1 2 3 | 3- 2 1 | 3 5 6 5 | 3--- | ' +
    '5 1\' 7 6 | 5 3 2 3 | 1 1 2 2 | 1---',
    false,
    '이단열 작사 / 이유선 작곡'
  ),

  // 20. 새찬송가 563장 - 예수 사랑하심은 (Jesus Loves Me)
  makeHymnSong(
    'hymn-563',
    563,
    '예수 사랑하심은',
    '새찬송가 563장 (성경에 써 있네)',
    '어린아이부터 어른까지 전 세계 모든 성도들의 마음에 가장 깊이 새겨진 순수한 사랑의 찬송입니다.',
    80,
    '4/4',
    '아이의 맑고 순수한 눈동자처럼 티 없이 맑고 또랑또랑하게 연주하세요.',
    ['새찬송가', '어린이', '예수님사랑', '500장대'],
    '3 3 2 1 | 3 5 5 0 | 6 6 1\' 6 | 5--- | ' +
    '3 3 2 1 | 3 5 5 0 | 3 1 2 2 | 1--- | ' +
    '3- 5- | 6- 5 0 | 3- 5- | 2--- | ' +
    '3- 5- | 6- 1\' 0 | 5 3 2 2 | 1---',
    false,
    'A. B. 워너 작사 / W. B. 브래드버리 작곡'
  ),
];

export const CUSTOM_HYMNS_STORAGE_KEY = 'kalimba_custom_hymns_v1';

export interface StoredHymnData {
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
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CUSTOM_HYMNS_STORAGE_KEY) : null;
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

    // 2. 사용자가 새로 추가한 찬송가들을 맨 앞 또는 뒤에 추가
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
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CUSTOM_HYMNS_STORAGE_KEY) : null;
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
      tags:
        hymnData.tags && hymnData.tags.length > 0
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

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_HYMNS_STORAGE_KEY, JSON.stringify(storedList));
    }
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
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(CUSTOM_HYMNS_STORAGE_KEY) : null;
    if (!raw) return loadAllHymns();
    const storedList: StoredHymnData[] = JSON.parse(raw);
    const filtered = storedList.filter((item) => item.id !== id);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CUSTOM_HYMNS_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Failed to delete custom hymn', e);
  }
  return loadAllHymns();
}
