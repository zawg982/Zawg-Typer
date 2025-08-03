// Elements
const homeScreen = document.getElementById('homeScreen');
const patchNotes = document.getElementById('patchNotes');
const gameScreen = document.getElementById('gameScreen');

const modeSelect = document.getElementById('modeSelect');
const playBtn = document.getElementById('playBtn');
const patchBtn = document.getElementById('patchBtn');
const backFromPatch = document.getElementById('backFromPatch');
const quitBtn = document.getElementById('quitBtn');

const scoreElem = document.getElementById('score');
const timerElem = document.getElementById('timer');
const wordArea = document.getElementById('wordArea');
const inputBox = document.getElementById('inputBox');

let gameMode = 'classic';
let score = 0;
let timeLeft = 60;
let currentWord = '';
let wordsList = [];
let gameInterval;
let timerInterval;
let mutationInterval;

// Word banks for modes
const wordsClassic = ['apple', 'banana', 'cherry', 'dragon', 'elephant', 'forest', 'guitar', 'honey', 'island', 'jungle', 'keyboard', 'lemon', 'mountain', 'notebook', 'orange', 'piano', 'queen', 'river', 'sunshine', 'tiger', 'umbrella', 'violet', 'window', 'xylophone', 'yellow', 'zebra'];

const wordsMutation = [...wordsClassic]; // We'll mutate these

const bossWords = [
  'extraordinary',
  'congratulations',
  'revolutionary',
  'implementation',
  'programming',
  'optimization',
  'development',
  'architecture',
  'javascript',
  'application',
];

// Utility: Pick random element
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- UI Switching ---
function showScreen(screen) {
  [homeScreen, patchNotes, gameScreen].forEach(s => s.classList.add('hidden'));
  screen.classList.remove('hidden');
  inputBox.value = '';
  inputBox.classList.remove('correct', 'incorrect');
}

// --- Mutation helper ---
function mutateWord(word) {
  let arr = word.split('');
  let index = Math.floor(Math.random() * arr.length);
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  arr[index] = letters[Math.floor(Math.random() * letters.length)];
  return arr.join('');
}

// --- Game Logic ---
function startGame() {
  score = 0;
  timeLeft = 60;
  scoreElem.textContent = score;
  timerElem.textContent = timeLeft;
  wordArea.textContent = '';
  inputBox.value = '';
  inputBox.focus();

  // Select words list based on mode
  if (gameMode === 'classic') {
    wordsList = [...wordsClassic];
  } else if (gameMode === 'mutation') {
    wordsList = [...wordsMutation];
  } else if (gameMode === 'boss') {
    wordsList = [...bossWords];
  }

  showScreen(gameScreen);

  nextWord();

  timerInterval = setInterval(() => {
    timeLeft--;
    timerElem.textContent = timeLeft;
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);

  if (gameMode === 'mutation') {
    mutationInterval = setInterval(() => {
      if (!currentWord) return;
      currentWord = mutateWord(currentWord);
      displayWord(currentWord, '');
    }, 2000);
  }
}

function endGame() {
  clearInterval(timerInterval);
  clearInterval(mutationInterval);
  alert(`Time's up! Your score: ${score}`);
  showScreen(homeScreen);
}

// Display the word with no input highlight (empty typed)
function displayWord(word, typed) {
  // Show the word with letters color-coded for typed vs untyped
  let html = '';
  for (let i = 0; i < word.length; i++) {
    if (i < typed.length) {
      if (word[i] === typed[i]) {
        html += `<span style="color:#7fff7f;">${word[i]}</span>`;
      } else {
        html += `<span style="color:#ff7f7f;">${word[i]}</span>`;
      }
    } else {
      html += `<span>${word[i]}</span>`;
    }
  }
  wordArea.innerHTML = html;
}

// Pick next word and display
function nextWord() {
  if (wordsList.length === 0) {
    // Reset words list to repeat
    if (gameMode === 'classic') wordsList = [...wordsClassic];
    else if (gameMode === 'mutation') wordsList = [...wordsMutation];
    else if (gameMode === 'boss') wordsList = [...bossWords];
  }
  currentWord = pickRandom(wordsList);
  displayWord(currentWord, '');
  inputBox.value = '';
  inputBox.classList.remove('correct', 'incorrect');
}

// --- Input handling ---
inputBox.addEventListener('input', e => {
  const val = e.target.value.toLowerCase();
  displayWord(currentWord, val);

  if (currentWord.startsWith(val)) {
    inputBox.classList.remove('incorrect');
    inputBox.classList.add('correct');
  } else {
    inputBox.classList.remove('correct');
    inputBox.classList.add('incorrect');
  }

  if (val === currentWord) {
    score += currentWord.length * 10;
    scoreElem.textContent = score;
    nextWord();
  }
});

// --- Button handlers ---
playBtn.addEventListener('click', () => {
  gameMode = modeSelect.value;
  startGame();
});

patchBtn.addEventListener('click', () => {
  showScreen(patchNotes);
});

backFromPatch.addEventListener('click', () => {
  showScreen(homeScreen);
});

quitBtn.addEventListener('click', () => {
  if (confirm('Quit game and return to home screen?')) {
    clearInterval(timerInterval);
    clearInterval(mutationInterval);
    showScreen(homeScreen);
  }
});
