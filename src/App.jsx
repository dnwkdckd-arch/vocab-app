import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

const WORDS_PER_DAY = 30;
const STORAGE_KEY = "vocab-memorizer-local-v4";
const SESSION_KEY = "vocab-custom-session-v4";

const rainbowColors = [
  "red",
  "orange",
  "gold",
  "green",
  "blue",
  "indigo",
  "violet",
];

const createDayWords = () =>
  Array.from({ length: WORDS_PER_DAY }, (_, i) => ({
    id: i + 1,
    word: "",
    meaning: "",
    colorIndex: -1,
  }));

const createDay = (dayNumber) => ({
  day: dayNumber,
  words: createDayWords(),
});

const buildRandomHideMap = (length) =>
  Array.from({ length }, () => (Math.random() > 0.5 ? "word" : "meaning"));

function simpleHash(text) {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export default function App() {
  const [days, setDays] = useState([createDay(1)]);
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
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        days,
        currentDay,
        reviewMode,
        reviewTarget,
        expandedMonths,
        expandedWeeks,
        testMode,
        showAnswers,
        randomHideMap,
      })
    );
  }, [
    days,
    currentDay,
    reviewMode,
    reviewTarget,
    expandedMonths,
    expandedWeeks,
    testMode,
    showAnswers,
    randomHideMap,
    loaded,
  ]);

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
        const week = Math.floor((dayData.day - 1) / 7) + 1;
        include = week === reviewTarget.value;
      } else if (reviewTarget.type === "month") {
        const month = Math.floor((dayData.day - 1) / 30) + 1;
        include = month === reviewTarget.value;
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

  const updateCurrentDayWords = (updater) => {
    setDays((prev) =>
      prev.map((dayData) => {
        if (dayData.day !== currentDay) return dayData;
        return { ...dayData, words: updater(dayData.words) };
      })
    );
  };

  const handleNumberClick = (index) => {
    if (reviewMode) return;

    updateCurrentDayWords((words) => {
      const updated = [...words];
      const current = updated[index].colorIndex;
      updated[index] = {
        ...updated[index],
        colorIndex: current === -1 ? 0 : (current + 1) % rainbowColors.length,
      };
      return updated;
    });
  };

  const handleChange = (index, field, value) => {
    if (reviewMode) return;

    updateCurrentDayWords((words) => {
      const updated = [...words];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const markAsCorrect = (index) => {
    if (reviewMode) return;

    updateCurrentDayWords((words) => {
      const updated = [...words];
      updated[index] = { ...updated[index], colorIndex: -1 };
      return updated;
    });
  };

  const applyBulkPaste = () => {
    if (reviewMode) return;

    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, WORDS_PER_DAY);

    updateCurrentDayWords((words) => {
      const updated = [...words];

      lines.forEach((line, i) => {
        const parts = line.includes("\t") ? line.split("\t") : line.split(/\s*,\s*/);

        updated[i] = {
          ...updated[i],
          word: (parts[0] || "").trim(),
          meaning: (parts.slice(1).join(" / ") || "").trim(),
        };
      });

      return updated;
    });
  };

  const addNextDay = () => {
    const nextDay = days.length + 1;
    const nextWeek = Math.floor((nextDay - 1) / 7) + 1;
    const nextMonth = Math.floor((nextDay - 1) / 30) + 1;

    setDays((prev) => [...prev, createDay(nextDay)]);
    setCurrentDay(nextDay);
    setReviewMode(false);
    setReviewTarget({ type: "week", value: nextWeek });
    setExpandedMonths((prev) => ({ ...prev, [nextMonth]: true }));
    setExpandedWeeks((prev) => ({ ...prev, [nextWeek]: true }));
    setBulkText("");
  };

  const resetCurrentDay = () => {
    if (reviewMode) return;
    setDays((prev) =>
      prev.map((dayData) => (dayData.day === currentDay ? createDay(currentDay) : dayData))
    );
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
    alert("로그아웃됨");
  }

  async function saveToCloud(state) {
    if (!user) return;

    const { error } = await supabase.from("vocab_state").upsert({
      user_id: user.id,
      data: state,
    });

    if (error) {
      console.error("클라우드 저장 실패:", error);
    }
  }

  async function loadFromCloud() {
    if (!user) return;

    const { data, error } = await supabase
      .from("vocab_state")
      .select("data")
      .eq("user_id", user.id)
      .limit(1);

    if (error) {
      console.error("클라우드 불러오기 실패:", error);
      setCloudLoaded(true);
      return;
    }

    if (data && data.length > 0 && data[0].data) {
      const saved = data[0].data;

      if (saved.days) setDays(saved.days);
      if (saved.currentDay) setCurrentDay(saved.currentDay);
      if (typeof saved.reviewMode === "boolean") setReviewMode(saved.reviewMode);
      if (saved.reviewTarget) setReviewTarget(saved.reviewTarget);
      if (saved.expandedMonths) setExpandedMonths(saved.expandedMonths);
      if (saved.expandedWeeks) setExpandedWeeks(saved.expandedWeeks);
      if (saved.testMode) setTestMode(saved.testMode);
      if (typeof saved.showAnswers === "boolean") setShowAnswers(saved.showAnswers);
      if (saved.randomHideMap) setRandomHideMap(saved.randomHideMap);
    }

    setCloudLoaded(true);
  }

  useEffect(() => {
    if (user) {
      setCloudLoaded(false);
      loadFromCloud();
    }
  }, [user]);

  useEffect(() => {
    if (!user || !cloudLoaded) return;

    const state = {
      days,
      currentDay,
      reviewMode,
      reviewTarget,
      expandedMonths,
      expandedWeeks,
      testMode,
      showAnswers,
      randomHideMap,
    };

    saveToCloud(state);
  }, [
    user,
    cloudLoaded,
    days,
    currentDay,
    reviewMode,
    reviewTarget,
    expandedMonths,
    expandedWeeks,
    testMode,
    showAnswers,
    randomHideMap,
  ]);

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
                    setReviewTarget({ type: "month", value: month.month });
                    setReviewMode(true);
                    setMenuOpen(false);
                  }}
                  style={{
                    ...reviewPickButtonStyle,
                    backgroundColor: isActiveReview("month", month.month) ? "#111" : "white",
                    color: isActiveReview("month", month.month) ? "white" : "black",
                  }}
                >
                  복습
                </button>
              </div>

              <div style={metaTextStyle}>
                {month.startDay}~{month.endDay}일 · 단어 {month.filledCount} · 오답 {month.wrongCount}
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
                          onClick={() => {
                            setReviewTarget({ type: "week", value: week.week });
                            setReviewMode(true);
                            setMenuOpen(false);
                          }}
                          style={{
                            ...reviewPickButtonStyle,
                            backgroundColor: isActiveReview("week", week.week) ? "#111" : "white",
                            color: isActiveReview("week", week.week) ? "white" : "black",
                          }}
                        >
                          복습
                        </button>
                      </div>

                      <div style={metaTextStyle}>
                        {week.startDay}~{week.endDay}일 · 단어 {week.filledCount} · 오답 {week.wrongCount}
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
          {reviewMode ? reviewLabel : `단어 암기 프로그램 (${currentDay}일차)`}
        </h1>

        <div style={testToolbarStyle}>
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
            일반 모드
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
            랜덤 숨기기
          </button>

          <button onClick={() => setShowAnswers((prev) => !prev)} style={toolbarButtonStyle}>
            {showAnswers ? "정답 가리기" : "정답 보기"}
          </button>
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

            <button onClick={applyBulkPaste} style={{ ...actionButtonStyle, marginTop: "8px", maxWidth: "220px" }}>
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

const infoTextStyle = {
  marginTop: "16px",
  fontSize: "12px",
  color: "#555",
  lineHeight: 1.6,
};

const testToolbarStyle = {
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
