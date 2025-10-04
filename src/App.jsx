import { useState } from 'react'
import LiveKitVideoConference from './components/LiveKitVideoConference'
import InstallPrompt from './components/InstallPrompt'
import BackgroundExporter from './components/BackgroundExporter'
import './App.css'

function App() {
  const [roomData, setRoomData] = useState(null)
  const [userName, setUserName] = useState('')
  const [roomName, setRoomName] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const joinRoom = async () => {
    if (!userName.trim() || !roomName.trim()) {
      alert('Please enter both your name and room name')
      return
    }

    setIsJoining(true)
    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room: roomName,
          username: userName,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get room token')
      }

      const data = await response.json()
      setRoomData({
        token: data.token,
        roomUrl: data.url,
      })
    } catch (error) {
      console.error('Error joining room:', error)
      alert('Failed to join room. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  const leaveRoom = () => {
    setRoomData(null)
  }

  if (roomData) {
    return (
      <>
        <InstallPrompt />
        <LiveKitVideoConference
          roomUrl={roomData.roomUrl}
          token={roomData.token}
          onDisconnected={leaveRoom}
          userName={userName}
        />
      </>
    )
  }

  return (
    <div className="relative min-h-screen">
      <InstallPrompt />
      <BackgroundExporter />
      
      {/* Join Room Overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-sm rounded-lg shadow-xl p-6 border border-white/20">
          <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">
            The Bell - Video Conference
          </h1>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                id="userName"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80"
              />
            </div>
            
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
                Room Name
              </label>
              <input
                id="roomName"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Enter room name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80"
              />
            </div>
            
            <button
              onClick={joinRoom}
              disabled={isJoining}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition duration-200 shadow-lg"
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
