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
let timeLimit = 60;
let timeLeft = 60;
let timer;
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
  timeLeft = timeLimit;
  updateHUD();

  clearInterval(gameInterval);
  clearInterval(timer);
  activeWords.forEach(w => w.el.remove());
  activeWords = [];

  if (currentMode === "timerush") {
    timer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  spawnWord();
  gameInterval = setInterval(spawnWord, 3000);
}

function endGame() {
  clearInterval(gameInterval);
  clearInterval(timer);
  inputBox.disabled = true;
  console.log("[Game Ended] Final score:", score);
  alert("Game Over! Final Score: " + score);
}

function spawnWord() {
  const original = currentMode === "boss" ? randomBossWord() : randomWord();
  let display = original;

  if (currentMode === "mutation") {
    display = mutateWord(original);
    if (display !== original) {
      console.log(`[Mutated] Display: ${display}, Original: ${original}`);
    }
  }

  if (currentMode === "reverse") {
    display = original.split("").reverse().join("");
    console.log(`[Reverse] Display: ${display}, Original: ${original}`);
  }

  const span = document.createElement("span");
  span.className = "word";
  span.textContent = display;
  span.dataset.word = original;
  span.style.left = Math.random() * 80 + "%";

  wordContainer.appendChild(span);
  activeWords.push({ el: span, original });

  console.log(`[Spawned] ${display} (${original})`);

  setTimeout(() => {
    const index = activeWords.findIndex(w => w.el === span);
    if (index !== -1) {
      span.remove();
      activeWords.splice(index, 1);
      console.warn(`[Missed] ${original}`);
      streak = 0;
      updateHUD();
    }
  }, 5000);
}

function randomWord() {
  return words[Math.floor(Math.random() * words.length)];
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
  const bossWords = ["implementation", "psychological", "fragmentation", "resilience"];
  const word = bossWords[Math.floor(Math.random() * bossWords.length)];
  console.log(`[Boss Word] ${word}`);
  return word;
}

function updateHUD() {
  scoreDisplay.textContent = `Score: ${score}`;
  streakDisplay.textContent = `Streak: ${streak}`;
  if (currentMode === "timerush") {
    streakDisplay.textContent += ` | Time: ${timeLeft}s`;
  }
  console.log(`[HUD] Score: ${score}, Streak: ${streak}, Time: ${timeLeft}`);
}

inputBox.addEventListener("input", () => {
  const typed = inputBox.value.trim().toLowerCase();
  for (const w of activeWords) {
    if (typed === w.original.toLowerCase()) {
      console.log(`[Correct] Typed: ${typed}`);
      w.el.remove();
      activeWords = activeWords.filter(x => x !== w);
      score += 10;
      streak += 1;
      updateHUD();
      inputBox.value = "";
      return;
    }
  }
});

playBtn.onclick = () => {
  console.log("[Button] Play");
  inputBox.disabled = false;
  startGame();
};

backBtn.onclick = () => {
  console.log("[Button] Back to Home");
  clearInterval(gameInterval);
  clearInterval(timer);
  activeWords.forEach(w => w.el.remove());
  activeWords = [];
  inputBox.value = "";
  inputBox.disabled = false;
  gameScreen.classList.add("hidden");
  homeScreen.classList.remove("hidden");
};

patchBtn.onclick = () => {
  patchNotes.classList.toggle("hidden");
  console.log("[Button] Toggle Patch Notes:", !patchNotes.classList.contains("hidden"));
};
