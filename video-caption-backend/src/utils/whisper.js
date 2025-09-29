const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

/**
 * Process audio file using local Whisper model
 * @param {string} audioFilePath - Path to the audio file
 * @param {string} model - Whisper model to use (base, small, medium, large)
 * @returns {Promise<Array>} - Array of transcription segments with timestamps
 */
async function processAudioWithWhisper(audioFilePath, model = 'base') {
  return new Promise((resolve, reject) => {
    console.log(`🎙️ Starting Whisper transcription with model: ${model}`);
    
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      return reject(new Error('Audio file not found'));
    }

    // Prepare whisper command with word-level timestamps
    // Removing language parameter for auto-detection (works better for Hinglish)
    const whisperArgs = [
      '-m', 'whisper',
      audioFilePath,
      '--model', model,
      '--output_format', 'json',
      '--word_timestamps', 'True'
    ];

    console.log('🔧 Whisper command:', 'python', whisperArgs.join(' '));

    const whisperProcess = spawn('python', whisperArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    whisperProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    whisperProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      // Whisper logs progress to stderr, so we log it
      console.log('Whisper:', data.toString().trim());
    });

    whisperProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('❌ Whisper process failed with code:', code);
        console.error('Stderr:', stderr);
        return reject(new Error(`Whisper transcription failed: ${stderr}`));
      }

      try {
        // Parse Whisper JSON output
        const result = JSON.parse(stdout);
        
        if (!result.segments || !Array.isArray(result.segments)) {
          return reject(new Error('Invalid Whisper output format'));
        }

        // Transform segments for SRT generation
        const segments = result.segments.map(segment => ({
          start: segment.start,
          end: segment.end,
          text: segment.text.trim()
        })).filter(segment => segment.text.length > 0);

        console.log(`✅ Transcription completed: ${segments.length} segments`);
        resolve(segments);

      } catch (parseError) {
        console.error('❌ Error parsing Whisper output:', parseError);
        reject(new Error('Failed to parse Whisper transcription result'));
      }
    });

    whisperProcess.on('error', (error) => {
      console.error('❌ Error spawning Whisper process:', error);
      reject(new Error('Failed to start Whisper transcription. Make sure Whisper is installed: pip install openai-whisper'));
    });
  });
}

/**
 * Alternative implementation using whisper with simpler JSON output
 * Uses multilingual model for better support of mixed languages
 */
async function processAudioWithWhisperSimple(audioFilePath, model = 'small') {
  return new Promise((resolve, reject) => {
    console.log(`🎙️ Starting Whisper transcription with multilingual model: ${model}`);
    
    const outputDir = path.dirname(audioFilePath);
    const baseName = path.basename(audioFilePath, path.extname(audioFilePath));
    
    // Use whisper CLI with SRT output - multilingual model for better language detection
    // Small model provides good multilingual support while being faster than medium/large models
    const whisperArgs = [
      audioFilePath,
      '--model', model,
      '--output_dir', outputDir,
      '--output_format', 'srt',
      '--verbose', 'False',  // Reduce verbose output
      '--task', 'transcribe'  // Explicitly set task to transcribe (not translate)
    ];

    console.log('🔧 Whisper command:', 'whisper', whisperArgs.join(' '));

    const whisperProcess = spawn('whisper', whisperArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stderr = '';

    whisperProcess.stdout.on('data', (data) => {
      console.log('Whisper output:', data.toString().trim());
    });

    whisperProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log('Whisper:', data.toString().trim());
    });

    whisperProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('❌ Whisper process failed with code:', code);
        console.error('Stderr:', stderr);
        
        // Check if it's a model download issue
        if (stderr.includes('certificate verify failed') || stderr.includes('SSL:')) {
          return reject(new Error(`Whisper model download failed due to SSL/network issues. Please pre-download the model: python3 -c "import ssl; ssl._create_default_https_context = ssl._create_unverified_context; import whisper; whisper.load_model('${model}')"`));
        }
        
        return reject(new Error(`Whisper transcription failed: ${stderr}`));
      }

      try {
        // Read the generated SRT file
        const srtPath = path.join(outputDir, `${baseName}.srt`);
        
        if (fs.existsSync(srtPath)) {
          const srtContent = await fs.readFile(srtPath, 'utf8');
          
          // Parse SRT to segments
          const segments = parseSRTContent(srtContent);
          
          // Clean up generated files
          try {
            await fs.remove(srtPath);
            await fs.remove(path.join(outputDir, `${baseName}.txt`));
          } catch (cleanupError) {
            console.warn('Warning: Could not clean up temporary files:', cleanupError.message);
          }
          
          console.log(`✅ Transcription completed: ${segments.length} segments`);
          resolve(segments);
        } else {
          reject(new Error('Whisper did not generate expected output file'));
        }

      } catch (error) {
        console.error('❌ Error processing Whisper output:', error);
        reject(error);
      }
    });

    whisperProcess.on('error', (error) => {
      console.error('❌ Error spawning Whisper process:', error);
      reject(new Error('Failed to start Whisper transcription. Make sure Whisper is installed: pip install openai-whisper'));
    });
  });
}

/**
 * Parse SRT content into segments
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
        const text = lines.slice(2).join(' ').trim();
        
        segments.push({ start, end, text });
      }
    }
  }
  
  return segments;
}

/**
 * Convert SRT time format to seconds
 */
function srtTimeToSeconds(timeStr) {
  const [time, ms] = timeStr.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
}

module.exports = {
  processAudioWithWhisper: processAudioWithWhisperSimple,
  processAudioWithWhisperSimple
};