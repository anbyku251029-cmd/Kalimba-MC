/**
 * Kalimba-MC STEP 01-G
 * 유아 친화적인 한국어 음성 나레이션 문구 상수
 */

export const NARRATION_PHRASES = {
  // 학습 시작
  WELCOME: '안녕! 오늘은 칼림바를 함께 연주해 보자.',
  CHOOSE_SECTION: '연습할 부분을 골라 보자. 어느 마디를 연습할까?',

  // 마디 선택
  SELECT_RANGE_GUIDE: '시작 마디와 끝 마디를 골라 보자. 선택한 부분을 함께 연주해 보자.',

  // 1단계: 먼저 듣기
  STEP1_LISTEN: '먼저 음악을 잘 들어 보자. 귀를 쫑긋 세우고 들어 봐.',
  STEP1_AGAIN_HINT: '다시 듣고 싶으면 다시 듣기 버튼을 눌러 줘.',

  // 2단계: 천천히 따라 하기
  STEP2_SLOW: '이제 천천히 따라 해 보자. 화면에 나오는 숫자를 보고 같은 건반을 찾아 봐.',
  STEP2_RELAX: '서두르지 않아도 괜찮아. 천천히 하나씩 튕겨보자.',

  // 3단계: 구간 반복 연습
  STEP3_REPEAT_START: '좋아! 이제 같은 부분을 다시 연습해 보자.',
  STEP3_REPEAT_ONCE_MORE: '한 번 더 연습해 보자.',
  STEP3_REPEAT_COMPLETE: '끝까지 해냈어! 정말 잘했어.',

  // 전체 연습
  FULL_PRACTICE_START: '이제 곡 전체를 신나게 연주해 보자!',

  // 오류 및 미지원 대체 안내
  NO_MEASURE_DATA: '이 곡은 아직 부분 연습을 준비하지 못했어. 전체 곡으로 연습해 보자.',
  UNSUPPORTED_SPEECH: '음성 안내를 사용할 수 없어. 화면의 안내를 보고 계속 연습할 수 있어.',
} as const;

export type NarrationPhraseKey = keyof typeof NARRATION_PHRASES;
