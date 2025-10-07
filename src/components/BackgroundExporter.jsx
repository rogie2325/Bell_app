import React from 'react';

const BackgroundExporter = () => {
  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center relative overflow-hidden">
      
      {/* Vertical Infinite Scrolling Background - Pill Style */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Column 1 - Top to Bottom */}
        <div className="absolute left-[5%] top-0 flex flex-col animate-scroll-down space-y-16">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="space-y-16">
              <div className="bg-black/40 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 rotate-12 shadow-lg min-w-max">
                <span>🍿</span>
                <span>Watch Movies</span>
              </div>
              <div className="bg-red-500/30 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 -rotate-6 shadow-lg min-w-max">
                <span>🎮</span>
                <span>Play Games</span>
              </div>
              <div className="bg-purple-500/30 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 rotate-3 shadow-lg min-w-max">
                <span>👥</span>
                <span>Meet People</span>
              </div>
            </div>
          ))}
        </div>

        {/* Column 2 - Bottom to Top */}
        <div className="absolute right-[5%] bottom-0 flex flex-col-reverse animate-scroll-up space-y-reverse space-y-16">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="space-y-reverse space-y-16">
              <div className="bg-teal-500/30 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 -rotate-12 shadow-lg min-w-max">
                <span>🎵</span>
                <span>Play Music</span>
              </div>
              <div className="bg-orange-500/30 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 rotate-6 shadow-lg min-w-max">
                <span>🧠</span>
                <span>Learn</span>
              </div>
              <div className="bg-cyan-400/30 backdrop-blur-sm rounded-full px-8 py-4 text-white font-semibold text-base flex items-center space-x-3 border border-white/10 -rotate-3 shadow-lg min-w-max">
                <span>👋</span>
                <span>Join Groups</span>
              </div>
            </div>
          ))}
        </div>

        {/* Column 3 - Top to Bottom (Slower) */}
        <div className="absolute left-[25%] top-0 flex flex-col animate-scroll-down-slow space-y-20">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="space-y-20">
              <div className="bg-blue-500/25 backdrop-blur-sm rounded-full px-6 py-3 text-white/80 font-medium text-sm flex items-center space-x-2 border border-white/10 rotate-6 shadow-md min-w-max">
                <span>📹</span>
                <span>HD Video</span>
              </div>
              <div className="bg-green-500/25 backdrop-blur-sm rounded-full px-6 py-3 text-white/80 font-medium text-sm flex items-center space-x-2 border border-white/10 -rotate-12 shadow-md min-w-max">
                <span>🎤</span>
                <span>Clear Audio</span>
              </div>
              <div className="bg-pink-500/25 backdrop-blur-sm rounded-full px-6 py-3 text-white/80 font-medium text-sm flex items-center space-x-2 border border-white/10 rotate-9 shadow-md min-w-max">
                <span>🚀</span>
                <span>Fast Connect</span>
              </div>
            </div>
          ))}
        </div>

        {/* Column 4 - Bottom to Top (Slower) */}
        <div className="absolute right-[25%] bottom-0 flex flex-col-reverse animate-scroll-up-slow space-y-reverse space-y-18">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="space-y-reverse space-y-18">
              <div className="bg-yellow-500/25 backdrop-blur-sm rounded-full px-6 py-3 text-white/80 font-medium text-sm flex items-center space-x-2 border border-white/10 -rotate-9 shadow-md min-w-max">
                <span>⭐</span>
                <span>Premium</span>
              </div>
              <div className="bg-indigo-500/25 backdrop-blur-sm rounded-full px-6 py-3 text-white/80 font-medium text-sm flex items-center space-x-2 border border-white/10 rotate-15 shadow-md min-w-max">
                <span>🔒</span>
                <span>Secure</span>
              </div>
              <div className="bg-emerald-500/25 backdrop-blur-sm rounded-full px-6 py-3 text-white/80 font-medium text-sm flex items-center space-x-2 border border-white/10 -rotate-6 shadow-md min-w-max">
                <span>💬</span>
                <span>Chat</span>
              </div>
            </div>
          ))}
        </div>

        {/* Column 5 - Center floating elements */}
        <div className="absolute left-[50%] top-0 flex flex-col animate-scroll-down space-y-24 transform -translate-x-1/2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="space-y-24">
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-full px-10 py-5 text-white/90 font-bold text-lg flex items-center space-x-4 border border-white/20 rotate-2 shadow-xl min-w-max">
                <span>🎉</span>
                <span>Join Bell Today</span>
              </div>
              <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-full px-8 py-4 text-white/80 font-semibold text-base flex items-center space-x-3 border border-white/15 -rotate-4 shadow-lg min-w-max">
                <span>🌟</span>
                <span>Connect Instantly</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional: Add Bell logo in center for branding */}
      <div className="z-10 text-center">
        <div className="text-8xl font-black text-white/10 mb-4">
          Bell
        </div>
        <div className="text-2xl font-bold text-white/20">
          Virtual Streaming
        </div>
      </div>
    </div>
  );
};

export default BackgroundExporter;