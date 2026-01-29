// Helper function to calculate edit distance between two strings
export const levenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[b.length][a.length];
};

export const validateAndCorrectWords = (words, scenes) => {
  if (!words || !words.length || !scenes || !scenes.length) {
    return words;
  }

  // Create a dictionary of expected words from all scenes
  const allSceneWords = new Set();
  const sceneWordsMap = {};
  const properNouns = new Set();

  // Extract all words from scenes and create a map of similar words
  scenes.forEach(scene => {
    const sceneText = scene.text.toLowerCase().trim();
    const sceneWords = sceneText.split(/\s+/);

    // Collect proper nouns from tags
    if (scene.tags) {
      scene.tags.forEach(tag => {
        const tagWords = tag.name.toLowerCase().trim().split(/\s+/);
        tagWords.forEach(word => {
          properNouns.add(word.toLowerCase());
          allSceneWords.add(word.toLowerCase());
        });
      });
    }

    sceneWords.forEach(word => {
      // Handle basic punctuation in scene words
      const cleanWord = word.replace(/[.,!?-]$/, '');
      allSceneWords.add(cleanWord);

      // Create simple variations for common errors
      if (cleanWord.endsWith('s')) {
        // For possessive forms vs plural
        const withoutS = cleanWord.slice(0, -1);
        const withApostropheS = `${withoutS}'s`;
        sceneWordsMap[withApostropheS] = cleanWord;

        // For words ending with 's
        const withApostrophe = `${cleanWord}'`;
        sceneWordsMap[withApostrophe] = cleanWord;
      }
    });
  });

  // Correct the words while preserving timing
  return words.map(word => {
    // Make a deep copy to avoid modifying the original word object
    const result = { ...word };

    // Get the original word text and clean it for comparison
    const originalWord = word.word;
    const cleanedWord = originalWord.toLowerCase().trim();

    // Look for exact matches first (with punctuation removed)
    const withoutPunctuation = cleanedWord.replace(/[.,!?]$/, '');

    // If the word exists exactly in scene words or has high confidence, keep it as is
    if (allSceneWords.has(withoutPunctuation) || word.score > 0.9) {
      return result; // No correction needed
    }

    // Try to correct the word
    let corrected = false;

    // Check for known corrections first
    if (sceneWordsMap[cleanedWord]) {
      result.word = sceneWordsMap[cleanedWord];
      result.originalWord = originalWord;
      corrected = true;
    }
    // Try without punctuation
    else if (sceneWordsMap[withoutPunctuation]) {
      result.word = sceneWordsMap[withoutPunctuation];
      result.originalWord = originalWord;
      corrected = true;
    }
    // Special handling for proper nouns - use a more lenient matching
    else if (properNouns.size > 0) {
      let bestMatch = null;
      let minDistance = Infinity;

      properNouns.forEach(noun => {
        // For proper nouns, allow up to 4 character differences
        const distance = levenshteinDistance(cleanedWord, noun);
        if (distance < minDistance && distance <= 4) {
          minDistance = distance;
          bestMatch = noun;
        }
      });

      if (bestMatch) {
        result.word = bestMatch;
        result.originalWord = originalWord;
        corrected = true;
      }
    }
    // Or check for close matches using edit distance
    else {
      // Find the closest match in allSceneWords
      let closestMatch = null;
      let minDistance = Infinity;

      allSceneWords.forEach(sceneWord => {
        // Simple Levenshtein distance calculation
        const distance = levenshteinDistance(cleanedWord, sceneWord);
        if (distance < minDistance && distance <= 2) {
          // Allow up to 2 character differences for regular words
          minDistance = distance;
          closestMatch = sceneWord;
        }
      });

      if (closestMatch) {
        result.word = closestMatch;
        result.originalWord = originalWord;
        corrected = true;
      }
    }

    // If correction was made, preserve ending punctuation from original word
    if (corrected) {
      const punctuationMatch = originalWord.match(/[.,!?]$/);
      if (punctuationMatch && !result.word.endsWith(punctuationMatch[0])) {
        result.word = result.word + punctuationMatch[0];
      }
    }

    return result;
  });
};

// Normalize text by removing punctuation and converting to lowercase
export const normalizeText = (text) => {
  return text.toLowerCase()
    .replace(/[.,!?—-]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')     // Normalize spaces
    .trim();
};

// Split text into normalized words array
export const getNormalizedWords = (text) => {
  return normalizeText(text).split(/\s+/).filter(word => word.length > 0);
};

// Find the best sequential match between scene words and subtitle words
export const findSequentialMatch = (sceneWords, subtitleWords) => {
  if (!sceneWords.length || !subtitleWords.length) return null;
  
  let bestMatch = null;
  let bestScore = 0;
  
  // Try to find the best starting position for the scene words in subtitle words
  for (let startIdx = 0; startIdx <= subtitleWords.length - sceneWords.length; startIdx++) {
    let matchScore = 0;
    let matchedIndices = [];
    
    // Check how many words match in sequence
    for (let i = 0; i < sceneWords.length; i++) {
      const sceneWord = sceneWords[i];
      const subtitleIdx = startIdx + i;
      
      if (subtitleIdx < subtitleWords.length) {
        const subtitleWord = subtitleWords[subtitleIdx];
        
        // Exact match gets full score
        if (sceneWord === subtitleWord.normalizedWord) {
          matchScore += 1;
          matchedIndices.push(subtitleIdx);
        }
        // Fuzzy match gets partial score
        else if (levenshteinDistance(sceneWord, subtitleWord.normalizedWord) <= 2) {
          matchScore += 0.7;
          matchedIndices.push(subtitleIdx);
        }
      }
    }
    
    // Calculate match quality (percentage of scene words matched)
    const matchQuality = matchScore / sceneWords.length;
    
    if (matchQuality > bestScore && matchQuality > 0.5) { // At least 50% match required
      bestScore = matchQuality;
      bestMatch = {
        startIndex: startIdx,
        endIndex: startIdx + sceneWords.length - 1,
        matchedIndices,
        score: matchQuality
      };
    }
  }
  
  return bestMatch;
};

// Split text into words and normalize each word
export const getWordsArray = (text) => {
  return normalizeText(text).split(' ').filter(word => word.length > 0);
};

// Create a mapping between subtitle words and scene words
export const createWordMapping = (subtitleWords, sceneWords) => {
  const mapping = new Map();
  const usedSceneWords = new Set();
  
  // First pass - exact matches
  subtitleWords.forEach((subWord, subIndex) => {
    sceneWords.forEach((sceneWord, sceneIndex) => {
      if (!usedSceneWords.has(sceneIndex) && normalizeText(subWord) === normalizeText(sceneWord)) {
        mapping.set(subIndex, sceneIndex);
        usedSceneWords.add(sceneIndex);
      }
    });
  });
  
  // Second pass - fuzzy matches for unmatched words
  subtitleWords.forEach((subWord, subIndex) => {
    if (!mapping.has(subIndex)) {
      sceneWords.forEach((sceneWord, sceneIndex) => {
        if (!usedSceneWords.has(sceneIndex)) {
          const distance = levenshteinDistance(normalizeText(subWord), normalizeText(sceneWord));
          if (distance <= 2) { // Allow up to 2 character differences
            mapping.set(subIndex, sceneIndex);
            usedSceneWords.add(sceneIndex);
          }
        }
      });
    }
  });
  
  return mapping;
};
