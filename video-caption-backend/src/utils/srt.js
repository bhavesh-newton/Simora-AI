/**
 * Generate SRT file content from transcription segments
 * Compatible with Remotion video player
 * @param {Array} segments - Array of transcription segments with start, end, and text
 * @returns {string} - SRT formatted content
 */
function generateSRT(segments) {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return '';
  }

  let srtContent = '';
  
  segments.forEach((segment, index) => {
    // SRT entry number (1-based)
    srtContent += `${index + 1}\n`;
    
    // Time range in SRT format (HH:MM:SS,mmm --> HH:MM:SS,mmm)
    const startTime = secondsToSRTTime(segment.start);
    const endTime = secondsToSRTTime(segment.end);
    srtContent += `${startTime} --> ${endTime}\n`;
    
    // Text content (clean and format)
    const cleanText = cleanTextForSRT(segment.text);
    srtContent += `${cleanText}\n`;
    
    // Empty line between entries
    srtContent += '\n';
  });

  return srtContent.trim();
}

/**
 * Generate Remotion-compatible captions data
 * @param {Array} segments - Array of transcription segments
 * @returns {Array} - Array of caption objects for Remotion
 */
function generateRemotionCaptions(segments) {
  if (!segments || !Array.isArray(segments)) {
    return [];
  }

  return segments.map((segment, index) => ({
    id: index + 1,
    startTime: Math.round(segment.start * 1000), // Convert to milliseconds
    endTime: Math.round(segment.end * 1000),     // Convert to milliseconds
    text: cleanTextForSRT(segment.text),
    duration: Math.round((segment.end - segment.start) * 1000)
  }));
}

/**
 * Convert seconds to SRT time format (HH:MM:SS,mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} - SRT formatted time
 */
function secondsToSRTTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds
    .toString()
    .padStart(3, '0')}`;
}

/**
 * Convert SRT time format to seconds
 * @param {string} srtTime - Time in SRT format (HH:MM:SS,mmm)
 * @returns {number} - Time in seconds
 */
function srtTimeToSeconds(srtTime) {
  const [time, ms] = srtTime.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
}

/**
 * Clean and format text for SRT files
 * @param {string} text - Raw text from transcription
 * @returns {string} - Cleaned text
 */
function cleanTextForSRT(text) {
  if (!text) return '';
  
  return text
    .trim()
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove HTML tags if any
    .replace(/<[^>]*>/g, '')
    // Handle common punctuation issues
    .replace(/\s+([.!?])/g, '$1')
    // Ensure proper capitalization after sentence endings
    .replace(/([.!?]\s+)([a-z])/g, (match, punct, letter) => punct + letter.toUpperCase())
    // Capitalize first letter
    .replace(/^[a-z]/, letter => letter.toUpperCase());
}

/**
 * Parse existing SRT content into segments
 * @param {string} srtContent - SRT file content
 * @returns {Array} - Array of segments
 */
function parseSRTContent(srtContent) {
  const segments = [];
  const entries = srtContent.trim().split('\n\n');
  
  for (const entry of entries) {
    const lines = entry.split('\n');
    if (lines.length >= 3) {
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
      if (timeMatch) {
        const start = srtTimeToSeconds(timeMatch[1]);
        const end = srtTimeToSeconds(timeMatch[2]);
        const text = lines.slice(2).join('\n').trim();
        
        segments.push({ start, end, text });
      }
    }
  }
  
  return segments;
}

/**
 * Validate SRT content
 * @param {string} srtContent - SRT content to validate
 * @returns {Object} - Validation result with isValid and errors
 */
function validateSRT(srtContent) {
  const result = { isValid: true, errors: [] };
  
  if (!srtContent || typeof srtContent !== 'string') {
    result.isValid = false;
    result.errors.push('SRT content is empty or invalid');
    return result;
  }
  
  const segments = parseSRTContent(srtContent);
  
  if (segments.length === 0) {
    result.isValid = false;
    result.errors.push('No valid subtitle entries found');
    return result;
  }
  
  // Check for overlapping timestamps
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i].end > segments[i + 1].start) {
      result.errors.push(`Overlapping timestamps at entry ${i + 1} and ${i + 2}`);
    }
  }
  
  // Check for negative durations
  segments.forEach((segment, index) => {
    if (segment.end <= segment.start) {
      result.errors.push(`Invalid duration at entry ${index + 1}`);
    }
  });
  
  if (result.errors.length > 0) {
    result.isValid = false;
  }
  
  return result;
}

module.exports = {
  generateSRT,
  generateRemotionCaptions,
  secondsToSRTTime,
  srtTimeToSeconds,
  cleanTextForSRT,
  parseSRTContent,
  validateSRT
};