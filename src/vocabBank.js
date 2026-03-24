import wordPool from "./data/words-2000.json";

const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1"];

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

function normalizeWordKey(word) {
  return String(word || "").trim().toLowerCase();
}

function getDifficultyMix(dayNumber) {
  if (dayNumber <= 60) {
    return { A1: 18, A2: 10, B1: 2, B2: 0, C1: 0 };
  }
  if (dayNumber <= 150) {
    return { A1: 8, A2: 12, B1: 8, B2: 2, C1: 0 };
  }
  if (dayNumber <= 250) {
    return { A1: 2, A2: 8, B1: 12, B2: 7, C1: 1 };
  }
  return { A1: 0, A2: 4, B1: 10, B2: 12, C1: 4 };
}

const groupedPool = LEVEL_ORDER.reduce((acc, level) => {
  const items = wordPool.filter((item) => item.level === level);
  acc[level] = shuffleWithSeed(items, level.charCodeAt(0) * 101);
  return acc;
}, {});

const levelCursor = {
  A1: 0,
  A2: 0,
  B1: 0,
  B2: 0,
  C1: 0,
};

function takeFromLevel(level, count, usedSet) {
  const source = groupedPool[level] || [];
  const result = [];

  if (source.length === 0 || count <= 0) return result;

  let safety = 0;

  while (result.length < count && safety < source.length * 5) {
    const index = levelCursor[level] % source.length;
    const item = source[index];
    levelCursor[level] += 1;
    safety += 1;

    const key = normalizeWordKey(item.word);
    if (usedSet.has(key)) continue;

    usedSet.add(key);
    result.push(item);
  }

  return result;
}

function fillFallback(dayNumber, currentItems, usedSet, wordsPerDay) {
  if (currentItems.length >= wordsPerDay) return currentItems;

  const fallback = shuffleWithSeed(wordPool, dayNumber * 503);
  const next = [...currentItems];

  for (const item of fallback) {
    if (next.length >= wordsPerDay) break;

    const key = normalizeWordKey(item.word);
    if (usedSet.has(key)) continue;

    usedSet.add(key);
    next.push(item);
  }

  return next;
}

export function generateDayWords(dayNumber, wordsPerDay = 30) {
  const mix = getDifficultyMix(dayNumber);
  const usedSet = new Set();

  let picked = [];

  LEVEL_ORDER.forEach((level) => {
    picked = [...picked, ...takeFromLevel(level, mix[level] || 0, usedSet)];
  });

  picked = fillFallback(dayNumber, picked, usedSet, wordsPerDay);
  picked = shuffleWithSeed(picked, dayNumber * 701).slice(0, wordsPerDay);

  return picked.map((item, index) => ({
    id: index + 1,
    word: item.word,
    meaning: item.meaning,
    aliases: item.aliases || [],
    level: item.level || "A1",
    pos: item.pos || "",
    colorIndex: -1,
  }));
}
