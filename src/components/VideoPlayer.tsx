import { useEffect, useRef, useState, ChangeEvent } from 'react';
import Hls from 'hls.js';
import { Maximize, Minimize, Volume2, VolumeX, Play, Pause, Tv, Signal, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  className?: string;
}

export default function VideoPlayer({ url, poster, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [quality, setQuality] = useState('Auto');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [reloadToggle, setReloadToggle] = useState(0);

  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com');
  const finalUrl = isYouTube 
    ? `${url}${url.includes('?') ? '&' : '?'}origin=${encodeURIComponent(window.location.origin)}&widget_referrer=${encodeURIComponent(window.location.href)}${reloadToggle > 0 ? `&t=${reloadToggle}` : ''}`
    : url;
  const isMixedContent = !isYouTube && url.startsWith('http://') && window.location.protocol === 'https:';

  useEffect(() => {
    if (isYouTube) {
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    if (Hls.isSupported()) {
      hlsRef.current = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
    }
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [isYouTube]);

  useEffect(() => {
    if (isYouTube) return;

    const video = videoRef.current;
    if (!video) return;

    const hls = hlsRef.current;
    const startTimeout = () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = setTimeout(() => {
        if (isLoading) {
          setLoadError("스트림 연결 시간이 초과되었습니다. 서버가 오프라인이거나 지역 제한이 있을 수 있습니다.");
          setIsLoading(false);
        }
      }, 15000);
    };

    if (Hls.isSupported() && hls) {
      setIsLoading(true);
      setLoadError(null);
      hls.stopLoad();
      hls.detachMedia();
      
      startTimeout();
      
      hls.loadSource(url);
      hls.attachMedia(video);
      
      const onManifestParsed = () => {
        setIsLoading(false);
        setLoadError(null);
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        
        // Autoplay logic
        try {
          const playPromise = video.play();
          if (playPromise !== undefined) {
             playPromise.catch(error => {
                console.log("Autoplay was prevented by the browser:", error);
                // If autoplay is blocked, we might want to mute and try again
                // but usually the user has already clicked a channel, so it should work.
             });
          }
        } catch (err) {
           console.error("Autoplay error:", err);
        }
      };
      const onError = (event: any, data: any) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (data.response?.code === 0 && isMixedContent) {
                 setLoadError("HTTPS 사이트에서 HTTP 방송을 차단 중입니다. 브라우저 설정에서 '안전하지 않은 콘텐츠 허용'을 활성화하거나 EBS 채널(HTTPS)을 시청해주세요.");
              } else {
                 hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setLoadError("방송 소스를 불러오는 중 치명적인 오류가 발생했습니다.");
              hls.destroy();
              break;
          }
        }
      };

      hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
      hls.on(Hls.Events.ERROR, onError);

      return () => {
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        hls.off(Hls.Events.MANIFEST_PARSED, onManifestParsed);
        hls.off(Hls.Events.ERROR, onError);
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setIsLoading(true);
      setLoadError(null);
      startTimeout();
      video.src = url;
      video.onloadedmetadata = () => {
        setIsLoading(false);
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        video.play().catch(e => console.log("Native HLS autoplay prevented:", e));
      };
      return () => {
        if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
        video.onloadedmetadata = null;
      };
    }
  }, [url]);

  const handleReload = () => {
    setIsLoading(true);
    setLoadError(null);
    
    if (isYouTube) {
      setReloadToggle(prev => prev + 1);
      setTimeout(() => setIsLoading(false), 1000);
      return;
    }

    const video = videoRef.current;
    if (!video) return;
    if (Hls.isSupported() && hlsRef.current) {
      hlsRef.current.loadSource(url);
      hlsRef.current.startLoad();
    } else {
      video.src = url;
      video.load();
    }
  };

  const togglePlay = async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
        } else {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
        }
        setIsPlaying(!isPlaying);
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log("Playback was aborted (intentional or source change)");
        } else {
          console.error("Playback error:", err);
        }
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
      videoRef.current.muted = value === 0;
      setIsMuted(value === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const handleCast = async () => {
    const video = videoRef.current;
    if (video && (video as any).remote) {
      try {
        await (video as any).remote.prompt();
      } catch (err: any) {
        // If the user dismissed the prompt, we don't want to show an alert
        if (err.name === 'NotAllowedError' || err.message?.includes('dismissed')) {
          console.log("Remote playback prompt dismissed by user");
          return;
        }
        console.error("Remote playback error:", err);
        alert("스마트 TV 미러링을 위해서는 브라우저의 '전송(Cast)' 기능을 이용해주세요. (Chrome 메뉴 -> 전송...)");
      }
    } else {
      alert("홈 네트워크에 연결된 스마트 TV나 크롬캐스트 기기를 찾을 수 없거나, 브라우저가 직접적인 미러링을 지원하지 않습니다. 브라우저 메뉴의 '전송...' 기능을 사용해주세요.");
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-black group overflow-hidden rounded-xl aspect-video transition-all shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] border border-white/5",
        isFullscreen ? "rounded-none w-full h-screen" : "w-full",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {isYouTube && finalUrl ? (
        <iframe
          key={url}
          src={finalUrl}
          className="w-full h-full border-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (!isYouTube && url) ? (
        <video
          ref={videoRef}
          poster={poster}
          className="w-full h-full object-contain"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          playsInline
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
          <div className="text-white/20 text-xs font-black uppercase tracking-[0.2em]">No Signal</div>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md z-30">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6" />
          <span className="text-[10px] font-black tracking-[0.3em] text-white/70 uppercase animate-pulse mb-2">
            Signal Acquisition...
          </span>
          <span className="text-[8px] font-bold text-white/30 uppercase">
            Fetching UHD Segment
          </span>
          {isMixedContent && (
            <div className="mt-8 px-6 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl max-w-sm text-center">
              <p className="text-[10px] font-bold text-yellow-500/80 leading-relaxed">
                HTTP 방송은 HTTPS 보안 정책으로 인해 차단될 수 있습니다.<br/>
                이미지가 나오지 않으면 아래 '새로고침' 또는 '브라우저 설정'을 확인하세요.
              </p>
            </div>
          )}
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl z-40 p-6 sm:p-8 text-center overflow-y-auto">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 sm:mb-6 shrink-0">
             <Signal className="text-red-500 animate-pulse sm:w-8 sm:h-8" size={24} />
          </div>
          <h3 className="text-white font-black text-base sm:text-lg mb-2 uppercase tracking-tighter">Connection Lost</h3>
          <p className="text-white/60 text-[10px] sm:text-xs font-bold leading-relaxed max-w-xs mb-6 sm:mb-8">
            {loadError}
          </p>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 sm:mb-8 max-w-md w-full text-left">
            <h4 className="text-white/80 font-black text-[10px] uppercase mb-2">시청이 안될 경우 원인 및 해결 방법:</h4>
            <ul className="text-[9px] sm:text-[10px] text-white/40 space-y-1.5 font-medium list-disc ml-3">
              <li><span className="text-white/70">지역 제한 (Geo-block):</span> 공중파 방송은 보통 대한민국 IP에서만 시청 가능합니다. (VPN 확인 필요)</li>
              <li><span className="text-white/70">브라우저 보안:</span> 상단 주소창 왼쪽 '자물쇠' 클릭 - '사이트 설정' - '안전하지 않은 콘텐츠'를 '허용'으로 변경해보세요.</li>
              <li><span className="text-white/70">일시적 오프라인:</span> 방송 소스 서버의 점검 중일 수 있습니다. 'SIGNAL TEST'는 잘 나오는지 확인해주세요.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
            <button 
              onClick={handleReload}
              className="px-6 py-3 bg-white text-black font-black text-[10px] uppercase rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} /> Try Again
            </button>
            <a 
              href={url} 
              target="_blank" 
              rel="noreferrer"
              className="px-6 py-3 bg-white/5 text-white font-black text-[10px] uppercase rounded-xl hover:bg-white/10 transition-all text-center"
            >
              Open Source
            </a>
          </div>
        </div>
      )}

      {/* Dynamic Scanlines / Noise for UHD Feel */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%]" />

      {/* Overlay controls */}
      {!isYouTube && (
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent transition-opacity duration-500 flex flex-col justify-end p-3 sm:p-4 md:p-8 z-20",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-6">
              <button 
                onClick={togglePlay}
                className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white hover:scale-110 active:scale-95 shadow-xl"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" className="sm:w-7 sm:h-7" /> : <Play size={20} fill="currentColor" className="ml-0.5 sm:ml-1 sm:w-7 sm:h-7" />}
              </button>

              <div className="flex items-center gap-1 sm:gap-3 group/volume bg-white/5 rounded-full px-2 py-1">
                <button 
                  onClick={toggleMute}
                  className="p-1.5 text-white/70 hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} className="sm:w-5 sm:h-5" /> : <Volume2 size={18} className="sm:w-5 sm:h-5" />}
                </button>
                <div className="w-16 sm:w-24 flex items-center shrink-0">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                  />
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-4 text-xs font-bold tracking-widest text-white/50 uppercase">
                <div className="flex items-center gap-1.5 text-red-500">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  ON AIR
                </div>
                <div className="h-4 w-px bg-white/10" />
                <span className={cn(quality === 'UHD' ? "text-blue-400" : "text-white/50")}>
                  {quality} STREAMING
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-4">
              <button 
                onClick={handleReload}
                className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white"
                title="이미지가 나오지 않을 경우 클릭하여 새로고침"
              >
                <RefreshCw size={16} className={cn("sm:w-5 sm:h-5", isLoading && "animate-spin")} />
              </button>

              <button 
                onClick={handleCast}
                className="group relative flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-white text-[8px] sm:text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/30"
              >
                <Tv size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span className="hidden sm:inline">TV CONNECT</span>
                <div className="absolute -top-1 -right-1 flex h-2 w-2 sm:h-3 sm:w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-full w-full bg-blue-500"></span>
                </div>
              </button>

              <div className="relative group/quality">
                <button className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-white/10 border border-white/10 rounded-lg text-[8px] sm:text-[10px] text-white font-black hover:bg-white/20 transition-all">
                  <span className="hidden xs:inline">{quality}</span>
                  <span className="xs:hidden">UHD</span>
                  <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-500 rounded-full" />
                </button>
                <div className="absolute bottom-full right-0 mb-3 hidden group-hover/quality:grid bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[120px] sm:min-w-[140px] p-1">
                  {['AUTO (UHD)', '4K DIRECT', 'FHD+', 'FHD', '720p', 'DATA SAVER'].map((q) => (
                    <button 
                      key={q}
                      onClick={() => setQuality(q)}
                      className={cn(
                        "flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 text-[8px] sm:text-[10px] font-bold rounded-lg transition-all",
                        quality === q ? "bg-white/10 text-white" : "text-white/40 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {q}
                      {quality === q && <div className="w-1 h-1 bg-blue-500 rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={toggleFullscreen}
                className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-white"
              >
                {isFullscreen ? <Minimize size={20} className="sm:w-6 sm:h-6" /> : <Maximize size={20} className="sm:w-6 sm:h-6" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal YouTube Overlay */}
      {isYouTube && (
        <div className={cn(
          "absolute top-0 right-0 p-4 transition-opacity duration-500 z-20 flex gap-2",
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        )}>
          <button 
            onClick={handleReload}
            className="p-2 bg-black/50 backdrop-blur-md hover:bg-black/80 rounded-lg transition-all text-white/70 hover:text-white border border-white/10"
            title="새로고침"
          >
            <RefreshCw size={16} className={cn(isLoading && "animate-spin")} />
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-2 bg-black/50 backdrop-blur-md hover:bg-black/80 rounded-lg transition-all text-white/70 hover:text-white border border-white/10"
            title="전체화면"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      )}

      {/* Loading state or buffering can be added here */}
    </div>
  );
}
