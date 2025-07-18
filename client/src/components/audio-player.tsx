import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string | null;
  title: string;
  duration?: string;
}

export default function AudioPlayer({ audioUrl, title, duration = "0:00" }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  
  // Initialize audio element
  useEffect(() => {
    if (!audioUrl) return;
    
    console.log('Initializing audio player with URL:', audioUrl);
    
    // Create audio element if one doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
      
      // Add error event listener
      audioRef.current.addEventListener("error", (e) => {
        console.error('Audio element error:', e);
        console.error('Audio error details:', audioRef.current?.error);
      });
      
      // Add load event listeners
      audioRef.current.addEventListener("loadstart", () => {
        console.log('Audio loading started');
      });
      
      audioRef.current.addEventListener("loadeddata", () => {
        console.log('Audio data loaded');
      });
      
      audioRef.current.addEventListener("canplay", () => {
        console.log('Audio can start playing');
      });
      
      // Event listeners
      audioRef.current.addEventListener("timeupdate", updateProgress);
      audioRef.current.addEventListener("ended", handleEnd);
      audioRef.current.addEventListener("progress", updateBuffer);
    }
    
    // Update source
    audioRef.current.src = audioUrl;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener("timeupdate", updateProgress);
        audioRef.current.removeEventListener("ended", handleEnd);
        audioRef.current.removeEventListener("progress", updateBuffer);
        audioRef.current.removeEventListener("error", () => {});
        audioRef.current.removeEventListener("loadstart", () => {});
        audioRef.current.removeEventListener("loadeddata", () => {});
        audioRef.current.removeEventListener("canplay", () => {});
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [audioUrl]);
  
  // Handle play/pause
  const togglePlayPause = async () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsPlaying(false);
    } else {
      try {
        console.log('Attempting to play audio:', audioUrl);
        await audioRef.current.play();
        intervalRef.current = window.setInterval(() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }, 1000);
        setIsPlaying(true);
        console.log('Audio playback started successfully');
      } catch (error: any) {
        console.error('Audio playback error:', error);
        console.error('Audio URL:', audioUrl);
        console.error('Audio element state:', {
          readyState: audioRef.current.readyState,
          networkState: audioRef.current.networkState,
          error: audioRef.current.error
        });
        
        // More specific error handling
        if (error.name === 'NotAllowedError') {
          console.warn('Audio play blocked by browser - user interaction required');
        } else if (error.name === 'NotSupportedError') {
          console.warn('Audio format not supported');
        } else {
          console.warn('General audio playback error');
        }
        
        setIsPlaying(false);
      }
    }
  };
  
  // Handle seeking
  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    
    const seekTime = (value[0] / 100) * audioRef.current.duration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };
  
  // Update progress
  const updateProgress = () => {
    if (!audioRef.current) return;
    
    const percent = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(percent);
    setCurrentTime(audioRef.current.currentTime);
  };
  
  // Update buffer progress
  const updateBuffer = () => {
    if (!audioRef.current || !audioRef.current.buffered.length) return;
    
    const bufferedEnd = audioRef.current.buffered.end(audioRef.current.buffered.length - 1);
    const duration = audioRef.current.duration;
    
    if (duration > 0) {
      setBuffered((bufferedEnd / duration) * 100);
    }
  };
  
  // Handle end of audio
  const handleEnd = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
  
  // Format time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="audio-player border rounded-md p-6 shadow-md bg-white relative">
      <div className="flex items-center space-x-4">
        <Button
          onClick={togglePlayPause}
          className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-700 transition duration-200 flex-shrink-0 border-2 border-blue-300 shadow-xl flex items-center justify-center"
          variant="default"
          disabled={!audioUrl}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
        >
          {isPlaying ? 
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg> 
            : 
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="white" stroke="none" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" fill="white"></polygon>
            </svg>
          }
        </Button>
        <div className="flex-grow">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">{title}</span>
            <span className="text-gray-500">
              {audioRef.current?.duration ? formatTime(currentTime) : "0:00"} / {duration}
            </span>
          </div>
          <div className="relative h-6">
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-2">
              {/* Buffered progress */}
              <div 
                className="absolute top-0 left-0 h-full bg-gray-300 rounded-full" 
                style={{ width: `${buffered}%` }}
              ></div>
              {/* Playback progress */}
              <div 
                className="absolute top-0 left-0 h-full bg-primary-500 rounded-full" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <Slider
              defaultValue={[0]}
              value={[progress]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleSeek}
              disabled={!audioUrl}
              className="z-10"
            />
          </div>
        </div>
      </div>
      {!audioUrl && (
        <div className="text-center text-sm text-gray-500 mt-2">
          No audio available. Generate a toast first.
        </div>
      )}
    </div>
  );
}
