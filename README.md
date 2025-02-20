# Clarity - AI-Powered Audio Processing App

Clarity is a mobile application that processes audio through multiple AI services to enable seamless transcription, translation, and voice synthesis.

## Features

- 🎙️ **Audio Recording & Management**
  - Record and save audio files
  - Playback with pause/resume
  - Rename and organize recordings
  - Star important recordings
  - Duration display

- 🔤 **Transcription & Translation**
  - Automatic speech recognition via AssemblyAI
  - Language detection
  - Auto-translation to English
  - Real-time transcription display

- 🗣️ **AI Voice Synthesis**
  - Text-to-speech via ElevenLabs
  - Multiple voice options
  - Natural-sounding output

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo Go app on your mobile device
- API keys for:
  - AssemblyAI
  - ElevenLabs

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/clarity.git
cd clarity
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory and add your API keys:
```
ASSEMBLY_AI_KEY=your_assembly_ai_key
ELEVEN_LABS_KEY=your_eleven_labs_key
```

4. Start the development server
```bash
npx expo start
```

5. Scan the QR code with Expo Go (Android) or Camera app (iOS)

## Project Structure

```
clarity/
├── app/
│   ├── components/     # Reusable UI components
│   ├── screens/        # Screen components
│   ├── services/       # API services
│   └── database/       # SQLite database operations
├── assets/            # Static assets
└── App.tsx           # Root component
```

## Tech Stack

- React Native with Expo
- SQLite for local storage
- AssemblyAI for transcription
- ElevenLabs for voice synthesis
- TypeScript for type safety

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details
