const playBtn = document.getElementById("playBtn");
const backBtn = document.getElementById("backBtn");
const patchBtn = document.getElementById("patchNotesBtn");
const patchNotes = document.getElementById("patchNotes");

const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const inputBox = document.getElementById("inputBox");
const wordContainer = document.getElementById("wordContainer");
const scoreDisplay = document.getElementById("scoreDisplay");
const streakDisplay = document.getElementById("streakDisplay");
const modeSelect = document.getElementById("gameMode");

let gameInterval;
let words = ["flux", "type", "burst", "shift", "glitch", "level", "code", "boss", "node", "quick"];
let activeWords = [];
let score = 0;
let streak = 0;
let currentMode = "classic";

function startGame() {
  currentMode = modeSelect.value;
  console.clear();
  console.log("[Typing Flux] Game started in mode:", currentMode);

  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  inputBox.focus();

  score = 0;
  streak = 0;
  updateHUD();

  spawnWord();
  gameInterval = setInterval(spawnWord, 3000);
}

function spawnWord() {
  let wordText = currentMode === "boss" ? randomBossWord() : randomWord();
  const span = document.createElement("span");
  span.className = "word";
  span.textContent = wordText;
  span.dataset.word = wordText;
  span.style.left = Math.random() * 80 + "%";

  wordContainer.appendChild(span);
  activeWords.push(span);

  console.log(`[Word Spawned] ${wordText}`);

  setTimeout(() => {
    if (activeWords.includes(span)) {
      console.warn(`[Word Missed] ${span.dataset.word}`);
      span.remove();
      activeWords = activeWords.filter(w => w !== span);
      streak = 0;
      updateHUD();
    }
  }, 5000);
}

function randomWord() {
  let word = words[Math.floor(Math.random() * words.length)];
  let mutated = word;
  if (currentMode === "mutation") {
    mutated = mutateWord(word);
    if (mutated !== word) {
      console.log(`[Mutated Word] Original: ${word}, Mutated: ${mutated}`);
    }
  }
  return mutated;
}

function mutateWord(word) {
  if (word.length < 2) return word;
  if (Math.random() < 0.5) {
    const i = Math.floor(Math.random() * word.length);
    const j = Math.floor(Math.random() * word.length);
    let chars = word.split("");
    [chars[i], chars[j]] = [chars[j], chars[i]];
    return chars.join("");
  }
  return word;
}

function randomBossWord() {
  const bossWords = ["unstoppable", "fragmentation", "psychological", "implementation"];
  const word = bossWords[Math.floor(Math.random() * bossWords.length)];
  console.log(`[Boss Word Spawned] ${word}`);
  return word;
}

function updateHUD() {
  scoreDisplay.textContent = `Score: ${score}`;
  streakDisplay.textContent = `Streak: ${streak}`;
  console.log(`[Update HUD] Score: ${score}, Streak: ${streak}`);
}

inputBox.addEventListener("input", () => {
  const typed = inputBox.value.trim().toLowerCase();
  for (const wordEl of activeWords) {
    if (wordEl.dataset.word === typed) {
      console.log(`[Typed Correctly] ${typed}`);
      wordEl.remove();
      activeWords = activeWords.filter(w => w !== wordEl);
      score += 10;
      streak += 1;
      updateHUD();
      inputBox.value = "";
      return;
    }
  }
});

playBtn.onclick = () => {
  console.log("[Button Clicked] Play");
  startGame();
};

backBtn.onclick = () => {
  console.log("[Button Clicked] Back to Home");
  clearInterval(gameInterval);
  activeWords.forEach(w => w.remove());
  activeWords = [];
  inputBox.value = "";
  gameScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
};

patchBtn.onclick = () => {
  patchNotes.classList.toggle("hidden");
  console.log("[Button Clicked] Patch Notes Toggle:", !patchNotes.classList.contains("hidden"));
};
