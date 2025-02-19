# Clarity - Progress and Future Features

## Current Implementation Status

### ✅ Completed Features

1. Audio Recording & Management
   - Record button with start/stop functionality
   - Local storage of audio files
   - Basic SQLite database implementation
   - Save and delete functionality
   - Basic audio playback in list view

2. Transcription System
   - Assembly AI integration
   - Language detection
   - Immediate transcription display
   - Loading states and error handling

3. Translation
   - Auto-translation to English for non-English audio
   - Display of English transcription
   - DeepL integration

4. Voice Synthesis
   - Basic Eleven Labs integration
   - Initial voice generation capability
   - Simple audio playback of generated voice

### 🚧 Immediate Improvements Needed

1. Audio File Management
   - Fix audio length display in saved files
   - Increase audio volume during playback
   - Store and display transcription with saved files
   - Add file renaming capability
   - Implement file highlighting/starring system
   - Store and enable replay of generated voice audio

2. Database Enhancements
   - Add highlighting/starring functionality
   - Improve transcription storage and retrieval
   - Store generated voice audio files
   - Better organization of related data (audio, transcription, translation)

3. UI/UX Improvements
   - Enhanced file management options (rename, highlight, delete)
   - Better audio player controls
   - Improved list view organization
   - Prioritized display of starred/highlighted files
   - More intuitive navigation
   - Better visual feedback for actions

### 🎯 Future Features

1. Real-time Processing
   - Streaming transcription during recording
   - Live translation capabilities
   - Real-time voice synthesis

2. Enhanced File System
   - Comprehensive file structure including:
     - Original audio
     - Transcription (original language)
     - English translation (if applicable)
     - Generated voice audio
     - Audio length metadata
     - Summary
     - Highlight status

3. Advanced AI Features
   - Text summarization
   - Speaker diarization
   - Voice cloning capabilities
   - Expanded language support
   - Real-time voice conversion

## Technical Improvements

### Database Schema Updates

#### recordings
- Add highlight/star status
- Include transcription reference
- Store audio length properly
- Add metadata fields

#### enhanced_audio
- Better integration with recordings
- Storage of generated voice files
- Voice settings preservation

### UI/UX Enhancements

1. File View
   - Compact vs expanded view options
   - Better organization of file information
   - Improved audio controls
   - Quick action buttons

2. Recording Screen
   - Better visual feedback
   - Real-time indicators
   - More intuitive controls

3. Library Screen
   - Filtering options
   - Search functionality
   - Better file organization
   - Starring system

## Implementation Priorities

### Phase 1: Core Improvements
1. Fix audio length display
2. Implement proper volume control
3. Add file renaming
4. Add starring system
5. Store and enable replay of generated voice

### Phase 2: UI Enhancement
1. Redesign file view layout
2. Improve audio controls
3. Add quick actions
4. Implement better navigation

### Phase 3: Advanced Features
1. Real-time processing
2. Summarization
3. Diarization
4. Voice cloning
5. Extended language support

## Long-term Vision

The ultimate goal is to create a comprehensive audio processing tool that can:
1. Handle real-time audio processing
2. Provide instant translations
3. Generate natural voice synthesis
4. Offer advanced AI features
5. Maintain an intuitive and efficient user interface

This tool should seamlessly integrate recording, transcription, translation, and voice synthesis while maintaining high performance and user-friendly operation.

## Overview

Clarity is a mobile application that processes audio through multiple AI services to enable seamless transcription, translation, and voice synthesis. The app leverages Assembly AI for transcription, a translation service for language conversion, and Eleven Labs for AI voice generation.

## Core Features

### 1. Audio Recording
- Record button for start/stop functionality
- Local storage of audio files
- Supported formats: `.m4a` or `.wav`

### 2. Audio Management
- Unique filename generation for recordings
- Local storage system
- Playback functionality for stored recordings
- Audio file list/library view

### 3. Transcription
- Integration with Assembly AI
- Automatic transcription of recorded audio
- Storage of transcribed text
- Real-time display of transcription results

### 4. Translation
- "See Translation" button interface
- Integration with translation service (TBD)
  - Potential options:
    - LibreTranslate
    - Assembly AI
    - OpenAI
- Storage of translated text
- Display of translation results

### 5. AI Voice Synthesis
- Integration with Eleven Labs
- Voice token management
- AI audio generation from text
- "Play AI Audio" playback functionality

## Technical Stack

### Frontend
- Expo

### Backend Services
- Assembly AI (Transcription)
- Eleven Labs (Speech Synthesis)
- Translation API (TBD)

### Infrastructure
- Storage: TBD based on requirements
- Networking: RESTful API integration

## Development Roadmap

1. Audio System Implementation
   - Recording functionality
   - Playback system
   - Local storage

2. API Integrations
   - Assembly AI setup
   - Translation service selection and integration
   - Eleven Labs implementation

3. Data Management
   - Transcription storage
   - Translation storage
   - Generated audio management

4. User Interface
   - Design implementation
   - User experience optimization
   - Feature accessibility

## Implementation Plan

### Phase 1: Project Setup & Audio Recording (Week 1)
1. Initialize Expo project with TypeScript
   - Set up development environment
   - Configure ESLint and Prettier
   - Set up basic navigation structure

2. Implement basic audio recording
   - Create AudioRecorder component
   - Implement record/stop functionality
   - Add audio permissions handling
   - Set up local storage for recordings

3. Create audio file management
   - Implement file naming system
   - Set up SQLite database with recordings table
   - Create basic CRUD operations for recordings

### Phase 2: Transcription Integration (Week 2)
1. Assembly AI setup
   - Create API service wrapper
   - Implement file upload functionality
   - Handle transcription responses

2. Transcription UI
   - Create TranscriptionView component
   - Implement loading states
   - Display transcription results
   - Store transcription results in database alongside audio file

### Phase 3: Translation Feature (Week 3)
1. Translation service integration
   - Implement DeepL service API
   - Create translation service wrapper
   - Handle API responses
   - Store translations in database alongside transcription results and audio file


2. Translation UI
   - Create TranslationView component
   - Implement language selection
   - Language detection: if not english, translate to english, have button to translate to english
   - Display translation results
   - Store translations in database

### Phase 4: Voice Synthesis (Week 4)
1. Eleven Labs integration
   - Set up API authentication
   - Create voice synthesis service
   - Implement audio generation

2. Voice playback
   - Create VoicePlayer component
   - Handle audio file management
   - Implement playback controls
   - Store generated audio files

### Phase 5: UI/UX Refinement (Week 5)
1. Design implementation
   - Create consistent styling system
   - Implement responsive layouts
   - Add loading states and animations

2. Error handling
   - Implement error boundaries
   - Add user-friendly error messages
   - Create retry mechanisms

3. Performance optimization
   - Optimize database queries
   - Implement caching
   - Add pagination for audio lists

### Phase 6: Testing & Documentation (Week 6)
1. Testing
   - Unit tests for core functionality
   - Integration tests for API services
   - End-to-end testing of main features

2. Documentation
   - API documentation
   - Setup instructions
   - User guide
   - Code documentation

### Phase 7: Polish & Launch Preparation (Week 7)
1. Final refinements
   - Bug fixes
   - Performance improvements
   - UX enhancements

2. Launch preparation
   - App store assets
   - Privacy policy
   - Terms of service
   - Marketing materials

Each phase builds upon the previous one, ensuring a solid foundation before adding more complex features. This approach allows for:
- Regular testing and validation
- Early identification of potential issues
- Incremental delivery of working features
- Clear progress tracking
- Flexibility to adjust based on feedback

## Database Schema

### Tables

#### recordings
- id: UUID (Primary Key)
- filename: String
- filepath: String
- duration: Integer (seconds)
- created_at: Timestamp
- updated_at: Timestamp

#### transcriptions
- id: UUID (Primary Key)
- recording_id: UUID (Foreign Key -> recordings.id)
- text: Text
- language: String
- confidence_score: Float
- created_at: Timestamp

#### translations
- id: UUID (Primary Key)
- transcription_id: UUID (Foreign Key -> transcriptions.id)
- text: Text
- source_language: String
- target_language: String
- created_at: Timestamp

#### ai_voices
- id: UUID (Primary Key)
- translation_id: UUID (Foreign Key -> translations.id)
- audio_filepath: String
- voice_id: String (Eleven Labs voice identifier)
- created_at: Timestamp

## Project Structure
