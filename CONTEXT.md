# Clarity - Initial Features

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
   - Store results in database

### Phase 3: Translation Feature (Week 3)
1. Translation service integration
   - Select and implement translation API
   - Create translation service wrapper
   - Handle API responses

2. Translation UI
   - Create TranslationView component
   - Implement language selection
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
