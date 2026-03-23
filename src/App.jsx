import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import { generateDayWords } from "./vocabBank";

const WORDS_PER_DAY = 30;
const TOTAL_DAYS = 365;
const STORAGE_KEY = "vocab-memorizer-local-v7";
const SESSION_KEY = "vocab-custom-session-v7";

const rainbowColors = [
  "red",
  "orange",
  "gold",
  "green",
  "blue",
  "indigo",
  "violet",
];

const createEmptyDayWords = () =>
  Array.from({ length: WORDS_PER_DAY }, (_, i) => ({
    id: i + 1,
    word: "",
    meaning: "",
    colorIndex: -1,
  }));

const createDay = (dayNumber, usePreset = true) => ({
  day: dayNumber,
  words: usePreset
    ? generateDayWords(dayNumber, WORDS_PER_DAY)
    : createEmptyDayWords(),
});

const createInitialDays = () =>
  Array.from({ length: TOTAL_DAYS }, (_, i) => createDay(i + 1, true));

const buildRandomHideMap = (length) =>
  Array.from({ length }, () => (Math.random() > 0.5 ? "word" : "meaning"));

function simpleHash(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function shuffleArray(array) {
  const copied = [...array];
  for (let i = copied.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function getWeekFromDay(day) {
  return Math.floor((day - 1) / 7) + 1;
}

function getMonthFromDay(day) {
  return Math.floor((day - 1) / 30) + 1;
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[.,!?]/g, "")
    .replace(/\s+/g, " ");
}

function meaningTokens(text) {
  return String(text || "")
    .split(/[;/]/)
    .map((v) => normalizeText(v))
    .filter(Boolean);
}

function wordKey(item) {
  return `${item.originDay || item.day || 0}__${normalizeText(item.word)}__${normalizeText(
    item.meaning
  )}`;
}

function enrichWord(item, fallbackDay) {
  return {
    ...item,
    originDay: item.originDay || item.day || fallbackDay,
  };
}

function mergeUniqueWords(base = [], incoming = []) {
  const map = new Map();

  [...base, ...incoming].forEach((item) => {
    const normalized = enrichWord(item, item.originDay || item.day || 0);
    map.set(wordKey(normalized), normalized);
  });

  return Array.from(map.values());
}

function isAnswerCorrect(userAnswer, item, direction) {
  const input = normalizeText(userAnswer);

  if (!input) return false;

  if (direction === "meaningToWord") {
    return input === normalizeText(item.word);
  }

  const correctMeaning = normalizeText(item.meaning);
  const tokens = meaningTokens(item.meaning);

  if (input === correctMeaning) return true;
  if (tokens.includes(input)) return true;

  return tokens.some((token) => token.includes(input) || input.includes(token));
}

export default function App() {
  const [days, setDays] = useState(createInitialDays());
  const [currentDay, setCurrentDay] = useState(1);

  const [reviewMode, setReviewMode] = useState(false);
  const [reviewTarget, setReviewTarget] = useState({ type: "week", value: 1 });

  const [expandedMonths, setExpandedMonths] = useState({ 1: true });
  const [expandedWeeks, setExpandedWeeks] = useState({ 1: true });

  const [loaded, setLoaded] = useState(false);
  const [cloudLoaded, setCloudLoaded] = useState(false);

  const [testMode, setTestMode] = useState("none");
  const [showAnswers, setShowAnswers] = useState(false);
  const [randomHideMap, setRandomHideMap] = useState(
    buildRandomHideMap(WORDS_PER_DAY)
  );

  const [bulkText, setBulkText] = useState("");
  const [installPromptEvent, setInstallPromptEvent] = useState(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [user, setUser] = useState(null);
  const [statusMessage, setStatusMessage] = useState("로그인 안 됨");
  const [menuOpen, setMenuOpen] = useState(false);

  const [todayWrongWords, setTodayWrongWords] = useState([]);
  const [weeklyWrongMap, setWeeklyWrongMap] = useState({});
  const [monthlyWrongMap, setMonthlyWrongMap] = useState({});

  const [testDirection, setTestDirection] = useState("meaningToWord");
  const [testSession, setTestSession] = useState(null);
  const [testInput, setTestInput] = useState("");
  const [testChecked, setTestChecked] = useState(false);
  const [testFeedback, setTestFeedback] = useState(null);

  const [showStudyOptions, setShowStudyOptions] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.days?.length) {
          setDays(parsed.days);
          setCurrentDay(parsed.currentDay || 1);
          setReviewMode(parsed.reviewMode || false);
          setReviewTarget(parsed.reviewTarget || { type: "week", value: 1 });
          setExpandedMonths(parsed.expandedMonths || { 1: true });
          setExpandedWeeks(parsed.expandedWeeks || { 1: true });
          setTestMode(parsed.testMode || "none");
          setShowAnswers(parsed.showAnswers || false);
          setRandomHideMap(
            parsed.randomHideMap || buildRandomHideMap(WORDS_PER_DAY)
          );
          setTodayWrongWords(parsed.todayWrongWords || []);
          setWeeklyWrongMap(parsed.weeklyWrongMap || {});
          setMonthlyWrongMap(parsed.monthlyWrongMap || {});
          setTestDirection(parsed.testDirection || "meaningToWord");
        }
      }
    } catch (e) {
      console.error("로컬 데이터 불러오기 실패:", e);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed?.id && parsed?.username) {
          setUser(parsed);
          setStatusMessage(`${parsed.username} 로그인됨`);
        }
      }
    } catch (e) {
      console.error("세션 복구 실패:", e);
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const currentDayData = useMemo(() => {
    return days.find((d) => d.day === currentDay) || days[0];
  }, [days, currentDay]);

  const totalMonths = Math.max(1, Math.ceil(days.length / 30));

  const monthTree = useMemo(() => {
    const months = [];

    for (let month = 1; month <= totalMonths; month++) {
      const monthStart = (month - 1) * 30 + 1;
      const monthEnd = Math.min(month * 30, days.length);

      const weeks = [];
      const startWeek = Math.floor((monthStart - 1) / 7) + 1;
      const endWeek = Math.floor((monthEnd - 1) / 7) + 1;

      for (let week = startWeek; week <= endWeek; week++) {
        const weekStart = (week - 1) * 7 + 1;
        const weekEnd = Math.min(week * 7, days.length);

        const dayList = days.filter((d) => d.day >= weekStart && d.day <= weekEnd);

        const filledCount = dayList.reduce(
          (sum, d) => sum + d.words.filter((w) => w.word.trim()).length,
          0
        );

        const wrongCount = dayList.reduce(
          (sum, d) => sum + d.words.filter((w) => w.colorIndex >= 0).length,
          0
        );

        weeks.push({
          week,
          startDay: weekStart,
          endDay: weekEnd,
          filledCount,
          wrongCount,
          days: dayList,
        });
      }

      const monthDays = days.filter((d) => d.day >= monthStart && d.day <= monthEnd);

      const monthFilledCount = monthDays.reduce(
        (sum, d) => sum + d.words.filter((w) => w.word.trim()).length,
        0
      );

      const monthWrongCount = monthDays.reduce(
        (sum, d) => sum + d.words.filter((w) => w.colorIndex >= 0).length,
        0
      );

      months.push({
        month,
        startDay: monthStart,
        endDay: monthEnd,
        filledCount: monthFilledCount,
        wrongCount: monthWrongCount,
        weeks,
      });
    }

    return months;
  }, [days, totalMonths]);

  const reviewLabel = useMemo(() => {
    if (reviewTarget.type === "day") return `${reviewTarget.value}일차 틀린 단어 복습`;
    if (reviewTarget.type === "month") return `${reviewTarget.value}달차 틀린 단어 복습`;
    return `${reviewTarget.value}주차 틀린 단어 복습`;
  }, [reviewTarget]);

  const wrongWords = useMemo(() => {
    const result = [];

    days.forEach((dayData) => {
      let include = false;

      if (reviewTarget.type === "day") {
        include = dayData.day === reviewTarget.value;
      } else if (reviewTarget.type === "week") {
        include = getWeekFromDay(dayData.day) === reviewTarget.value;
      } else if (reviewTarget.type === "month") {
        include = getMonthFromDay(dayData.day) === reviewTarget.value;
      }

      if (!include) return;

      dayData.words.forEach((word) => {
        if (word.colorIndex >= 0 && (word.word.trim() || word.meaning.trim())) {
          result.push({ ...word, day: dayData.day });
        }
      });
    });

    return result;
  }, [days, reviewTarget]);

  const displayRows = reviewMode ? wrongWords : currentDayData.words;

  const currentWeek = getWeekFromDay(currentDay);
  const currentMonth = getMonthFromDay(currentDay);

  const currentWeeklyWrongCount = (weeklyWrongMap[currentWeek] || []).length;
  const currentMonthlyWrongCount = (monthlyWrongMap[currentMonth] || []).length;

  const currentTestItem = testSession?.items?.[testSession.currentIndex] || null;

  function buildState(
    nextDays = days,
    nextCurrentDay = currentDay,
    nextReviewMode = reviewMode,
    nextReviewTarget = reviewTarget,
    nextExpandedMonths = expandedMonths,
    nextExpandedWeeks = expandedWeeks,
    nextTestMode = testMode,
    nextShowAnswers = showAnswers,
    nextRandomHideMap = randomHideMap,
    nextTodayWrongWords = todayWrongWords,
    nextWeeklyWrongMap = weeklyWrongMap,
    nextMonthlyWrongMap = monthlyWrongMap,
    nextTestDirection = testDirection
  ) {
    return {
      days: nextDays,
      currentDay: nextCurrentDay,
      reviewMode: nextReviewMode,
      reviewTarget: nextReviewTarget,
      expandedMonths: nextExpandedMonths,
      expandedWeeks: nextExpandedWeeks,
      testMode: nextTestMode,
      showAnswers: nextShowAnswers,
      randomHideMap: nextRandomHideMap,
      todayWrongWords: nextTodayWrongWords,
      weeklyWrongMap: nextWeeklyWrongMap,
      monthlyWrongMap: nextMonthlyWrongMap,
      testDirection: nextTestDirection,
    };
  }

  async function saveToCloud(state, targetUser = user) {
    if (!targetUser) return;

    const userIdKey = String(targetUser.id);

    const { error } = await supabase
      .from("vocab_state")
      .upsert(
        {
          user_id: userIdKey,
          data: state,
        },
        { onConflict: "user_id" }
      );

    if (error) {
      console.error("클라우드 저장 실패:", error);
      setStatusMessage("클라우드 저장 실패");
    }
  }

  async function persistState(
    nextDays,
    nextCurrentDay = currentDay,
    nextReviewMode = reviewMode,
    nextReviewTarget = reviewTarget,
    nextExpandedMonths = expandedMonths,
    nextExpandedWeeks = expandedWeeks,
    nextTestMode = testMode,
    nextShowAnswers = showAnswers,
    nextRandomHideMap = randomHideMap,
    nextTodayWrongWords = todayWrongWords,
    nextWeeklyWrongMap = weeklyWrongMap,
    nextMonthlyWrongMap = monthlyWrongMap,
    nextTestDirection = testDirection
  ) {
    const state = buildState(
      nextDays,
      nextCurrentDay,
      nextReviewMode,
      nextReviewTarget,
      nextExpandedMonths,
      nextExpandedWeeks,
      nextTestMode,
      nextShowAnswers,
      nextRandomHideMap,
      nextTodayWrongWords,
      nextWeeklyWrongMap,
      nextMonthlyWrongMap,
      nextTestDirection
    );

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    await saveToCloud(state);
  }

  async function loadFromCloud(targetUser = user) {
    if (!targetUser) return;

    const userIdKey = String(targetUser.id);

    const { data, error } = await supabase
      .from("vocab_state")
      .select("data")
      .eq("user_id", userIdKey)
      .maybeSingle();

    if (error) {
      console.error("클라우드 불러오기 실패:", error);
      setCloudLoaded(true);
      return;
    }

    const saved = data?.data;

    if (saved && saved.days && saved.days.length >= 300) {
      setDays(saved.days);
      setCurrentDay(saved.currentDay || 1);
      setReviewMode(saved.reviewMode || false);
      setReviewTarget(saved.reviewTarget || { type: "week", value: 1 });
      setExpandedMonths(saved.expandedMonths || { 1: true });
      setExpandedWeeks(saved.expandedWeeks || { 1: true });
      setTestMode(saved.testMode || "none");
      setShowAnswers(saved.showAnswers || false);
      setRandomHideMap(saved.randomHideMap || buildRandomHideMap(WORDS_PER_DAY));
      setTodayWrongWords(saved.todayWrongWords || []);
      setWeeklyWrongMap(saved.weeklyWrongMap || {});
      setMonthlyWrongMap(saved.monthlyWrongMap || {});
      setTestDirection(saved.testDirection || "meaningToWord");

      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } else {
      const freshDays = createInitialDays();
      const freshState = {
        days: freshDays,
        currentDay: 1,
        reviewMode: false,
        reviewTarget: { type: "week", value: 1 },
        expandedMonths: { 1: true },
        expandedWeeks: { 1: true },
        testMode: "none",
        showAnswers: false,
        randomHideMap: buildRandomHideMap(WORDS_PER_DAY),
        todayWrongWords: [],
        weeklyWrongMap: {},
        monthlyWrongMap: {},
        testDirection: "meaningToWord",
      };

      setDays(freshState.days);
      setCurrentDay(1);
      setReviewMode(freshState.reviewMode);
      setReviewTarget(freshState.reviewTarget);
      setExpandedMonths(freshState.expandedMonths);
      setExpandedWeeks(freshState.expandedWeeks);
      setTestMode(freshState.testMode);
      setShowAnswers(freshState.showAnswers);
      setRandomHideMap(freshState.randomHideMap);
      setTodayWrongWords(freshState.todayWrongWords);
      setWeeklyWrongMap(freshState.weeklyWrongMap);
      setMonthlyWrongMap(freshState.monthlyWrongMap);
      setTestDirection(freshState.testDirection);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
      await saveToCloud(freshState, targetUser);
    }

    setCloudLoaded(true);
  }

  useEffect(() => {
    if (user) {
      setCloudLoaded(false);
      loadFromCloud(user);
    }
  }, [user]);

  const handleNumberClick = async (index) => {
    if (reviewMode || testSession) return;

    const nextDays = days.map((dayData) => {
      if (dayData.day !== currentDay) return dayData;

      const updated = [...dayData.words];
      const current = updated[index].colorIndex;

      updated[index] = {
        ...updated[index],
        colorIndex: current === -1 ? 0 : (current + 1) % rainbowColors.length,
      };

      return { ...dayData, words: updated };
    });

    setDays(nextDays);
    await persistState(nextDays);
  };

  const handleChange = async (index, field, value) => {
    if (reviewMode || testSession) return;

    const nextDays = days.map((dayData) => {
      if (dayData.day !== currentDay) return dayData;

      const updated = [...dayData.words];
      updated[index] = { ...updated[index], [field]: value };

      return { ...dayData, words: updated };
    });

    setDays(nextDays);
    await persistState(nextDays);
  };

  const markAsCorrect = async (index) => {
    if (reviewMode || testSession) return;

    const nextDays = days.map((dayData) => {
      if (dayData.day !== currentDay) return dayData;

      const updated = [...dayData.words];
      updated[index] = { ...updated[index], colorIndex: -1 };

      return { ...dayData, words: updated };
    });

    setDays(nextDays);
    await persistState(nextDays);
  };

  const applyBulkPaste = async () => {
    if (reviewMode || testSession) return;

    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, WORDS_PER_DAY);

    const nextDays = days.map((dayData) => {
      if (dayData.day !== currentDay) return dayData;

      const updated = [...dayData.words];

      lines.forEach((line, i) => {
        const parts = line.includes("\t") ? line.split("\t") : line.split(/\s*,\s*/);

        updated[i] = {
          ...updated[i],
          word: (parts[0] || "").trim(),
          meaning: (parts.slice(1).join(" / ") || "").trim(),
        };
      });

      return { ...dayData, words: updated };
    });

    setDays(nextDays);
    await persistState(nextDays);
  };

  const addNextDay = async () => {
    const nextDay = Math.min(currentDay + 1, days.length);
    const nextWeek = getWeekFromDay(nextDay);
    const nextMonth = getMonthFromDay(nextDay);

    const nextExpandedMonths = { ...expandedMonths, [nextMonth]: true };
    const nextExpandedWeeks = { ...expandedWeeks, [nextWeek]: true };
    const nextReviewTarget = { type: "week", value: nextWeek };

    setCurrentDay(nextDay);
    setReviewMode(false);
    setReviewTarget(nextReviewTarget);
    setExpandedMonths(nextExpandedMonths);
    setExpandedWeeks(nextExpandedWeeks);
    setBulkText("");
    closeTestSession();

    await persistState(
      days,
      nextDay,
      false,
      nextReviewTarget,
      nextExpandedMonths,
      nextExpandedWeeks,
      testMode,
      showAnswers,
      randomHideMap,
      todayWrongWords,
      weeklyWrongMap,
      monthlyWrongMap,
      testDirection
    );
  };

  const resetCurrentDay = async () => {
    if (reviewMode || testSession) return;

    const nextDays = days.map((dayData) =>
      dayData.day === currentDay ? createDay(currentDay, true) : dayData
    );

    setDays(nextDays);
    await persistState(nextDays);
  };

  const toggleMonth = (month) => {
    setExpandedMonths((prev) => ({ ...prev, [month]: !prev[month] }));
  };

  const toggleWeek = (week) => {
    setExpandedWeeks((prev) => ({ ...prev, [week]: !prev[week] }));
  };

  const isActiveReview = (type, value) =>
    reviewMode && reviewTarget.type === type && reviewTarget.value === value;

  const installAsApp = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      await installPromptEvent.userChoice;
      setInstallPromptEvent(null);
      return;
    }

    alert(`휴대폰에서는 브라우저 메뉴에서 '홈 화면에 추가'를 누르면 앱처럼 실행할 수 있습니다.
아이폰: Safari 공유 버튼 → 홈 화면에 추가
안드로이드: Chrome 메뉴 → 홈 화면에 추가`);
  };

  const getHiddenType = (index) => {
    if (testMode === "hideMeaning") return "meaning";
    if (testMode === "hideWord") return "word";
    if (testMode === "random") return randomHideMap[index] || "meaning";
    return null;
  };

  const shuffleRandomMode = () => {
    const pattern = Array.from({ length: displayRows.length }, () =>
      Math.random() > 0.5 ? "word" : "meaning"
    );
    setRandomHideMap(pattern);
    setShowAnswers(false);
    setTestMode("random");
  };

  function speakWord(word) {
    if (!word || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function closeTestSession() {
    setTestSession(null);
    setTestInput("");
    setTestChecked(false);
    setTestFeedback(null);
  }

  function startTestSession(type, items, title) {
    const normalizedItems = shuffleArray(
      items
        .filter((item) => item.word?.trim() || item.meaning?.trim())
        .map((item) => enrichWord(item, item.originDay || item.day || currentDay))
    );

    if (normalizedItems.length === 0) {
      alert("출제할 단어가 없습니다.");
      return;
    }

    setReviewMode(false);
    setMenuOpen(false);
    setShowAnswers(false);
    setTestSession({
      type,
      title,
      items: normalizedItems,
      currentIndex: 0,
      correctCount: 0,
      wrongItems: [],
      finished: false,
    });
    setTestInput("");
    setTestChecked(false);
    setTestFeedback(null);
  }

  function startDailyTest() {
    startTestSession("daily", currentDayData.words, `${currentDay}일차 단어 테스트`);
  }

  function startTodayWrongTest() {
    startTestSession("dailyWrong", todayWrongWords, `${currentDay}일차 오답 테스트`);
  }

  function startWeeklyWrongTest(weekNumber) {
    const items = weeklyWrongMap[weekNumber] || [];
    startTestSession("weeklyWrong", items, `${weekNumber}주차 오답 테스트`);
  }

  function startMonthlyWrongTest(monthNumber) {
    const items = monthlyWrongMap[monthNumber] || [];
    startTestSession("monthlyWrong", items, `${monthNumber}달차 오답 테스트`);
  }

  async function finalizeTestSession(session) {
    if (!session) return;

    const wrongItems = session.wrongItems || [];

    if (session.type === "daily") {
      const nextTodayWrongWords = mergeUniqueWords([], wrongItems);
      setTodayWrongWords(nextTodayWrongWords);

      await persistState(
        days,
        currentDay,
        reviewMode,
        reviewTarget,
        expandedMonths,
        expandedWeeks,
        testMode,
        showAnswers,
        randomHideMap,
        nextTodayWrongWords,
        weeklyWrongMap,
        monthlyWrongMap,
        testDirection
      );
    }

    if (session.type === "dailyWrong") {
      const week = currentWeek;
      const prevWeekWords = weeklyWrongMap[week] || [];
      const nextWeekWords = mergeUniqueWords(prevWeekWords, wrongItems);
      const nextWeeklyWrongMap = {
        ...weeklyWrongMap,
        [week]: nextWeekWords,
      };

      setWeeklyWrongMap(nextWeeklyWrongMap);
      setTodayWrongWords([]);

      await persistState(
        days,
        currentDay,
        reviewMode,
        reviewTarget,
        expandedMonths,
        expandedWeeks,
        testMode,
        showAnswers,
        randomHideMap,
        [],
        nextWeeklyWrongMap,
        monthlyWrongMap,
        testDirection
      );
    }

    if (session.type === "weeklyWrong") {
      const week = currentWeek;
      const month = currentMonth;
      const prevMonthWords = monthlyWrongMap[month] || [];
      const nextMonthWords = mergeUniqueWords(prevMonthWords, wrongItems);

      const nextWeeklyWrongMap = {
        ...weeklyWrongMap,
        [week]: [],
      };

      const nextMonthlyWrongMap = {
        ...monthlyWrongMap,
        [month]: nextMonthWords,
      };

      setWeeklyWrongMap(nextWeeklyWrongMap);
      setMonthlyWrongMap(nextMonthlyWrongMap);

      await persistState(
        days,
        currentDay,
        reviewMode,
        reviewTarget,
        expandedMonths,
        expandedWeeks,
        testMode,
        showAnswers,
        randomHideMap,
        todayWrongWords,
        nextWeeklyWrongMap,
        nextMonthlyWrongMap,
        testDirection
      );
    }

    if (session.type === "monthlyWrong") {
      const month = currentMonth;
      const nextMonthlyWrongMap = {
        ...monthlyWrongMap,
        [month]: wrongItems,
      };

      setMonthlyWrongMap(nextMonthlyWrongMap);

      await persistState(
        days,
        currentDay,
        reviewMode,
        reviewTarget,
        expandedMonths,
        expandedWeeks,
        testMode,
        showAnswers,
        randomHideMap,
        todayWrongWords,
        weeklyWrongMap,
        nextMonthlyWrongMap,
        testDirection
      );
    }
  }

  function handleTestCheck() {
    if (!testSession || !currentTestItem || testChecked) return;

    const correct = isAnswerCorrect(testInput, currentTestItem, testDirection);

    setTestChecked(true);
    setTestFeedback({
      correct,
      correctAnswer:
        testDirection === "meaningToWord"
          ? currentTestItem.word
          : currentTestItem.meaning,
    });
  }

  async function handleTestNext() {
    if (!testSession || !currentTestItem || !testChecked || !testFeedback) return;

    const isCorrect = testFeedback.correct;
    const nextCorrectCount = testSession.correctCount + (isCorrect ? 1 : 0);
    const nextWrongItems = isCorrect
      ? testSession.wrongItems
      : [...testSession.wrongItems, currentTestItem];

    const isLast = testSession.currentIndex >= testSession.items.length - 1;

    if (isLast) {
      const finishedSession = {
        ...testSession,
        correctCount: nextCorrectCount,
        wrongItems: nextWrongItems,
        finished: true,
      };

      setTestSession(finishedSession);
      await finalizeTestSession(finishedSession);
      setTestChecked(false);
      setTestFeedback(null);
      setTestInput("");
      return;
    }

    setTestSession({
      ...testSession,
      correctCount: nextCorrectCount,
      wrongItems: nextWrongItems,
      currentIndex: testSession.currentIndex + 1,
    });
    setTestInput("");
    setTestChecked(false);
    setTestFeedback(null);
  }

  async function clearCloudState() {
    if (!user) {
      alert("로그인 후 사용하세요.");
      return;
    }

    const userIdKey = String(user.id);

    const { error } = await supabase
      .from("vocab_state")
      .delete()
      .eq("user_id", userIdKey);

    if (error) {
      console.error(error);
      alert("클라우드 초기화 실패");
      return;
    }

    const freshDays = createInitialDays();

    const freshState = {
      days: freshDays,
      currentDay: 1,
      reviewMode: false,
      reviewTarget: { type: "week", value: 1 },
      expandedMonths: { 1: true },
      expandedWeeks: { 1: true },
      testMode: "none",
      showAnswers: false,
      randomHideMap: buildRandomHideMap(WORDS_PER_DAY),
      todayWrongWords: [],
      weeklyWrongMap: {},
      monthlyWrongMap: {},
      testDirection: "meaningToWord",
    };

    setDays(freshDays);
    setCurrentDay(1);
    setReviewMode(false);
    setReviewTarget(freshState.reviewTarget);
    setExpandedMonths(freshState.expandedMonths);
    setExpandedWeeks(freshState.expandedWeeks);
    setTestMode("none");
    setShowAnswers(false);
    setRandomHideMap(freshState.randomHideMap);
    setTodayWrongWords([]);
    setWeeklyWrongMap({});
    setMonthlyWrongMap({});
    setTestDirection("meaningToWord");
    setBulkText("");
    closeTestSession();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
    await saveToCloud(freshState, user);

    alert("완전 초기화 완료");
  }

  async function handleSignUp() {
    if (authLoading) return;

    if (!username.trim() || !password.trim()) {
      setStatusMessage("아이디와 비밀번호를 입력하세요.");
      alert("아이디와 비밀번호를 입력하세요.");
      return;
    }

    setAuthLoading(true);
    setStatusMessage("회원가입 처리 중...");

    try {
      const passwordHash = simpleHash(password);

      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id, username")
        .eq("username", username.trim())
        .limit(1);

      if (checkError) {
        console.error(checkError);
        setStatusMessage("회원가입 확인 중 오류");
        alert("회원가입 확인 중 오류가 발생했습니다.");
        return;
      }

      if (existingUser && existingUser.length > 0) {
        setStatusMessage("이미 존재하는 아이디");
        alert("이미 존재하는 아이디입니다.");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .insert({
          username: username.trim(),
          password_hash: passwordHash,
        })
        .select("id, username");

      if (error) {
        console.error(error);
        setStatusMessage("회원가입 실패");
        alert("회원가입 실패");
        return;
      }

      if (!data || data.length === 0) {
        setStatusMessage("회원가입 결과 없음");
        alert("회원가입 결과를 확인할 수 없습니다.");
        return;
      }

      const sessionUser = {
        id: data[0].id,
        username: data[0].username,
      };

      setUser(sessionUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      setStatusMessage(`${sessionUser.username} 로그인됨`);
      await loadFromCloud(sessionUser);
      alert("회원가입 완료");
    } catch (e) {
      console.error(e);
      setStatusMessage("회원가입 중 예외 발생");
      alert("회원가입 중 오류가 발생했습니다.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignIn() {
    if (authLoading) return;

    if (!username.trim() || !password.trim()) {
      setStatusMessage("아이디와 비밀번호를 입력하세요.");
      alert("아이디와 비밀번호를 입력하세요.");
      return;
    }

    setAuthLoading(true);
    setStatusMessage("로그인 처리 중...");

    try {
      const passwordHash = simpleHash(password);

      const { data, error } = await supabase
        .from("users")
        .select("id, username, password_hash")
        .eq("username", username.trim())
        .limit(1);

      if (error) {
        console.error(error);
        setStatusMessage("로그인 실패");
        alert("로그인 실패");
        return;
      }

      if (!data || data.length === 0) {
        setStatusMessage("존재하지 않는 아이디");
        alert("존재하지 않는 아이디입니다.");
        return;
      }

      const targetUser = data[0];

      if (targetUser.password_hash !== passwordHash) {
        setStatusMessage("비밀번호 틀림");
        alert("비밀번호가 틀렸습니다.");
        return;
      }

      const sessionUser = {
        id: targetUser.id,
        username: targetUser.username,
      };

      setUser(sessionUser);
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      setStatusMessage(`${sessionUser.username} 로그인됨`);
      await loadFromCloud(sessionUser);
      alert("로그인 성공");
    } catch (e) {
      console.error(e);
      setStatusMessage("로그인 중 예외 발생");
      alert("로그인 중 오류가 발생했습니다.");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleSignOut() {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    setCloudLoaded(false);
    setStatusMessage("로그인 안 됨");
    closeTestSession();
    alert("로그아웃됨");
  }

  const displayUsername = user?.username || "";

  return (
    <div style={pageStyle}>
      {menuOpen && <div style={overlayStyle} onClick={() => setMenuOpen(false)} />}

      <button style={menuButtonStyle} onClick={() => setMenuOpen((prev) => !prev)}>
        ☰
      </button>

      <aside
        style={{
          ...drawerStyle,
          transform: menuOpen ? "translateX(0)" : "translateX(110%)",
        }}
      >
        <div style={drawerHeaderStyle}>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>메뉴</div>
          <button style={drawerCloseStyle} onClick={() => setMenuOpen(false)}>
            ✕
          </button>
        </div>

        <button
          style={drawerMainButtonStyle}
          onClick={() => {
            setReviewMode(false);
            closeTestSession();
            setMenuOpen(false);
          }}
        >
          단어 암기 프로그램으로 돌아가기
        </button>

        <div style={{ marginTop: "16px", fontWeight: "bold", marginBottom: "10px" }}>
          학습 구간
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {monthTree.map((month) => (
            <div key={`month-${month.month}`} style={{ marginBottom: "10px" }}>
              <div style={monthRowStyle}>
                <button onClick={() => toggleMonth(month.month)} style={toggleButtonStyle}>
                  {expandedMonths[month.month] ? "▼" : "▶"} {month.month}달차
                </button>

                <button
                  onClick={() => {
                    startMonthlyWrongTest(month.month);
                  }}
                  style={{
                    ...reviewPickButtonStyle,
                    backgroundColor:
                      (monthlyWrongMap[month.month] || []).length > 0 ? "#111" : "white",
                    color:
                      (monthlyWrongMap[month.month] || []).length > 0 ? "white" : "black",
                  }}
                >
                  월오답
                </button>
              </div>

              <div style={metaTextStyle}>
                {month.startDay}~{month.endDay}일 · 단어 {month.filledCount} · 오답 {month.wrongCount} ·
                월오답 {(monthlyWrongMap[month.month] || []).length}
              </div>

              {expandedMonths[month.month] && (
                <div style={weekListStyle}>
                  {month.weeks.map((week) => (
                    <div key={`week-${week.week}`} style={{ marginBottom: "8px" }}>
                      <div style={weekRowStyle}>
                        <button
                          onClick={() => toggleWeek(week.week)}
                          style={{
                            ...weekToggleStyle,
                            borderColor: isActiveReview("week", week.week) ? "#111" : "#ccc",
                          }}
                        >
                          {expandedWeeks[week.week] ? "▼" : "▶"} {week.week}주차
                        </button>

                        <button
                          onClick={() => startWeeklyWrongTest(week.week)}
                          style={{
                            ...reviewPickButtonStyle,
                            backgroundColor:
                              (weeklyWrongMap[week.week] || []).length > 0 ? "#111" : "white",
                            color:
                              (weeklyWrongMap[week.week] || []).length > 0 ? "white" : "black",
                          }}
                        >
                          주오답
                        </button>
                      </div>

                      <div style={metaTextStyle}>
                        {week.startDay}~{week.endDay}일 · 단어 {week.filledCount} · 오답 {week.wrongCount} ·
                        주오답 {(weeklyWrongMap[week.week] || []).length}
                      </div>

                      {expandedWeeks[week.week] && (
                        <div style={dayListStyle}>
                          {week.days.map((dayData) => {
                            const filledCount = dayData.words.filter((w) => w.word.trim()).length;
                            const wrongCount = dayData.words.filter((w) => w.colorIndex >= 0).length;
                            const active = !reviewMode && currentDay === dayData.day;

                            return (
                              <div key={`day-${dayData.day}`} style={dayRowStyle}>
                                <button
                                  onClick={() => {
                                    setCurrentDay(dayData.day);
                                    setReviewMode(false);
                                    setBulkText("");
                                    closeTestSession();
                                    setMenuOpen(false);
                                  }}
                                  style={{
                                    ...dayButtonStyle,
                                    backgroundColor: active ? "#111" : "white",
                                    color: active ? "white" : "black",
                                    borderColor: active ? "#111" : "#ccc",
                                  }}
                                >
                                  <div style={{ fontWeight: "bold" }}>{dayData.day}일차</div>
                                  <div style={metaTextStyle}>
                                    단어 {filledCount}/30 · 오답 {wrongCount}
                                  </div>
                                </button>

                                <button
                                  onClick={() => {
                                    setReviewTarget({ type: "day", value: dayData.day });
                                    setReviewMode(true);
                                    closeTestSession();
                                    setMenuOpen(false);
                                  }}
                                  style={{
                                    ...reviewPickButtonStyle,
                                    backgroundColor: isActiveReview("day", dayData.day) ? "#111" : "white",
                                    color: isActiveReview("day", dayData.day) ? "white" : "black",
                                  }}
                                >
                                  복습
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <main style={mainStyleFull}>
        <div
          style={{
            marginBottom: "12px",
            color: user ? "green" : "#666",
            fontWeight: "bold",
            paddingRight: "48px",
          }}
        >
          {statusMessage}
        </div>

        <div style={topAuthWrapStyle}>
          {user ? (
            <>
              <div style={loggedBoxStyle}>로그인: {displayUsername}</div>

              <button onClick={clearCloudState} style={toolbarButtonStyle}>
                전체 초기화
              </button>

              <button onClick={handleSignOut} style={toolbarButtonStyle}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="아이디"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={authInputStyle}
              />

              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={authInputStyle}
              />

              <button onClick={handleSignUp} style={toolbarButtonStyle} disabled={authLoading}>
                {authLoading ? "처리 중..." : "회원가입"}
              </button>

              <button onClick={handleSignIn} style={toolbarButtonStyle} disabled={authLoading}>
                {authLoading ? "처리 중..." : "로그인"}
              </button>
            </>
          )}
        </div>

        <h1 style={{ color: "black", marginTop: 0 }}>
          {testSession
            ? testSession.title
            : reviewMode
            ? reviewLabel
            : `단어 암기 프로그램 (${currentDay}일차)`}
        </h1>

        <div style={badgeWrapStyle}>
          <div style={infoBadgeStyle}>오늘 오답 {todayWrongWords.length}</div>
          <div style={infoBadgeStyle}>{currentWeek}주차 오답 {currentWeeklyWrongCount}</div>
          <div style={infoBadgeStyle}>{currentMonth}달차 오답 {currentMonthlyWrongCount}</div>
        </div>

        <div style={dayActionWrapStyle}>
          <button onClick={addNextDay} style={toolbarButtonStyle}>
            다음 일차
          </button>

          <button
            onClick={() => {
              setReviewMode((prev) => !prev);
              closeTestSession();
            }}
            style={toolbarButtonStyle}
          >
            {reviewMode ? "일반 보기" : reviewLabel}
          </button>

          <button onClick={resetCurrentDay} style={toolbarButtonStyle}>
            기본값 복원
          </button>

          <button onClick={installAsApp} style={toolbarButtonStyle}>
            홈 화면에 추가
          </button>
        </div>

        <div style={testToolbarStyle}>
          <button onClick={startDailyTest} style={toolbarButtonStyle}>
            오늘 테스트
          </button>

          <button
            onClick={startTodayWrongTest}
            style={{
              ...toolbarButtonStyle,
              backgroundColor: todayWrongWords.length > 0 ? "#111" : "white",
              color: todayWrongWords.length > 0 ? "white" : "black",
            }}
          >
            오늘 오답
          </button>

          <button
            onClick={() => startWeeklyWrongTest(currentWeek)}
            style={{
              ...toolbarButtonStyle,
              backgroundColor: currentWeeklyWrongCount > 0 ? "#111" : "white",
              color: currentWeeklyWrongCount > 0 ? "white" : "black",
            }}
          >
            주간 오답
          </button>

          <button
            onClick={() => startMonthlyWrongTest(currentMonth)}
            style={{
              ...toolbarButtonStyle,
              backgroundColor: currentMonthlyWrongCount > 0 ? "#111" : "white",
              color: currentMonthlyWrongCount > 0 ? "white" : "black",
            }}
          >
            월간 오답
          </button>
        </div>

        {testSession ? (
          <div style={testPanelStyle}>
            {testSession.finished ? (
              <>
                <div style={testTitleStyle}>테스트 완료</div>
                <div style={testSummaryStyle}>
                  총 {testSession.items.length}문제 · 정답 {testSession.correctCount}개 · 오답{" "}
                  {testSession.wrongItems.length}개
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={closeTestSession} style={toolbarButtonStyle}>
                    테스트 닫기
                  </button>

                  {testSession.type === "daily" && testSession.wrongItems.length > 0 && (
                    <button onClick={startTodayWrongTest} style={toolbarButtonStyle}>
                      오늘 오답 테스트
                    </button>
                  )}

                  {testSession.type === "dailyWrong" && (
                    <button onClick={() => startWeeklyWrongTest(currentWeek)} style={toolbarButtonStyle}>
                      주간 오답 테스트
                    </button>
                  )}

                  {testSession.type === "weeklyWrong" && (
                    <button onClick={() => startMonthlyWrongTest(currentMonth)} style={toolbarButtonStyle}>
                      월간 오답 테스트
                    </button>
                  )}
                </div>

                {testSession.wrongItems.length > 0 && (
                  <div style={{ marginTop: "14px" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "8px", color: "black" }}>
                      이번 테스트 오답
                    </div>
                    <div style={wrongListStyle}>
                      {testSession.wrongItems.map((item, idx) => (
                        <div key={`${wordKey(item)}-${idx}`} style={wrongItemStyle}>
                          <div style={{ fontWeight: "bold", color: "black" }}>{item.word}</div>
                          <div style={metaTextStyle}>{item.meaning}</div>
                          <div style={metaTextStyle}>원본 {item.originDay}일차</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={testHeaderRowStyle}>
                  <div style={testTitleStyle}>{testSession.title}</div>
                  <div style={testProgressStyle}>
                    {testSession.currentIndex + 1} / {testSession.items.length}
                  </div>
                </div>

                <div style={testDirectionInlineWrapStyle}>
                  <button
                    onClick={() => setTestDirection("meaningToWord")}
                    style={{
                      ...toolbarButtonStyle,
                      backgroundColor: testDirection === "meaningToWord" ? "#111" : "white",
                      color: testDirection === "meaningToWord" ? "white" : "black",
                    }}
                  >
                    뜻 보고 영어 쓰기
                  </button>

                  <button
                    onClick={() => setTestDirection("wordToMeaning")}
                    style={{
                      ...toolbarButtonStyle,
                      backgroundColor: testDirection === "wordToMeaning" ? "#111" : "white",
                      color: testDirection === "wordToMeaning" ? "white" : "black",
                    }}
                  >
                    영어 보고 뜻 쓰기
                  </button>
                </div>

                <div style={questionCardStyle}>
                  <div style={questionLabelStyle}>
                    {testDirection === "meaningToWord" ? "뜻" : "영어"}
                  </div>
                  <div style={questionTextStyle}>
                    {testDirection === "meaningToWord"
                      ? currentTestItem?.meaning
                      : currentTestItem?.word}
                  </div>

                  {currentTestItem?.originDay && (
                    <div style={metaTextStyle}>원본 {currentTestItem.originDay}일차</div>
                  )}
                </div>

                <input
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder={
                    testDirection === "meaningToWord"
                      ? "영어 단어를 입력하세요"
                      : "뜻을 입력하세요"
                  }
                  style={testInputStyle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (!testChecked) handleTestCheck();
                      else handleTestNext();
                    }
                  }}
                />

                {testChecked && testFeedback && (
                  <div
                    style={{
                      ...feedbackBoxStyle,
                      borderColor: testFeedback.correct ? "#1f8f4f" : "#c0392b",
                      background: testFeedback.correct ? "#eefaf2" : "#fff3f1",
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "black" }}>
                      {testFeedback.correct ? "정답" : "오답"}
                    </div>
                    {!testFeedback.correct && (
                      <div style={{ marginTop: "4px", color: "black" }}>
                        정답: {testFeedback.correctAnswer}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {!testChecked ? (
                    <button onClick={handleTestCheck} style={toolbarButtonStyle}>
                      채점
                    </button>
                  ) : (
                    <button onClick={handleTestNext} style={toolbarButtonStyle}>
                      다음 문제
                    </button>
                  )}

                  <button onClick={closeTestSession} style={toolbarButtonStyle}>
                    테스트 종료
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            <div style={sectionWrapStyle}>
              <button
                onClick={() => setShowStudyOptions((prev) => !prev)}
                style={{
                  ...toolbarButtonStyle,
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>학습 보기</span>
                <span>{showStudyOptions ? "▲" : "▼"}</span>
              </button>

              {showStudyOptions && (
                <div style={studyOptionWrapStyle}>
                  <button
                    onClick={() => {
                      setTestMode("none");
                      setShowAnswers(false);
                    }}
                    style={{
                      ...toolbarButtonStyle,
                      backgroundColor: testMode === "none" ? "#111" : "white",
                      color: testMode === "none" ? "white" : "black",
                    }}
                  >
                    일반
                  </button>

                  <button
                    onClick={() => {
                      setTestMode("hideMeaning");
                      setShowAnswers(false);
                    }}
                    style={{
                      ...toolbarButtonStyle,
                      backgroundColor: testMode === "hideMeaning" ? "#111" : "white",
                      color: testMode === "hideMeaning" ? "white" : "black",
                    }}
                  >
                    뜻 숨기기
                  </button>

                  <button
                    onClick={() => {
                      setTestMode("hideWord");
                      setShowAnswers(false);
                    }}
                    style={{
                      ...toolbarButtonStyle,
                      backgroundColor: testMode === "hideWord" ? "#111" : "white",
                      color: testMode === "hideWord" ? "white" : "black",
                    }}
                  >
                    단어 숨기기
                  </button>

                  <button
                    onClick={shuffleRandomMode}
                    style={{
                      ...toolbarButtonStyle,
                      backgroundColor: testMode === "random" ? "#111" : "white",
                      color: testMode === "random" ? "white" : "black",
                    }}
                  >
                    랜덤
                  </button>

                  <button
                    onClick={() => setShowAnswers((prev) => !prev)}
                    style={toolbarButtonStyle}
                  >
                    {showAnswers ? "정답 숨기기" : "정답 보기"}
                  </button>
                </div>
              )}
            </div>

            {!reviewMode && (
              <div style={pasteBlockStyle}>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`전체 복붙용 입력창
형식 예시:
a piece of cake\t아주 쉬운 일
break the ice\t어색한 분위기를 깨다`}
                  style={textareaStyle}
                />

                <button
                  onClick={applyBulkPaste}
                  style={{ ...actionButtonStyle, marginTop: "8px", maxWidth: "220px" }}
                >
                  전체 적용
                </button>
              </div>
            )}

            <div style={tableWrapStyle}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: "42px" }}>
                      {reviewMode ? "일" : "번호"}
                    </th>
                    <th style={wordThStyle}>단어</th>
                    <th style={meaningThStyle}>뜻</th>
                    <th style={{ ...thStyle, width: "54px" }}>발음</th>
                    {!reviewMode && <th style={{ ...thStyle, width: "58px" }}>정답</th>}
                  </tr>
                </thead>

                <tbody>
                  {displayRows.map((item, index) => {
                    const color = item.colorIndex === -1 ? "black" : rainbowColors[item.colorIndex];
                    const hiddenType = getHiddenType(index);
                    const hideWord = testMode !== "none" && hiddenType === "word" && !showAnswers;
                    const hideMeaning =
                      testMode !== "none" && hiddenType === "meaning" && !showAnswers;

                    return (
                      <tr key={reviewMode ? `${item.day}-${item.id}-${index}` : item.id}>
                        <td
                          style={{
                            ...smallTdStyle,
                            color,
                            fontWeight: "bold",
                            cursor: reviewMode ? "default" : "pointer",
                          }}
                          onClick={() => handleNumberClick(index)}
                        >
                          {reviewMode ? item.day : item.id}
                        </td>

                        <td style={{ ...wordTdStyle, color, fontWeight: "bold" }}>
                          {reviewMode ? (
                            hideWord ? <span style={hiddenTextStyle}>????</span> : item.word || "-"
                          ) : hideWord ? (
                            <span style={hiddenTextStyle}>????</span>
                          ) : (
                            <input
                              value={item.word}
                              onChange={(e) => handleChange(index, "word", e.target.value)}
                              style={{ ...compactInputStyle, color }}
                            />
                          )}
                        </td>

                        <td style={{ ...meaningTdStyle, color, fontWeight: "bold" }}>
                          {reviewMode ? (
                            hideMeaning ? (
                              <span style={hiddenTextStyle}>????</span>
                            ) : (
                              item.meaning || "-"
                            )
                          ) : hideMeaning ? (
                            <span style={hiddenTextStyle}>????</span>
                          ) : (
                            <input
                              value={item.meaning}
                              onChange={(e) => handleChange(index, "meaning", e.target.value)}
                              style={{ ...compactInputStyle, color }}
                            />
                          )}
                        </td>

                        <td style={smallTdStyle}>
                          <button onClick={() => speakWord(item.word)} style={tinyButtonStyle}>
                            🔊
                          </button>
                        </td>

                        {!reviewMode && (
                          <td style={smallTdStyle}>
                            <button onClick={() => markAsCorrect(index)} style={tinyButtonStyle}>
                              정답
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#f7f7f7",
  fontFamily: "sans-serif",
  position: "relative",
};

const mainStyleFull = {
  padding: "12px",
  maxWidth: "100%",
  boxSizing: "border-box",
};

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.25)",
  zIndex: 20,
};

const menuButtonStyle = {
  position: "fixed",
  top: "10px",
  right: "10px",
  zIndex: 30,
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  border: "1px solid #ccc",
  background: "white",
  color: "black",
  cursor: "pointer",
  fontSize: "20px",
};

const drawerStyle = {
  position: "fixed",
  top: 0,
  right: 0,
  width: "min(88vw, 360px)",
  height: "100vh",
  background: "white",
  borderLeft: "1px solid #ddd",
  zIndex: 40,
  transition: "transform 0.25s ease",
  padding: "14px",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
};

const drawerHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
};

const drawerCloseStyle = {
  width: "34px",
  height: "34px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  background: "white",
  cursor: "pointer",
};

const drawerMainButtonStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #ccc",
  borderRadius: "10px",
  background: "#111",
  color: "white",
  cursor: "pointer",
};

const topAuthWrapStyle = {
  marginBottom: "16px",
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const loggedBoxStyle = {
  padding: "10px 12px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  background: "white",
  color: "black",
};

const metaTextStyle = {
  fontSize: "12px",
  opacity: 0.8,
  color: "#555",
};

const monthRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 58px",
  gap: "6px",
  marginBottom: "4px",
};

const weekRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 58px",
  gap: "6px",
  marginBottom: "4px",
};

const dayRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 58px",
  gap: "6px",
  marginBottom: "6px",
};

const toggleButtonStyle = {
  width: "100%",
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "10px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  background: "white",
  color: "black",
  fontSize: "13px",
};

const reviewPickButtonStyle = {
  width: "100%",
  padding: "8px 4px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  background: "white",
  color: "black",
  cursor: "pointer",
  boxSizing: "border-box",
  fontSize: "11px",
};

const weekListStyle = {
  marginLeft: "10px",
  marginTop: "8px",
};

const weekToggleStyle = {
  width: "100%",
  padding: "8px",
  border: "1px solid #ccc",
  borderRadius: "10px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  background: "white",
  color: "black",
  fontSize: "13px",
};

const dayListStyle = {
  marginLeft: "10px",
  marginTop: "8px",
};

const dayButtonStyle = {
  width: "100%",
  padding: "8px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  background: "white",
};

const actionButtonStyle = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  background: "white",
  color: "black",
  cursor: "pointer",
  boxSizing: "border-box",
};

const testToolbarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginBottom: "14px",
};

const dayActionWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginBottom: "14px",
};

const toolbarButtonStyle = {
  padding: "9px 10px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  background: "white",
  color: "black",
  cursor: "pointer",
  fontSize: "13px",
};

const pasteBlockStyle = {
  marginBottom: "16px",
};

const textareaStyle = {
  width: "100%",
  minHeight: "120px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  padding: "10px",
  fontSize: "14px",
  color: "black",
  background: "white",
  resize: "vertical",
  boxSizing: "border-box",
};

const tableWrapStyle = {
  width: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
};

const tableStyle = {
  borderCollapse: "collapse",
  width: "100%",
  minWidth: "620px",
  tableLayout: "fixed",
  background: "white",
};

const thStyle = {
  border: "1px solid #ccc",
  padding: "8px 6px",
  background: "#f5f5f5",
  color: "black",
  textAlign: "center",
  fontSize: "12px",
  lineHeight: 1.2,
  whiteSpace: "nowrap",
};

const wordThStyle = {
  ...thStyle,
  width: "35%",
};

const meaningThStyle = {
  ...thStyle,
  width: "43%",
};

const smallTdStyle = {
  border: "1px solid #ccc",
  padding: "6px 4px",
  background: "white",
  textAlign: "center",
  fontSize: "12px",
  verticalAlign: "middle",
};

const wordTdStyle = {
  border: "1px solid #ccc",
  padding: "6px 6px",
  background: "white",
  fontSize: "12px",
  verticalAlign: "middle",
  wordBreak: "break-word",
  lineHeight: 1.35,
};

const meaningTdStyle = {
  border: "1px solid #ccc",
  padding: "6px 6px",
  background: "white",
  fontSize: "12px",
  verticalAlign: "middle",
  wordBreak: "break-word",
  lineHeight: 1.35,
};

const compactInputStyle = {
  width: "100%",
  border: "none",
  outline: "none",
  fontSize: "12px",
  background: "transparent",
  boxSizing: "border-box",
  lineHeight: 1.35,
  padding: 0,
};

const tinyButtonStyle = {
  width: "100%",
  padding: "6px 4px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  background: "white",
  color: "black",
  cursor: "pointer",
  boxSizing: "border-box",
  fontSize: "11px",
};

const hiddenTextStyle = {
  letterSpacing: "1px",
  color: "#999",
};

const authInputStyle = {
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  minWidth: "120px",
  flex: "1 1 140px",
};

const badgeWrapStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const infoBadgeStyle = {
  padding: "8px 10px",
  border: "1px solid #ddd",
  borderRadius: "999px",
  background: "white",
  fontSize: "12px",
  color: "black",
  fontWeight: "bold",
};

const testPanelStyle = {
  border: "1px solid #ddd",
  borderRadius: "16px",
  padding: "16px",
  background: "white",
  marginBottom: "16px",
  maxWidth: "720px",
  boxSizing: "border-box",
};

const testHeaderRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
  marginBottom: "12px",
  flexWrap: "wrap",
};

const testTitleStyle = {
  fontWeight: "bold",
  fontSize: "18px",
  color: "black",
};

const testProgressStyle = {
  fontSize: "13px",
  opacity: 0.8,
  color: "#444",
};

const questionCardStyle = {
  border: "1px solid #ddd",
  borderRadius: "12px",
  background: "white",
  padding: "16px",
  marginBottom: "12px",
  color: "black",
};

const questionLabelStyle = {
  fontSize: "12px",
  color: "#666",
  marginBottom: "8px",
  fontWeight: "bold",
};

const questionTextStyle = {
  fontWeight: "bold",
  fontSize: "28px",
  marginBottom: "10px",
  lineHeight: 1.4,
  color: "black",
  wordBreak: "keep-all",
};

const testInputStyle = {
  width: "100%",
  padding: "14px 12px",
  border: "1px solid #ccc",
  borderRadius: "10px",
  boxSizing: "border-box",
  marginBottom: "12px",
  fontSize: "16px",
  background: "white",
  color: "black",
  outline: "none",
};

const feedbackBoxStyle = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "12px",
  marginBottom: "12px",
};

const testSummaryStyle = {
  marginBottom: "12px",
  fontSize: "14px",
  color: "black",
};

const wrongListStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "8px",
};

const wrongItemStyle = {
  border: "1px solid #ddd",
  borderRadius: "10px",
  padding: "10px",
  background: "#fafafa",
};

const sectionWrapStyle = {
  marginBottom: "14px",
};

const studyOptionWrapStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  marginTop: "8px",
};

const testDirectionInlineWrapStyle = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  marginBottom: "12px",
};
