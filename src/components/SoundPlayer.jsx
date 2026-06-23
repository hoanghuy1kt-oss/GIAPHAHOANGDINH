import React, { useState, useEffect, useRef } from "react";
import { Volume2, VolumeX, Play, Pause, Music } from "lucide-react";

export default function SoundPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [trackUrl, setTrackUrl] = useState("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"); // Peaceful default track
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.log("Audio play blocked by browser. Please interact first.", err);
          alert("Vui lòng click bất kỳ đâu trên trang để kích hoạt phát nhạc.");
        });
    }
  };

  const handleMusicUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setTrackUrl(url);
      setIsPlaying(false);
      if (audioRef.current) {
        audioRef.current.load();
      }
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-wood-medium/95 text-paper-base border border-gold-accent/40 rounded-lg px-3 py-2 flex items-center gap-3 shadow-lg z-50 text-xs font-sans transition-all duration-300 hover:border-gold-accent">
      <audio
        ref={audioRef}
        src={trackUrl}
        loop
      />
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-gold-accent animate-pulse" />
        <span className="max-w-[100px] truncate text-[10px] text-paper-dark">Nhạc thiền tịnh</span>
      </div>

      <div className="flex items-center gap-1.5 border-l border-gold-accent/20 pl-2">
        <button
          onClick={togglePlay}
          className="p-1 rounded bg-gold-accent text-wood-dark hover:bg-gold-light transition-colors"
          title={isPlaying ? "Tạm dừng" : "Phát nhạc"}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        <button
          onClick={() => setVolume(v => (v === 0 ? 0.3 : 0))}
          className="p-1 rounded text-paper-base hover:bg-wood-dark transition-colors"
        >
          {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-12 h-1 bg-wood-dark rounded-lg appearance-none cursor-pointer accent-gold-accent"
        />
      </div>

      <label className="cursor-pointer p-1 rounded bg-wood-dark hover:bg-wood-dark/70 text-[10px] text-gold-accent border border-gold-accent/20">
        Đổi nhạc
        <input
          type="file"
          accept="audio/*"
          onChange={handleMusicUpload}
          className="hidden"
        />
      </label>
    </div>
  );
}
