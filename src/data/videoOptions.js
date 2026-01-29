export const videoMoods = [
  'inspiring',
  'sad',
  'funny',
  'tense',
  'hopeful',
  'dreamy',
  'emotional',
  'bold',
  'calm',
  'epic',
];

export const videoPurposes = [
  'YouTube story',
  'short film',
  'TikTok',
  'product demo',
  'explainer',
  'brand ad',
  'music video',
  'trailer',
  'reel',
  'storybook',
];

export const sceneContexts = [
  'forest',
  'fog',
  'morning',
  'city',
  'rain',
  'night',
  'desert',
  'sun',
  'day',
  'school',
  'hallway',
  'noon',
  'room',
  'home',
  'street',
  'neon',
  'mountain',
  'snow',
  'storm',
  'beach',
  'sunset',
  'summer',
  'village',
  'dusk',
  'autumn',
  'office',
  'bright',
  'modern',
];

export const narrationPaceOptions = [
  {
    id: 'slow',
    label: 'Slow (115 WPM)',
    wordsPerSecond: 1.9,
    wordsPerMinute: 115,
    description: 'Emotional, cinematic storytelling'
  },
  {
    id: 'conversational',
    label: 'Conversational (140 WPM)',
    wordsPerSecond: 2.35,
    wordsPerMinute: 140,
    description: 'Explainers, normal narration'
  },
  {
    id: 'fast',
    label: 'Fast (170 WPM)',
    wordsPerSecond: 2.8,
    wordsPerMinute: 170,
    description: 'Trailers, promos'
  },
  {
    id: 'veryFast',
    label: 'Very Fast (198 WPM)',
    wordsPerSecond: 3.3,
    wordsPerMinute: 198,
    description: 'High-energy spots, live auctions, alerts'
  }
];

export const scenesPaceOptions = [
  {
    id: 'dramatic',
    label: 'Dramatic (6 scenes/min)',
    avgDuration: 10,
    scenesPerMinute: 6,
    description: 'Emotional beats, establishing shots'
  },
  {
    id: 'conversational',
    label: 'Conversational (10 scenes/min)',
    avgDuration: 6,
    scenesPerMinute: 10,
    description: 'Standard story scenes, interviews'
  },
  {
    id: 'energetic',
    label: 'Energetic (20 scenes/min)',
    avgDuration: 3,
    scenesPerMinute: 20,
    description: 'Promos, action sequences'
  },
  {
    id: 'urgent',
    label: 'Urgent (40 scenes/min)',
    avgDuration: 1.5,
    scenesPerMinute: 40,
    description: 'Montages, alerts, recap blurbs'
  }
]; 