export function getUid() {
  return Math.random().toString(36).substring(2, 9);
}

export function isHtmlVideoElement(element) {
  if (!element) return false;
  return element.tagName === 'VIDEO';
}

export function isHtmlImageElement(element) {
  if (!element) return false;
  return element.tagName === 'IMG';
}

export function isHtmlAudioElement(element) {
  if (!element) return false;
  return element.tagName === 'AUDIO';
}

export function formatTimeToMinSec(time) {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${appendZero(seconds, 2)}`;
}

export function formatTimeToMinSecMili(time) {
  const minutes = Math.floor(time / 60000);
  const seconds = Math.floor((time % 60000) / 1000);
  const mili = Math.floor((time % 1000) / 100);

  return `${appendZero(minutes, 2)}:${appendZero(seconds, 2)}.${mili}`;
}

function appendZero(value, minDigits = 2) {
  return value.toString().padStart(minDigits, '0');
}
