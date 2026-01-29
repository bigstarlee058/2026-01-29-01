export const getAudioLength = (audio) => {
  return Math.round(audio.duration * 1000);
};

export const getAudioLengthFromUrl = async (url) => {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      resolve(getAudioLength(audio));
    });
    audio.addEventListener('error', () => {
      resolve(null);
    });
  });
};

export const getAudioLengthFromBase64 = base64String => {
  function base64ToBlob(base64, contentType = 'audio/mpeg') {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, { type: contentType });
  }

  const audioBlob = base64ToBlob(base64String);
  const audioUrl = URL.createObjectURL(audioBlob);
  const audioElement = new Audio(audioUrl);

  return new Promise(resolve => {
    audioElement.addEventListener('loadedmetadata', () => {
      resolve(getAudioLength(audioElement));
    });

    audioElement.addEventListener('error', () => {
      resolve(null);
    });

    audioElement.load();
  });
};
