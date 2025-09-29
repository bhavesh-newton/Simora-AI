const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const upload = require('../middleware/upload');
const { processAudioWithWhisper } = require('../utils/whisper');
const { generateSRT, generateRemotionCaptions, validateSRT } = require('../utils/srt');

const router = express.Router();

// POST /api/upload-audio
router.post('/upload-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'No audio file uploaded'
      });
    }

    console.log(`📁 File uploaded: ${req.file.filename}`);
    console.log(`📊 File size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);

    const audioFilePath = req.file.path;
    
    // Process audio with Whisper
    console.log('🎤 Processing audio with Whisper...');
    const transcription = await processAudioWithWhisper(audioFilePath);
    
    // Generate SRT format
    console.log('📝 Generating SRT file...');
    const srtContent = generateSRT(transcription);
    
    // Generate Remotion-compatible captions
    const remotionCaptions = generateRemotionCaptions(transcription);
    
    // Validate SRT content
    const validation = validateSRT(srtContent);
    if (!validation.isValid) {
      console.warn('⚠️ SRT validation warnings:', validation.errors);
    }
    
    // Clean up uploaded file
    await fs.remove(audioFilePath);
    console.log('🧹 Temporary file cleaned up');

    // Send response
    res.json({
      success: true,
      srt: srtContent,
      captions: remotionCaptions, // Remotion-compatible format
      filename: req.file.originalname,
      transcription: transcription,
      duration: transcription.length > 0 ? transcription[transcription.length - 1].end : 0,
      segmentCount: transcription.length,
      validation: validation
    });

  } catch (error) {
    console.error('❌ Error processing audio:', error);
    
    // Clean up file if it exists
    if (req.file && req.file.path) {
      try {
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      error: true,
      message: error.message || 'Failed to process audio file'
    });
  }
});

// GET /api/test
router.get('/test', (req, res) => {
  res.json({
    message: 'API is working!',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /api/upload-audio': 'Upload audio file for transcription'
    }
  });
});

module.exports = router;