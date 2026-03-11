import { useEffect, useMemo, useState } from "react";

const WORDS_PER_DAY = 30;
const STORAGE_KEY = "vocab-memorizer-full-v1";

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

export default function App() {
  const [days, setDays] = useState([createDay(1)]);
  const [currentDay, setCurrentDay] = useState(1);

  const [reviewMode, setReviewMode] = useState(false);
  const [reviewTarget, setReviewTarget] = useState({ type: "week", value: 1 });

  const [expandedMonths, setExpandedMonths] = useState({ 1: true });
  const [expandedWeeks, setExpandedWeeks] = useState({ 1: true });

  const [loaded, setLoaded] = useState(false);

  const [testMode, setTestMode] = useState("none"); // none | hideMeaning | hideWord | random
  const [showAnswers, setShowAnswers] = useState(false);
  const [randomHideMap, setRandomHideMap] = useState(buildRandomHideMap(WORDS_PER_DAY));

  const [bulkText, setBulkText] = useState("");
  const [installPromptEvent, setInstallPromptEvent] = useState(null);

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
          setRandomHideMap(parsed.randomHideMap || buildRandomHideMap(WORDS_PER_DAY));
        }
      }
    } catch (e) {
      console.error("저장 데이터 불러오기 실패:", e);
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
        const parts = line.includes("\t")
          ? line.split("\t")
          : line.split(/\s*,\s*/);

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

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <aside style={sidebarStyle}>
          <h2 style={titleStyle}>학습 구간</h2>

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

          <button onClick={addNextDay} style={{ ...actionButtonStyle, marginTop: "12px" }}>
            다음 일차 추가
          </button>

          <button
            onClick={() => setReviewMode((prev) => !prev)}
            style={{ ...actionButtonStyle, marginTop: "10px" }}
          >
            {reviewMode ? "일반 보기로 돌아가기" : reviewLabel}
          </button>

          <button onClick={resetCurrentDay} style={{ ...actionButtonStyle, marginTop: "10px" }}>
            현재 일차 초기화
          </button>

          <button onClick={installAsApp} style={{ ...actionButtonStyle, marginTop: "10px" }}>
            홈 화면에 추가
          </button>

          <div style={infoTextStyle}>
            새로고침해도 자동 저장됩니다.
            <br />
            달차 → 주차 → 일차 순서로 펼쳐서 선택할 수 있습니다.
            <br />
            각 달차/주차/일차 옆의 복습 버튼으로 틀린 단어만 볼 수 있습니다.
          </div>
        </aside>

        <main style={mainStyle}>
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
actually\t사실은
almost\t거의
already\t이미`}
                style={textareaStyle}
              />

              <button onClick={applyBulkPaste} style={{ ...actionButtonStyle, marginTop: "8px" }}>
                전체 적용
              </button>
            </div>
          )}

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: reviewMode ? "90px" : "70px" }}>
                  {reviewMode ? "일차" : "번호"}
                </th>
                <th style={thStyle}>단어</th>
                <th style={thStyle}>뜻</th>
                {!reviewMode && <th style={{ ...thStyle, width: "90px" }}>정답</th>}
              </tr>
            </thead>

            <tbody>
              {displayRows.map((item, index) => {
                const color =
                  item.colorIndex === -1 ? "black" : rainbowColors[item.colorIndex];

                const hiddenType = getHiddenType(index);
                const hideWord = testMode !== "none" && hiddenType === "word" && !showAnswers;
                const hideMeaning =
                  testMode !== "none" && hiddenType === "meaning" && !showAnswers;

                return (
                  <tr key={reviewMode ? `${item.day}-${item.id}-${index}` : item.id}>
                    <td
                      style={{
                        ...tdStyle,
                        color,
                        fontWeight: "bold",
                        cursor: reviewMode ? "default" : "pointer",
                      }}
                      onClick={() => handleNumberClick(index)}
                    >
                      {reviewMode ? `${item.day}일차` : item.id}
                    </td>

                    <td style={{ ...tdStyle, color, fontWeight: "bold" }}>
                      {reviewMode ? (
                        hideWord ? (
                          <span style={hiddenTextStyle}>????</span>
                        ) : (
                          item.word || "-"
                        )
                      ) : hideWord ? (
                        <span style={hiddenTextStyle}>????</span>
                      ) : (
                        <input
                          value={item.word}
                          onChange={(e) => handleChange(index, "word", e.target.value)}
                          style={{ ...inputStyle, color }}
                        />
                      )}
                    </td>

                    <td style={{ ...tdStyle, color, fontWeight: "bold" }}>
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
                          style={{ ...inputStyle, color }}
                        />
                      )}
                    </td>

                    {!reviewMode && (
                      <td style={tdStyle}>
                        <button onClick={() => markAsCorrect(index)} style={smallButtonStyle}>
                          정답
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
}

const pageStyle = {
  padding: "10px",
  fontFamily: "sans-serif",
  background: "#f7f7f7",
  height: "100vh",
  overflow: "hidden",
  boxSizing: "border-box",
};

const layoutStyle = {
  display: "grid",
  gridTemplateColumns: "320px 1fr",
  gap: "10px",
  height: "100%",
};

const sidebarStyle = {
  background: "white",
  border: "1px solid #ddd",
  borderRadius: "14px",
  padding: "12px",
  overflowY: "auto",
  boxSizing: "border-box",
};

const mainStyle = {
  background: "white",
  border: "1px solid #ddd",
  borderRadius: "14px",
  padding: "20px",
  overflowY: "auto",
  overflowX: "hidden",
  boxSizing: "border-box",
};

const titleStyle = {
  marginTop: 0,
  marginBottom: "16px",
  color: "black",
};

const metaTextStyle = {
  fontSize: "13px",
  opacity: 0.8,
};

const monthRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 64px",
  gap: "8px",
  marginBottom: "4px",
};

const weekRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 64px",
  gap: "8px",
  marginBottom: "4px",
};

const dayRowStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 64px",
  gap: "8px",
  marginBottom: "6px",
};

const toggleButtonStyle = {
  width: "100%",
  padding: "12px",
  border: "1px solid #ccc",
  borderRadius: "10px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  background: "white",
  color: "black",
};

const reviewPickButtonStyle = {
  width: "100%",
  padding: "10px 6px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  background: "white",
  color: "black",
  cursor: "pointer",
  boxSizing: "border-box",
  fontSize: "12px",
};

const weekListStyle = {
  marginLeft: "12px",
  marginTop: "8px",
};

const weekToggleStyle = {
  width: "100%",
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "10px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
  background: "white",
  color: "black",
};

const dayListStyle = {
  marginLeft: "12px",
  marginTop: "8px",
};

const dayButtonStyle = {
  width: "100%",
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
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
  fontSize: "13px",
  color: "#555",
  lineHeight: 1.6,
};

const testToolbarStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "16px",
};

const toolbarButtonStyle = {
  padding: "10px 12px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  background: "white",
  color: "black",
  cursor: "pointer",
};

const pasteBlockStyle = {
  marginBottom: "18px",
};

const textareaStyle = {
  width: "100%",
  minHeight: "140px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  padding: "10px",
  fontSize: "14px",
  color: "black",
  background: "white",
  resize: "vertical",
  boxSizing: "border-box",
};

const tableStyle = {
  borderCollapse: "collapse",
  width: "100%",
  tableLayout: "fixed",
  background: "white",
};

const thStyle = {
  border: "1px solid #ccc",
  padding: "10px",
  background: "#f5f5f5",
  color: "black",
  textAlign: "left",
};

const tdStyle = {
  border: "1px solid #ccc",
  padding: "10px",
  background: "white",
  wordBreak: "break-word",
};

const inputStyle = {
  width: "100%",
  border: "none",
  outline: "none",
  fontSize: "16px",
  background: "transparent",
  boxSizing: "border-box",
};

const smallButtonStyle = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #ccc",
  borderRadius: "8px",
  background: "white",
  color: "black",
  cursor: "pointer",
  boxSizing: "border-box",
};

const hiddenTextStyle = {
  letterSpacing: "2px",
  color: "#999",
};