# Quick Start Guide: Media Upload Feature

## How to Use

### Method 1: Upload Button (Click)

1. **Locate the upload button** in the timeline toolbar (icon: 📤)
2. **Click the button** to open file picker
3. **Select one or more files**:
   - Videos (mp4, mov, webm, avi, mkv)
   - Audio (mp3, wav, ogg, aac, m4a)
   - Images (jpg, png, gif, webp, svg)
4. **Wait for processing** - files will be added to timeline automatically
5. **Success!** - Files appear as clips on the timeline

### Method 2: Drag & Drop

1. **Select files** from your computer's file explorer
2. **Drag files** over the timeline area
3. **Visual overlay appears** - "Drop files to add to timeline"
4. **Drop files** at desired position
5. **Files are processed** and added to timeline

## Key Features

### 🎬 Video Files

- Automatically extracts audio track
- Creates 2 clips: video clip + audio clip
- Both clips are synchronized (same start/end time)
- If no audio, only video clip is created

### 🎵 Audio Files

- Added to audio track
- Duration auto-detected
- Positioned at drop location or current playhead

### 🖼️ Image Files

- Added to visual track
- Default duration: 5 seconds
- Centered on canvas
- Scaled to fit canvas dimensions

## Smart Features

### Automatic Row Assignment

- Finds best available row automatically
- Avoids overlapping existing clips
- Creates new rows when needed

### Position Detection

- Drag & drop: Position calculated from drop location
- Upload button: Added at current playhead position
- Respects timeline zoom level

### Error Handling

- Invalid files are rejected with clear messages
- Corrupted files handled gracefully
- Batch upload: Shows which files succeeded/failed

## Examples

### Example 1: Add Video with Audio

```
1. Drop "my-video.mp4" at 5-second mark
   ↓
Result:
  Row 0: [Video Clip: 5s → 15s]
  Row 1: [Audio Clip: 5s → 15s]
```

### Example 2: Add Multiple Images

```
1. Select 3 images and upload
   ↓
Result:
  Row 0: [Image 1: 0s → 5s]
         [Image 2: 0s → 5s]  (overlaps, goes to new row)
  Row 1: [Image 3: 0s → 5s]  (overlaps, goes to new row)
```

### Example 3: Drop Audio File

```
1. Drop "background-music.mp3" at 10s
   ↓
Result:
  Row 2: [Audio Clip: 10s → 70s]  (60s duration)
```

## Tips

✅ **DO:**

- Use common file formats for best compatibility
- Drop files at specific timeline positions for precise placement
- Upload multiple files at once - they'll be processed sequentially
- Check success toasts to confirm files were added

❌ **DON'T:**

- Upload extremely large files (may slow down browser)
- Use unsupported formats (will show error)
- Drop files on non-timeline areas (won't work)

## Keyboard Shortcuts

While feature doesn't have dedicated shortcuts, remember:

- `Ctrl+Z` - Undo (works with media additions)
- `Ctrl+Y` - Redo

## Troubleshooting

### "Unsupported file type"

→ Use supported formats: mp4/mov/webm for video, mp3/wav for audio, jpg/png for
images

### "Failed to load metadata"

→ File may be corrupted. Try a different file or re-encode the media

### "No space in timeline"

→ Timeline may be full. Remove some clips or extend timeline duration

### Files not appearing

→ Check browser console for errors. Ensure files aren't too large (500MB video
limit)

### Video has no sound

→ Check if video actually contains audio track. Silent videos create only video
clip.

## Supported Formats

| Type  | Formats                       | Max Size |
| ----- | ----------------------------- | -------- |
| Video | mp4, mov, webm, avi, mkv, wmv | 500 MB   |
| Audio | mp3, wav, ogg, aac, m4a, flac | 100 MB   |
| Image | jpg, png, gif, webp, svg, bmp | 25 MB    |

---

## Need Help?

- Check browser console for detailed error messages
- Verify file format is supported
- Try with smaller files first
- Contact support if issues persist
