# Bell - Video Calling App

A modern video calling application built with React and Vite, featuring real-time video communication, chat, and screen sharing capabilities.

## Features

- 🔐 **Authentication System** - Login and registration with JWT tokens
- 📹 **Video Calling** - WebRTC-based peer-to-peer video communication
- 🎤 **Audio Controls** - Mute/unmute microphone functionality
- 📺 **Screen Sharing** - Share your screen with other participants
- 💬 **Real-time Chat** - In-call messaging system
- 📱 **Responsive Design** - Mobile-friendly interface
- 🎨 **Modern UI** - Beautiful gradient backgrounds and Tailwind CSS styling
- 👥 **Multiple Categories** - Social, Business, Study, Music, and Wellness rooms

## Tech Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **WebRTC**: Native browser WebRTC APIs
- **WebSocket**: For real-time communication
- **Authentication**: JWT tokens with localStorage

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository or ensure you're in the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/
│   └── BellApp.jsx          # Main application component
├── App.jsx                  # App wrapper
├── App.css                  # App-specific styles
├── index.css                # Tailwind CSS imports
└── main.jsx                 # React entry point
```

## Backend Requirements

This frontend application expects a WebSocket server running on `ws://localhost:3001` with the following endpoints:

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### WebSocket Events
- `join-room` - Join a video call room
- `leave-room` - Leave the current room
- `offer` - WebRTC offer for peer connection
- `answer` - WebRTC answer for peer connection
- `ice-candidate` - ICE candidate exchange
- `chat-message` - Send chat message
- `toggle-video` - Toggle video on/off
- `toggle-audio` - Toggle audio on/off
- `start-screen-share` - Start screen sharing
- `stop-screen-share` - Stop screen sharing

## Usage

1. **Authentication**: Start by creating an account or logging in
2. **Join Room**: Select a room category and enter a room ID
3. **Video Controls**: Use the bottom control bar to toggle video, audio, and screen sharing
4. **Chat**: Use the chat sidebar to communicate with other participants
5. **Mobile**: On mobile devices, use the menu button to access additional options

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

WebRTC features require a modern browser with camera/microphone permissions.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## License

This project is open source and available under the MIT License.
