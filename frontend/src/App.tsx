import React from 'react';
import { Mic } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-dark flex flex-col items-center justify-center text-white p-4">
      <h1 className="text-4xl font-bold mb-4 text-spotify">TrackTrace</h1>
      <p className="text-gray-400 mb-8">Press the mic and describe your party vibe</p>
      
      <button className="bg-spotify hover:bg-green-500 text-darker rounded-full p-6 transition-transform hover:scale-105">
        <Mic size={32} />
      </button>
    </div>
  );
}

export default App;