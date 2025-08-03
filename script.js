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
let words = ["flux", "type", "burst", "shift", "glitch", "level", "code", "boss", "node", "quick", "bombastic"];
let activeWords = [];
let score = 0;
let streak = 0;
let currentMode = "classic";

function startGame() {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  inputBox.focus();
  score = 0;
  streak = 0;
  updateHUD();
  currentMode = modeSelect.value;
  spawnWord();
  gameInterval = setInterval(spawnWord, 3000);
}

function spawnWord() {
  const wordText = (currentMode === "boss") ? randomBossWord() : randomWord();
  const span = document.createElement("span");
  span.className = "word";
  span.textContent = wordText;
  span.dataset.word = wordText;
  span.style.left = Math.random() * 80 + "%";
  wordContainer.appendChild(span);
  activeWords.push(span);

  // Auto-remove after fall
  setTimeout(() => {
    if (activeWords.includes(span)) {
      span.remove();
      activeWords = activeWords.filter(w => w !== span);
      streak = 0;
      updateHUD();
    }
  }, 5000);
}

function randomWord() {
  let word = words[Math.floor(Math.random() * words.length)];
  return currentMode === "mutation" ? mutateWord(word) : word;
}

function mutateWord(word) {
  if (Math.random() < 0.5) {
    const i = Math.floor(Math.random() * word.length);
    const j = Math.floor(Math.random() * word.length);
    return word.split("").map((c, idx) => (idx === i ? word[j] : (idx === j ? word[i] : c))).join("");
  }
  return word;
}

function randomBossWord() {
  const bossWords = ["unstoppable", "fragmentation", "psychological", "implementation"];
  return bossWords[Math.floor(Math.random() * bossWords.length)];
}

function updateHUD() {
  scoreDisplay.textContent = `Score: ${score}`;
  streakDisplay.textContent = `Streak: ${streak}`;
}

inputBox.addEventListener("input", () => {
  const typed = inputBox.value.trim().toLowerCase();
  for (const wordEl of activeWords) {
    if (wordEl.dataset.word === typed) {
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

playBtn.onclick = startGame;

backBtn.onclick = () => {
  clearInterval(gameInterval);
  activeWords.forEach(w => w.remove());
  activeWords = [];
  inputBox.value = "";
  gameScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
};

patchBtn.onclick = () => patchNotes.classList.toggle("hidden");
