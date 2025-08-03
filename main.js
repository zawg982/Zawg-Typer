const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const playBtn = document.getElementById("playBtn");
const backBtn = document.getElementById("backBtn");
const modeSelect = document.getElementById("modeSelect");
const inputBox = document.getElementById("inputBox");
const wordBox = document.getElementById("wordBox");
const scoreEl = document.getElementById("score");
const timeEl = document.getElementById("time");

let currentMode = "classic";
let currentWord = "";
let score = 0;
let time = 60;
let timer;
let mutationSuffixes = ["ify", "ness", "ment", "ation", "less", "ful"];
let classicWords = ["ocean", "flux", "dream", "power", "sky", "typing", "speed", "energy"];

playBtn.onclick = () => {
  currentMode = modeSelect.value;
  homeScreen.classList.remove("active");
  gameScreen.classList.add("active");
  startGame();
};

backBtn.onclick = () => {
  clearInterval(timer);
  gameScreen.classList.remove("active");
  homeScreen.classList.add("active");
  inputBox.value = "";
};

function startGame() {
  score = 0;
  time = 60;
  scoreEl.textContent = score;
  timeEl.textContent = time;
  inputBox.value = "";
  generateWord();
  inputBox.focus();
  timer = setInterval(() => {
    time--;
    timeEl.textContent = time;
    if (time <= 0) {
      clearInterval(timer);
      wordBox.textContent = "Game Over!";
    }
  }, 1000);
}

function generateWord() {
  if (currentMode === "classic") {
    currentWord = classicWords[Math.floor(Math.random() * classicWords.length)];
  } else if (currentMode === "mutation") {
    let base = classicWords[Math.floor(Math.random() * classicWords.length)];
    let suffix = mutationSuffixes[Math.floor(Math.random() * mutationSuffixes.length)];
    currentWord = base.slice(0, 2) + suffix; // scrambled word but with known suffix
  }
  wordBox.textContent = currentWord;
  console.log(`[DEBUG] New word: ${currentWord}`);
}

inputBox.addEventListener("input", () => {
  let typed = inputBox.value.trim();
  if (currentMode === "classic" && typed === currentWord) {
    score++;
    updateAfterCorrect();
  } else if (currentMode === "mutation") {
    // check if the correct suffix was typed
    for (let suffix of mutationSuffixes) {
      if (currentWord.endsWith(suffix) && typed === suffix) {
        score++;
        updateAfterCorrect();
        return;
      }
    }
  }
});

function updateAfterCorrect() {
  console.log("[DEBUG] Correct input. Score +1");
  scoreEl.textContent = score;
  inputBox.value = "";
  generateWord();
}
