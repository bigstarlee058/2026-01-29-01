export function formatAspectRatio(input) {
  const [widthStr, heightStr] = input.split(":");
  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);

  if (isNaN(width) || isNaN(height) || height === 0) {
    return "Invalid input";
  }

  const ratio = width / height;

  // List of common aspect ratios and their labels
  const commonRatios = [
    { label: "16x9", value: 16 / 9 },
    { label: "9x16", value: 9 / 16 },
    { label: "4x3", value: 4 / 3 },
    { label: "3x4", value: 3 / 4 },
    { label: "21x9", value: 21 / 9 },
    { label: "1x1", value: 1 },
    { label: "3x2", value: 3 / 2 },
    { label: "2x3", value: 2 / 3 }, 
    { label: "16x10", value: 16 / 10 },
    { label: "10x16", value: 10 / 16 },
    { label: "2x1", value: 2 / 1 },
    { label: "1x2", value: 1 / 2 }
  ];

  const tolerance = 0.03; // Allowable deviation (2%)

  for (const { label, value } of commonRatios) {
    if (Math.abs(ratio - value) < tolerance) {
      return label;
    }
  }

  // Fallback to pixel dimensions if no common match
  return `${width}x${height}`;
}