import fs from "fs";

const FILES = [
  "./words-a1.csv",
  "./words-a2.csv",
  "./words-b1.csv",
  "./words-b2.csv",
  "./words-c1.csv",
];

const LEVEL_PRIORITY = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
};

function parseCsvLine(line) {
  const parts = line.split(",");

  return {
    word: (parts[0] || "").trim(),
    meaning: (parts[1] || "").trim(),
    aliases: (parts[2] || "")
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean),
    level: (parts[3] || "A1").trim(),
    pos: (parts[4] || "").trim(),
  };
}

function parseCsvFile(path) {
  if (!fs.existsSync(path)) {
    console.log(`파일 없음, 건너뜀: ${path}`);
    return [];
  }

  const csv = fs.readFileSync(path, "utf-8");
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [];
  }

  const [, ...rows] = lines;

  return rows
    .map(parseCsvLine)
    .filter((item) => item.word && item.meaning);
}

function normalizeText(text) {
  return String(text || "").trim().toLowerCase();
}

function normalizeAliases(arr = []) {
  const seen = new Set();
  const result = [];

  arr.forEach((item) => {
    const normalized = item.trim();
    const key = normalizeText(normalized);
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });

  return result;
}

function normalizeKey(item) {
  return `${normalizeText(item.word)}__${normalizeText(item.pos)}`;
}

function chooseBetterItem(oldItem, newItem) {
  const oldLevelRank = LEVEL_PRIORITY[oldItem.level] || 999;
  const newLevelRank = LEVEL_PRIORITY[newItem.level] || 999;

  let base = oldItem;

  if (newLevelRank < oldLevelRank) {
    base = newItem;
  }

  const mergedMeaning =
    base.meaning ||
    oldItem.meaning ||
    newItem.meaning;

  const mergedAliases = normalizeAliases([
    ...(oldItem.aliases || []),
    ...(newItem.aliases || []),
  ]);

  return {
    word: base.word || oldItem.word || newItem.word,
    meaning: mergedMeaning,
    aliases: mergedAliases,
    level: base.level || oldItem.level || newItem.level,
    pos: base.pos || oldItem.pos || newItem.pos,
  };
}

function sortByLevelThenWord(a, b) {
  const aRank = LEVEL_PRIORITY[a.level] || 999;
  const bRank = LEVEL_PRIORITY[b.level] || 999;

  if (aRank !== bRank) return aRank - bRank;

  return a.word.localeCompare(b.word, "en", { sensitivity: "base" });
}

const allWords = FILES.flatMap(parseCsvFile);

const mergedMap = new Map();

for (const item of allWords) {
  const key = normalizeKey(item);

  if (!mergedMap.has(key)) {
    mergedMap.set(key, {
      word: item.word,
      meaning: item.meaning,
      aliases: normalizeAliases(item.aliases || []),
      level: item.level,
      pos: item.pos,
    });
  } else {
    const prev = mergedMap.get(key);
    mergedMap.set(key, chooseBetterItem(prev, item));
  }
}

const result = Array.from(mergedMap.values())
  .sort(sortByLevelThenWord)
  .map((item, index) => ({
    id: index + 1,
    word: item.word,
    meaning: item.meaning,
    aliases: item.aliases || [],
    level: item.level,
    pos: item.pos || "",
  }));

fs.writeFileSync("./words-2000.json", JSON.stringify(result, null, 2), "utf-8");

const levelCount = result.reduce((acc, item) => {
  acc[item.level] = (acc[item.level] || 0) + 1;
  return acc;
}, {});

console.log(`${result.length}개 생성 완료`);
console.log("레벨별 개수:", levelCount);