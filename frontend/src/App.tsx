import { useState, useRef } from 'react';
import { Mic, Square, Loader2, Music } from 'lucide-react';
import axios from 'axios';

// TypeScript Interfaces for our data
interface EnrichedSong {
  title: string;
  artist: string;
  spotify_uri: string | null;
  cover_url: string | null;
  preview_url: string | null;
}

interface Setlist {
  vibe_name: string;
  dj_intro: string;
  songs: EnrichedSong[];
  dj_outro: string;
}

type AppStatus = 'idle' | 'recording' | 'processing-ai' | 'enriching-spotify' | 'done' | 'error';

function App() {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // References for the Audio Recorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = processAudio;
      mediaRecorder.start();
      setStatus('recording');
      setErrorMessage('');
    } catch (error) {
      console.error("Error accessing mic:", error);
      setStatus('error');
      setErrorMessage("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.stop();
      // Stop all audio tracks to turn off the browser's red recording dot
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processAudio = async () => {
    try {
      // 1. Create a file from the recorded audio
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      // 2. Call Python Backend (Whisper + Llama 3)
      setStatus('processing-ai');
      const aiResponse = await axios.post('http://localhost:8000/api/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const playlistData = aiResponse.data.playlist_data;

      // 3. Call Node.js Backend (Spotify Data)
      setStatus('enriching-spotify');
      const spotifyResponse = await axios.post('http://localhost:3000/api/enrich-setlist', playlistData);
      
      // 4. Show Results!
      setSetlist(spotifyResponse.data.data);
      setStatus('done');

    } catch (error) {
      console.error("Pipeline Error:", error);
      setStatus('error');
      setErrorMessage("Something went wrong during processing. Check your server logs.");
    }
  };

  // --- UI RENDERERS ---

  const renderStatusBox = () => {
    if (status === 'idle') return <p className="text-gray-400">Press the mic and describe your party vibe</p>;
    if (status === 'recording') return <p className="text-red-400 animate-pulse">Recording... Click the square to stop.</p>;
    if (status === 'processing-ai') return <div className="flex items-center text-spotify"><Loader2 className="animate-spin mr-2" /> AI is curating your setlist...</div>;
    if (status === 'enriching-spotify') return <div className="flex items-center text-spotify"><Loader2 className="animate-spin mr-2" /> Finding tracks on Spotify...</div>;
    if (status === 'error') return <p className="text-red-500">{errorMessage}</p>;
    return null;
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center py-12 px-4 text-white font-sans">
      
      {/* HEADER & RECORDING CONTROLS */}
      <div className="w-full max-w-3xl flex flex-col items-center mb-12">
        <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-spotify to-green-300">
          AI Vibe Curator
        </h1>
        
        <div className="h-8 mb-8 font-medium">
          {renderStatusBox()}
        </div>

        {status !== 'recording' ? (
          <button 
            onClick={startRecording}
            disabled={status === 'processing-ai' || status === 'enriching-spotify'}
            className="bg-spotify hover:bg-green-500 text-darker rounded-full p-6 transition-transform hover:scale-105 shadow-[0_0_30px_rgba(29,185,84,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic size={36} />
          </button>
        ) : (
          <button 
            onClick={stopRecording}
            className="bg-red-500 hover:bg-red-400 text-white rounded-full p-6 transition-transform hover:scale-105 animate-pulse"
          >
            <Square size={36} fill="currentColor" />
          </button>
        )}
      </div>

      {/* RESULTS SECTION */}
      {status === 'done' && setlist && (
        <div className="w-full max-w-4xl animate-fade-in-up">
          
          <div className="bg-surface rounded-2xl p-8 mb-8 border border-gray-800">
            <h2 className="text-3xl font-bold mb-4">{setlist.vibe_name}</h2>
            <div className="bg-darker p-4 rounded-lg italic text-gray-300 border-l-4 border-spotify mb-6">
              🎙️ " {setlist.dj_intro} "
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {setlist.songs.map((song, index) => (
                <div key={index} className="flex items-center bg-dark rounded-xl p-3 hover:bg-gray-800 transition-colors border border-gray-800">
                  
                  {/* Album Cover */}
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="Cover" className="w-16 h-16 rounded-md shadow-lg object-cover" />
                  ) : (
                    <div className="w-16 h-16 rounded-md bg-gray-800 flex items-center justify-center text-gray-500">
                      <Music />
                    </div>
                  )}

                  {/* Song Info & Audio Player */}
                  <div className="ml-4 flex-1 overflow-hidden">
                    <h3 className="font-bold text-lg truncate">{song.title}</h3>
                    <p className="text-gray-400 text-sm truncate">{song.artist}</p>
                    
                    {song.preview_url ? (
                      <audio controls className="w-full h-8 mt-2 custom-audio-player">
                        <source src={song.preview_url} type="audio/mpeg" />
                      </audio>
                    ) : (
                      <p className="text-xs text-red-400 mt-2">No preview available</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-darker p-4 rounded-lg italic text-gray-300 border-l-4 border-spotify mt-6 text-right">
              " {setlist.dj_outro} " 🎙️
            </div>
          </div>
          
          <div className="text-center">
            <button onClick={() => setStatus('idle')} className="text-gray-400 hover:text-white underline">
              Create another vibe
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;