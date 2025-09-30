# API Setup Instructions

This application requires API keys for full functionality. Follow these steps to set up the required services:

## 🔑 Required API Keys

### 1. AssemblyAI (Required for Voice Input)
- **Purpose**: Speech-to-Text functionality for voice input
- **Cost**: Free tier available
- **Setup**:
  1. Go to [AssemblyAI](https://www.assemblyai.com/)
  2. Sign up for a free account
  3. Get your API key from the dashboard
  4. Set the environment variable: `VITE_ASSEMBLYAI_API_KEY=your_api_key_here`

### 2. Puter AI (No API Key Required)
- **Purpose**: Resume analysis, question generation, answer evaluation, and text-to-speech
- **Cost**: Free (loaded via CDN)
- **Setup**: Already configured in the HTML file

## 🚀 Quick Setup

### Option 1: Environment Variable (Recommended)
1. Create a `.env` file in the project root:
```bash
VITE_ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
```

2. Restart the development server:
```bash
npm run dev
```

### Option 2: Runtime Configuration
1. Start the application without the API key
2. The app will show an API configuration dialog
3. Enter your AssemblyAI API key when prompted
4. Click "Update API Key" to continue

## 🔧 Development Setup

1. **Clone and install dependencies**:
```bash
cd chat-ai-interviewer
npm install
```

2. **Set up environment variables**:
```bash
# Create .env file
echo "VITE_ASSEMBLYAI_API_KEY=your_api_key_here" > .env
```

3. **Start development server**:
```bash
npm run dev
```

## 🎯 Features by API Key Status

### With AssemblyAI API Key:
- ✅ Voice input for answers
- ✅ Voice input for missing information
- ✅ Real-time speech-to-text
- ✅ Complete voice interaction

### Without AssemblyAI API Key:
- ✅ Text input for answers
- ✅ Text input for missing information
- ✅ All AI features (resume analysis, scoring, etc.)
- ❌ Voice input disabled

## 🛠️ Troubleshooting

### Voice Input Not Working
1. Check if AssemblyAI API key is set correctly
2. Ensure microphone permissions are granted
3. Check browser console for errors
4. Verify API key is valid at AssemblyAI dashboard

### AI Features Not Working
1. Ensure Puter script is loaded (check browser console)
2. Check internet connection
3. Verify browser supports required APIs

### Environment Variables Not Loading
1. Ensure `.env` file is in the project root
2. Restart the development server after adding variables
3. Check variable names start with `VITE_`

## 📝 Notes

- The application will work without AssemblyAI API key but with limited voice functionality
- All AI features (resume analysis, question generation, scoring) work without additional API keys
- AssemblyAI offers a generous free tier for development and testing
- Puter AI is completely free and requires no registration
