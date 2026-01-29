import anime from 'images/styles/anime.jpg';
import artdeco from 'images/styles/art-deco.jpg';
import baroque from 'images/styles/baroque.jpg';
import cartoon from 'images/styles/cartoon.jpg';
import cyberpunk from 'images/styles/cyberpunk.jpg';
import fantasy from 'images/styles/fantasy.jpg';
import gothic from 'images/styles/gothic.jpg';
import impressionism from 'images/styles/impressionism.jpg';
import minimalist from 'images/styles/minimalist.jpg';
import popart from 'images/styles/popart.jpg';
import realistik from 'images/styles/realistik.jpg';
import steampunk from 'images/styles/steampunk.jpg';
import surreal from 'images/styles/surreal.jpg';
import futurism from 'images/styles/futurism.jpg';

export const sizes = {
  sizes: [
    {
      id: 1,
      name: '9:16',
      size: { width: 1080, height: 1920 },
      generationSize: { width: 768, height: 1360 },
    },
    {
      id: 2,
      name: '4:3',
      size: { width: 800, height: 600 },
      generationSize: { width: 1184, height: 888 },
    },
    {
      id: 3,
      name: '1:1',
      size: { width: 1080, height: 1080 },
      generationSize: { width: 1024, height: 1024 },
    },
    {
      id: 4,
      name: '16:9',
      size: { width: 1920, height: 1080 },
      generationSize: { width: 1360, height: 768 },
    },
  ],
  formats: [{ id: 1, name: 'AlbedoBase XL', format: 200 }],
  presets: [
    { id: 1, name: 'Anime', image: anime, style: 'Anime' },
    { id: 2, name: 'Cinematic', image: realistik, style: 'Realistic' },
    { id: 3, name: 'Creative', image: surreal, style: 'Surreal' },
    { id: 4, name: 'Dynamic', image: popart, style: 'Pop Art' },
    { id: 5, name: 'Environment', image: fantasy, style: 'Fantasy' },
    { id: 6, name: 'General', image: minimalist, style: 'Minimalism' },
    { id: 7, name: 'Creative', image: cartoon, style: 'Cartoon' },
    {
      id: 8,
      name: 'Photography',
      image: impressionism,
      style: 'Impressionism',
    },
    { id: 9, name: 'Raytraced', image: cyberpunk, style: 'Cyberpunk' },
    { id: 10, name: '3D Render', image: futurism, style: 'Futurism' },
    { id: 12, name: 'Sketch Color', image: gothic, style: 'Gothic' },
    { id: 13, name: 'Vibrant', image: artdeco, style: 'Art Deco' },
    { id: 14, name: 'Creative', image: steampunk, style: 'Steampunk' },
    { id: 15, name: 'Environment', image: baroque, style: 'Baroque' },
    { id: 16, name: 'None', image: minimalist, style: 'Without Style' },
  ],
};
