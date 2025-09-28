/**
 * WORDLE CLONE - STUDENT IMPLEMENTATION
 * 
 * Complete the functions below to create a working Wordle game.
 * Each function has specific requirements and point values.
 * 
 * GRADING BREAKDOWN:
 * - Core Game Functions (60 points): initializeGame, handleKeyPress, submitGuess, checkLetter, updateGameState
 * - Advanced Features (30 points): updateKeyboardColors, processRowReveal, showEndGameModal, validateInput
 */

// ========================================
// CORE GAME FUNCTIONS (60 POINTS TOTAL)
// ========================================

/**
 * Initialize a new game
 * POINTS: 10
 * 
 * TODO: Complete this function to:
 * - Reset all game state variables
 * - Get a random word from the word list
 * - Clear the game board
 * - Hide any messages or modals
 */
function initializeGame() {
    // Reset game state variables
    currentWord = WordleWords.getRandomWord();
    currentGuess = '';
    currentRow = 0;
    gameOver = false;
    gameWon = false;

    // Reset board UI
    resetBoard();

    // Hide messages and modal
    const msg = document.getElementById('message');
    if (msg) {
        msg.textContent = '';
        msg.classList.add('hidden');
    }
    hideModal();
}

/**
 * Handle keyboard input
 * POINTS: 15
 * 
 * TODO: Complete this function to:
 * - Process letter keys (A-Z)
 * - Handle ENTER key for word submission
 * - Handle BACKSPACE for letter deletion
 * - Update the display when letters are added/removed
 */
function handleKeyPress(key) {
    // Early exit if game over
    if (gameOver) return;

    // Normalize key to uppercase letters / special keys
    const K = key.toUpperCase();

    if (!validateInput(K, currentGuess)) return;

    // Letter input A-Z
    if (/^[A-Z]$/.test(K)) {
        if (currentGuess.length >= WORD_LENGTH) return;
        currentGuess += K;
        const col = currentGuess.length - 1;
        const tile = getTile(currentRow, col);
        updateTileDisplay(tile, K);
        return;
    }

    // Backspace handling
    if (K === 'BACKSPACE') {
        if (currentGuess.length === 0) return;
        const col = currentGuess.length - 1;
        currentGuess = currentGuess.slice(0, -1);
        const tile = getTile(currentRow, col);
        updateTileDisplay(tile, '');
        return;
    }

    // Enter handling
    if (K === 'ENTER') {
        if (!isGuessComplete()) {
            showMessage('Not enough letters', 'error');
            shakeRow(currentRow);
            return;
        }
        submitGuess();
    }
}

/**
 * Submit and process a complete guess
 * POINTS: 20
 * 
 * TODO: Complete this function to:
 * - Validate the guess is a real word
 * - Check each letter against the target word
 * - Update tile colors and keyboard
 * - Handle win/lose conditions
 */
function submitGuess() {
    if (!isGuessComplete()) {
        showMessage('Not enough letters', 'error');
        shakeRow(currentRow);
        return;
    }

    const guess = currentGuess.toUpperCase();
    const target = currentWord.toUpperCase();

    if (!WordleWords.isValidWord(guess)) {
        showMessage('Not in word list', 'error');
        shakeRow(currentRow);
        return;
    }

    // Two-pass scoring to handle duplicates correctly
    const states = Array(WORD_LENGTH).fill('absent');

    const targetCounts = {};
    for (let ch of target) targetCounts[ch] = (targetCounts[ch] || 0) + 1;

    // First pass - correct positions
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === target[i]) {
            states[i] = 'correct';
            targetCounts[guess[i]] -= 1;
        }
    }

    // Second pass - present letters using remaining counts
    for (let i = 0; i < WORD_LENGTH; i++) {
        if (states[i] === 'correct') continue;
        const ch = guess[i];
        if (targetCounts[ch] > 0) {
            states[i] = 'present';
            targetCounts[ch] -= 1;
        }
    }

    // Update tiles immediately
    for (let i = 0; i < WORD_LENGTH; i++) {
        const tile = getTile(currentRow, i);
        setTileState(tile, states[i]);
    }

    // Update keyboard colors
    updateKeyboardColors(guess, states);

    // Reveal processing (celebration if all correct)
    processRowReveal(currentRow, states);

    const isCorrect = guess === target;
    updateGameState(isCorrect);

    if (!gameOver) {
        currentRow += 1;
        currentGuess = '';
    }
}

/**
 * Check a single letter against the target word
 * POINTS: 10
 * 
 * TODO: Complete this function to:
 * - Return 'correct' if letter matches position exactly
 * - Return 'present' if letter exists but wrong position
 * - Return 'absent' if letter doesn't exist in target
 * - Handle duplicate letters correctly (this is the tricky part!)
 */
function checkLetter(guessLetter, position, targetWord) {
    const guess = (currentGuess || '').toUpperCase();
    const target = (targetWord || currentWord || '').toUpperCase();
    const letter = (guessLetter || '').toUpperCase();

    if (!letter || !target) return 'absent';

    // Exact match
    if (target[position] === letter) return 'correct';

    // Build counts of target letters
    const counts = {};
    for (let ch of target) counts[ch] = (counts[ch] || 0) + 1;

    // Subtract exact matches from availability
    for (let i = 0; i < Math.min(guess.length, target.length); i++) {
        if (guess[i] === target[i]) {
            counts[guess[i]] = Math.max(0, (counts[guess[i]] || 0) - 1);
        }
    }

    // How many times has this letter appeared in the guess so far at non-exact spots?
    let seenNonExact = 0;
    for (let i = 0; i <= position && i < guess.length; i++) {
        const ch = guess[i];
        if (ch !== target[i] && ch === letter) {
            seenNonExact += 1;
        }
    }

    return (counts[letter] && seenNonExact <= counts[letter]) ? 'present' : 'absent';
}

/**
 * Update game state after a guess
 * POINTS: 5
 * 
 * TODO: Complete this function to:
 * - Check if player won (guess matches target)
 * - Check if player lost (used all attempts)
 * - Show appropriate end game modal
 */
function updateGameState(isCorrect) {
    if (isCorrect) {
        gameWon = true;
        gameOver = true;
        showEndGameModal(true, currentWord);
        return;
    }

    // Loss: used all attempts
    if (currentRow >= MAX_GUESSES - 1) {
        gameOver = true;
        showEndGameModal(false, currentWord);
    }
}

// ========================================
// ADVANCED FEATURES (30 POINTS TOTAL)
// ========================================

/**
 * Update keyboard key colors based on guessed letters
 * POINTS: 10
 * 
 * TODO: Complete this function to:
 * - Update each key with appropriate color
 * - Maintain color priority (green > yellow > gray)
 * - Don't downgrade key colors
 */
function updateKeyboardColors(guess, results) {
    for (let i = 0; i < guess.length; i++) {
        const letter = guess[i];
        const state = results[i];
        updateKeyboardKey(letter, state);
    }
}

/**
 * Process row reveal (simplified - no animations needed)
 * POINTS: 5 (reduced from 15 since animations removed)
 * 
 * TODO: Complete this function to:
 * - Check if all letters were correct
 * - Trigger celebration if player won this round
 */
function processRowReveal(rowIndex, results) {
    const allCorrect = results.every(s => s === 'correct');
    if (allCorrect) {
        celebrateRow(rowIndex);
    }
}

/**
 * Show end game modal with results
 * POINTS: 10
 * 
 * TODO: Complete this function to:
 * - Display appropriate win/lose message
 * - Show the target word
 * - Update game statistics
 */
function showEndGameModal(won, targetWord) {
    // Update stats first
    updateStats(won);

    // Guesses used if win (1-based)
    const guessesUsed = won ? (currentRow + 1) : undefined;

    showModal(won, targetWord, guessesUsed);
}

/**
 * Validate user input before processing
 * POINTS: 5
 * 
 * TODO: Complete this function to:
 * - Check if game is over
 * - Validate letter keys (only if guess not full)
 * - Validate ENTER key (only if guess complete)
 * - Validate BACKSPACE key (only if letters to remove)
 */
function validateInput(key, currentGuess) {
    if (gameOver) return false;

    // Letters
    if (/^[A-Z]$/.test(key)) {
        return currentGuess.length < WORD_LENGTH;
    }

    // Enter requires full guess
    if (key === 'ENTER') {
        return currentGuess.length === WORD_LENGTH;
    }

    // Backspace requires something to delete
    if (key === 'BACKSPACE') {
        return currentGuess.length > 0;
    }

    // Ignore anything else
    return false;
}

// ========================================
// DEBUGGING HELPERS (REMOVE BEFORE SUBMISSION)
// ========================================

// Uncomment these lines for debugging help:
// console.log('Current word:', currentWord);
// console.log('Current guess:', currentGuess);
// console.log('Current row:', currentRow);