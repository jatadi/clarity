# Clarity - Voice Recording & Enhancement App

## Current Features

### Recording & Playback
- Clean, minimalist recording interface with animated record button
- Audio recording with pause/resume functionality
- Immediate playback of recordings
- Save recordings with custom names

### Library Management
- Modern, card-based library interface for saved recordings
- Play/pause saved recordings
- Options menu for each recording (star, rename, delete)
- Date tracking for recordings
- Smooth animations and transitions

### Transcription & Translation
- Automatic transcription of recordings via AssemblyAI
- Language detection for non-English recordings
- Automatic translation to English
- View transcriptions in expandable cards
- Enhanced audio playback option

### UI/UX Improvements
- Clarity theme implementation with consistent color scheme
- Improved navigation and modal interactions
- Better visual feedback for user actions
- Enhanced accessibility and usability

## In Development

### Media Containerization
- Group related media in single container:
  - Original recording
  - Enhanced audio versions
  - Transcriptions
  - Translations
  - Metadata

### Voice Enhancement
- Male/female voice selection for AI enhancement
- Speaker diarization for multi-person conversations
- Create and use custom voice models

### Advanced Language Features
- Multi-language translation options
- Real-time transcription
- Conversation summarization
- Context-aware enhancements

### Hardware Integration
- Bluetooth connectivity with Clarity hospital mask
- Real-time audio streaming
- Direct recording from mask

### Future Enhancements
- Custom voice creation and management
- Advanced audio processing
- Cloud sync and backup
- Sharing capabilities
- Team collaboration features

## Technical Stack
- React Native / Expo
- SQLite for local storage
- AssemblyAI for transcription
- ElevenLabs for voice synthesis
- DeepL for translation

## Design Philosophy
- Clean, minimalist interface
- Focus on accessibility
- Intuitive user experience
- Professional medical context

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
