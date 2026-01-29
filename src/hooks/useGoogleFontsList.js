import { useEffect, useState } from 'react';

const API_URL = 'https://www.googleapis.com/webfonts/v1/webfonts';

export function useGoogleFontsList(sort = 'popularity') {
  const [fonts, setFonts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const key = process.env.REACT_APP_GOOGLE_FONTS_API_KEY;
    fetch(`${API_URL}?key=${key}&sort=${sort}&fields=items(family,variants)`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        const list = data.items.map(f => `${f.family}:${f.variants.join(',')}`);
        setFonts(list);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [sort]);

  return { fonts, loading, error };
} 