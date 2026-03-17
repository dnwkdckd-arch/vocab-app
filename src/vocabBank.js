const EASY_WORDS = [
  ["accept", "받아들이다"],
  ["answer", "대답하다; 정답"],
  ["arrive", "도착하다"],
  ["ask", "묻다; 부탁하다"],
  ["believe", "믿다"],
  ["borrow", "빌리다"],
  ["bring", "가져오다"],
  ["build", "짓다"],
  ["carry", "운반하다"],
  ["change", "변하다; 바꾸다"],
  ["choose", "선택하다"],
  ["clean", "깨끗한; 청소하다"],
  ["close", "닫다; 가까운"],
  ["cook", "요리하다"],
  ["decide", "결정하다"],
  ["enjoy", "즐기다"],
  ["finish", "끝내다"],
  ["follow", "따라가다; 따르다"],
  ["happen", "일어나다"],
  ["help", "돕다"],
  ["hope", "희망하다"],
  ["invite", "초대하다"],
  ["learn", "배우다"],
  ["listen", "듣다"],
  ["move", "움직이다; 이사하다"],
  ["need", "필요로 하다"],
  ["open", "열다; 열린"],
  ["remember", "기억하다"],
  ["start", "시작하다"],
  ["visit", "방문하다"],
  ["agree", "동의하다"],
  ["allow", "허락하다"],
  ["become", "~이 되다"],
  ["begin", "시작하다"],
  ["call", "부르다; 전화하다"],
  ["check", "확인하다"],
  ["come", "오다"],
  ["create", "만들다"],
  ["drink", "마시다"],
  ["drive", "운전하다"],
  ["eat", "먹다"],
  ["enter", "들어가다"],
  ["explain", "설명하다"],
  ["find", "찾다"],
  ["give", "주다"],
  ["go", "가다"],
  ["hear", "듣다"],
  ["join", "가입하다; 함께하다"],
  ["keep", "유지하다; 계속하다"],
  ["know", "알다"],
  ["leave", "떠나다"],
  ["live", "살다"],
  ["look", "보다"],
  ["love", "사랑하다; 좋아하다"],
  ["make", "만들다"],
  ["meet", "만나다"],
  ["pay", "지불하다"],
  ["play", "놀다; 경기하다"],
  ["read", "읽다"],
  ["run", "달리다"],
  ["say", "말하다"],
  ["see", "보다"],
  ["send", "보내다"],
  ["show", "보여주다"],
  ["sit", "앉다"],
  ["speak", "말하다"],
  ["stand", "서다"],
  ["study", "공부하다"],
  ["take", "가져가다"],
  ["talk", "말하다"],
  ["teach", "가르치다"],
  ["tell", "말하다"],
  ["think", "생각하다"],
  ["try", "노력하다; 시도하다"],
  ["understand", "이해하다"],
  ["use", "사용하다"],
  ["wait", "기다리다"],
  ["walk", "걷다"],
  ["want", "원하다"],
  ["watch", "보다"],
  ["work", "일하다"],
  ["write", "쓰다"],
  ["young", "젊은"],
  ["old", "늙은; 오래된"],
  ["happy", "행복한"],
  ["sad", "슬픈"],
  ["easy", "쉬운"],
  ["hard", "어려운; 단단한"],
  ["fast", "빠른"],
  ["slow", "느린"],
  ["early", "이른; 일찍"],
  ["late", "늦은; 늦게"],
  ["big", "큰"],
  ["small", "작은"],
  ["long", "긴; 오랫동안"],
  ["short", "짧은"],
  ["high", "높은"],
  ["low", "낮은"],
  ["hot", "뜨거운"],
  ["cold", "차가운"],
  ["new", "새로운"],
  ["busy", "바쁜"],
  ["kind", "친절한"],
  ["quiet", "조용한"],
  ["strong", "강한"],
  ["weak", "약한"],
  ["friend", "친구"],
  ["family", "가족"],
  ["school", "학교"],
  ["teacher", "선생님"],
  ["student", "학생"],
  ["room", "방"],
  ["house", "집"],
  ["food", "음식"],
  ["water", "물"],
  ["money", "돈"],
  ["time", "시간"],
  ["day", "날"],
  ["week", "주"],
  ["month", "달"],
  ["year", "해"],
  ["morning", "아침"],
  ["night", "밤"],
  ["question", "질문; 문제"],
  ["problem", "문제"],
  ["idea", "생각; 아이디어"],
  ["name", "이름"],
  ["number", "숫자"],
  ["place", "장소"],
  ["world", "세상"],
  ["country", "나라"],
  ["city", "도시"],
  ["job", "일; 직업"],
  ["picture", "사진; 그림"],
  ["phone", "전화기"],
  ["computer", "컴퓨터"],
  ["book", "책"],
  ["pen", "펜"],
  ["door", "문"],
  ["window", "창문"],
  ["table", "탁자"],
  ["chair", "의자"],
];

const MID_WORDS = [
  ["actually", "실제로"],
  ["advice", "조언"],
  ["appear", "나타나다"],
  ["available", "이용 가능한"],
  ["careful", "조심하는"],
  ["cause", "원인; 야기하다"],
  ["certain", "확실한"],
  ["comfortable", "편안한"],
  ["communicate", "의사소통하다"],
  ["compare", "비교하다"],
  ["continue", "계속하다"],
  ["correct", "맞는; 수정하다"],
  ["different", "다른"],
  ["difficult", "어려운"],
  ["experience", "경험; 경험하다"],
  ["famous", "유명한"],
  ["forward", "앞으로"],
  ["important", "중요한"],
  ["language", "언어"],
  ["maybe", "아마"],
  ["popular", "인기 있는"],
  ["prepare", "준비하다"],
  ["ready", "준비된"],
  ["reason", "이유"],
  ["spend", "쓰다; 보내다"],
  ["toward", "~을 향해"],
  ["ability", "능력"],
  ["abroad", "해외에"],
  ["achieve", "성취하다"],
  ["attention", "주의, 집중"],
  ["average", "평균; 평균의"],
  ["behavior", "행동"],
  ["career", "직업; 경력"],
  ["challenge", "도전; 도전하다"],
  ["consider", "고려하다"],
  ["develop", "개발하다; 발달하다"],
  ["education", "교육"],
  ["environment", "환경"],
  ["especially", "특히"],
  ["focus", "집중하다; 초점"],
  ["foreign", "외국의"],
  ["goal", "목표"],
  ["habit", "습관"],
  ["improve", "향상시키다"],
  ["knowledge", "지식"],
  ["local", "지역의"],
  ["manage", "관리하다; 해내다"],
  ["opportunity", "기회"],
  ["practice", "연습; 실천"],
  ["realize", "깨닫다; 실현하다"],
  ["recommend", "추천하다"],
  ["relationship", "관계"],
  ["result", "결과"],
  ["schedule", "일정"],
  ["success", "성공"],
  ["usually", "보통"],
];

const HARD_WORDS = [
  ["analyze", "분석하다"],
  ["approach", "접근하다; 접근법"],
  ["appropriate", "적절한"],
  ["assume", "가정하다"],
  ["circumstance", "상황, 환경"],
  ["consistent", "일관된"],
  ["contribute", "기여하다"],
  ["convince", "설득하다"],
  ["critical", "비판적인; 중요한"],
  ["debate", "토론하다; 토론"],
  ["decline", "감소하다; 거절하다"],
  ["demonstrate", "보여주다; 입증하다"],
  ["determine", "결정하다; 알아내다"],
  ["distribute", "분배하다"],
  ["emphasize", "강조하다"],
  ["estimate", "추정하다"],
  ["evaluate", "평가하다"],
  ["evidence", "증거"],
  ["factor", "요소"],
  ["function", "기능; 작동하다"],
  ["generate", "생성하다"],
  ["impact", "영향; 영향을 주다"],
  ["indicate", "나타내다"],
  ["interpret", "해석하다"],
  ["maintain", "유지하다"],
  ["measure", "측정하다; 조치"],
  ["mention", "언급하다"],
  ["obvious", "분명한"],
  ["participate", "참여하다"],
  ["perspective", "관점"],
  ["policy", "정책"],
  ["principle", "원칙"],
  ["procedure", "절차"],
  ["process", "과정; 처리하다"],
  ["professional", "전문적인; 전문가"],
  ["promote", "촉진하다; 홍보하다"],
  ["proposal", "제안"],
  ["prove", "증명하다"],
  ["react", "반응하다"],
  ["region", "지역"],
  ["regulate", "규제하다"],
  ["relevant", "관련 있는"],
  ["significant", "중요한; 상당한"],
  ["strategy", "전략"],
  ["structure", "구조"],
  ["theory", "이론"],
  ["transfer", "이동시키다; 이전"],
  ["treat", "다루다; 치료하다"],
  ["trend", "추세"],
  ["vary", "달라지다"],
];

const REVIEW_MIX = [
  ["a piece of cake", "아주 쉬운 일"],
  ["break the ice", "어색한 분위기를 깨다"],
  ["call off", "취소하다"],
  ["carry out", "수행하다"],
  ["come up with", "생각해내다"],
  ["figure out", "이해하다; 알아내다"],
  ["get along with", "~와 잘 지내다"],
  ["give up", "포기하다"],
  ["go over", "검토하다"],
  ["keep up with", "~를 따라가다"],
  ["look after", "돌보다"],
  ["look forward to", "~을 기대하다"],
  ["put off", "미루다"],
  ["run into", "우연히 만나다"],
  ["set up", "설치하다; 준비하다"],
  ["take care of", "돌보다; 처리하다"],
  ["turn out", "~로 드러나다"],
  ["work on", "~에 힘쓰다"],
  ["in charge of", "~을 담당하여"],
  ["on purpose", "고의로"],
  ["by accident", "우연히"],
  ["in advance", "미리"],
  ["at least", "적어도"],
  ["as a result", "그 결과"],
  ["in other words", "다시 말해서"],
  ["for example", "예를 들어"],
  ["in fact", "사실은"],
  ["all of a sudden", "갑자기"],
  ["be likely to", "~할 가능성이 있다"],
  ["be supposed to", "~하기로 되어 있다"],
];

function seededRandom(seed) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

function shuffleWithSeed(array, seedBase) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seedBase + i) * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function getDifficultyStage(dayNumber) {
  if (dayNumber <= 60) {
    return { easy: 24, mid: 6, hard: 0, review: 0 };
  }
  if (dayNumber <= 120) {
    return { easy: 14, mid: 14, hard: 2, review: 0 };
  }
  if (dayNumber <= 210) {
    return { easy: 8, mid: 16, hard: 5, review: 1 };
  }
  if (dayNumber <= 300) {
    return { easy: 4, mid: 14, hard: 10, review: 2 };
  }
  return { easy: 2, mid: 10, hard: 14, review: 4 };
}

function normalizeWordKey(word) {
  return String(word || "").trim().toLowerCase();
}

function makePoolState(pool, seed) {
  return {
    items: shuffleWithSeed(pool, seed),
    index: 0,
  };
}

function takeUniqueFromPool(poolState, count, usedTodaySet) {
  const result = [];
  const length = poolState.items.length;

  if (length === 0 || count <= 0) return result;

  let safety = 0;
  while (result.length < count && safety < length * 3) {
    const item = poolState.items[poolState.index % length];
    poolState.index += 1;
    safety += 1;

    const key = normalizeWordKey(item[0]);

    if (usedTodaySet.has(key)) continue;

    usedTodaySet.add(key);
    result.push(item);
  }

  if (result.length < count) {
    let extraSafety = 0;
    while (result.length < count && extraSafety < length * 3) {
      const item = poolState.items[poolState.index % length];
      poolState.index += 1;
      extraSafety += 1;
      result.push(item);
    }
  }

  return result;
}

function buildYearPlan(totalDays = 365, wordsPerDay = 30) {
  const easyState = makePoolState(EASY_WORDS, 101);
  const midState = makePoolState(MID_WORDS, 211);
  const hardState = makePoolState(HARD_WORDS, 307);
  const reviewState = makePoolState(REVIEW_MIX, 401);

  const yearPlan = {};

  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber++) {
    const stage = getDifficultyStage(dayNumber);
    const usedTodaySet = new Set();

    const easy = takeUniqueFromPool(easyState, stage.easy, usedTodaySet);
    const mid = takeUniqueFromPool(midState, stage.mid, usedTodaySet);
    const hard = takeUniqueFromPool(hardState, stage.hard, usedTodaySet);
    const review = takeUniqueFromPool(reviewState, stage.review, usedTodaySet);

    const merged = shuffleWithSeed(
      [...easy, ...mid, ...hard, ...review],
      dayNumber * 503
    ).slice(0, wordsPerDay);

    yearPlan[dayNumber] = merged.map((item, index) => ({
      id: index + 1,
      word: item[0],
      meaning: item[1],
      colorIndex: -1,
    }));
  }

  return yearPlan;
}

const YEAR_PLAN = buildYearPlan(365, 30);

export function generateDayWords(dayNumber, wordsPerDay = 30) {
  const preset = YEAR_PLAN[dayNumber];

  if (!preset) return [];

  return preset.slice(0, wordsPerDay).map((item, index) => ({
    id: index + 1,
    word: item.word,
    meaning: item.meaning,
    colorIndex: -1,
  }));
}
