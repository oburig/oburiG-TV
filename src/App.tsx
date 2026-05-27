/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CHANNELS } from './constants';
import { Channel } from './types';
import VideoPlayer from './components/VideoPlayer';
import ChannelGrid from './components/ChannelGrid';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Info, 
  Signal, 
  Share2, 
  Tv, 
  Settings, 
  User, 
  Search, 
  X, 
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Globe,
  Activity,
  RefreshCw
} from 'lucide-react';
import { cn } from './lib/utils';

function LogoWithFallback({ src, name }: { src: string | undefined, name: string }) {
  const [hasError, setHasError] = useState(false);
  
  if (hasError || !src) {
    return <div className="w-full h-full flex items-center justify-center bg-white/5 rounded text-[8px] font-black uppercase text-white/40">{name.slice(0, 2)}</div>;
  }
  return (
    <img 
      src={src} 
      alt={name} 
      className="h-full object-contain" 
      onError={() => setHasError(true)}
    />
  );
}

export default function App() {
  const [isAppLoading, setIsAppLoading] = useState(true);
  const VERSION = "2.3"; // 데이터 업데이트를 위한 버전

  const [channels, setChannels] = useState<Channel[]>(() => {
    const saved = localStorage.getItem('oburiG_channels');
    const savedVersion = localStorage.getItem('oburiG_version');

    if (saved && savedVersion === VERSION) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return CHANNELS;
      }
    }
    // 버전이 다르거나 데이터가 없으면 새 CHANNELS 사용
    localStorage.setItem('oburiG_version', VERSION || '2.1');
    localStorage.setItem('oburiG_channels', JSON.stringify(CHANNELS));
    return CHANNELS;
  });

  const handleSelectChannel = (channel: Channel) => {
    const isHttp = channel.streamUrl && channel.streamUrl.startsWith('http://');
    if (channel.isExternal || isHttp) {
      window.open(channel.streamUrl, '_blank');
      return;
    }
    setActiveChannel(channel);
  };

  const [activeChannel, setActiveChannel] = useState<Channel>(channels[0] || CHANNELS[0]);
  const [kbsStreamUrl, setKbsStreamUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings Form State
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [formState, setFormState] = useState<Partial<Channel>>({
    name: '',
    streamUrl: '',
    logo: '',
    category: 'General',
    description: '',
    quality: 'FHD'
  });

  useEffect(() => {
    // Initial system boot sequence
    const timer = setTimeout(() => {
      setIsAppLoading(false);
    }, 1500);

    // Pre-warm active channel logo
    if (activeChannel.logo) {
      const img = new Image();
      img.src = activeChannel.logo;
    }

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('oburiG_channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    if (activeChannel.kbsCode) {
      setKbsStreamUrl(null); // Reset while loading
      fetch(`https://cfpwwwapi.kbs.co.kr/api/v1/landing/live/channel_code/${activeChannel.kbsCode}`)
        .then(res => res.json())
        .then(data => {
          if (data?.channel_item?.[0]?.service_url) {
            setKbsStreamUrl(data.channel_item[0].service_url);
          }
        })
        .catch(err => console.error("KBS fetch error:", err));
    } else {
      setKbsStreamUrl(null);
    }
  }, [activeChannel]);

  const categories = useMemo(() => {
    const cats = ['All', ...new Set(channels.map(c => c.category))];
    return cats;
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          channel.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || channel.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, channels]);

  const handleAddOrUpdateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.streamUrl) return;

    if (editingChannel) {
      const updatedChannels = channels.map(c => c.id === editingChannel.id ? { ...c, ...formState } as Channel : c);
      setChannels(updatedChannels);
      if (activeChannel.id === editingChannel.id) {
        setActiveChannel({ ...editingChannel, ...formState } as Channel);
      }
    } else {
      const newChannel: Channel = {
        ...formState as Channel,
        id: `custom_${Date.now()}`,
      };
      setChannels(prev => [...prev, newChannel]);
    }
    
    setFormState({ name: '', streamUrl: '', logo: '', category: 'General', description: '', quality: 'FHD', isExternal: false });
    setEditingChannel(null);
  };

  const handleDeleteChannel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newChannels = channels.filter(c => c.id !== id);
    setChannels(newChannels);
    if (activeChannel.id === id) {
      setActiveChannel(newChannels[0] || CHANNELS[0]);
    }
  };

  const startEdit = (channel: Channel, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChannel(channel);
    setFormState(channel);
  };

  const resetAllChannels = () => {
    if (confirm('모든 설정을 초기화하고 기본 채널 리스트로 돌아가시겠습니까?')) {
      setChannels(CHANNELS);
      localStorage.removeItem('oburiG_channels');
      setActiveChannel(CHANNELS[0]);
    }
  };

  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullMoveY, setPullMoveY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY !== null) {
      const currentY = e.touches[0].clientY;
      const diff = currentY - pullStartY;
      if (diff > 0) {
        setPullMoveY(Math.min(diff * 0.4, 80));
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullMoveY >= 60 && !isRefreshing) {
      setIsRefreshing(true);
      setIsAppLoading(true);
      setTimeout(() => {
        setSearchQuery('');
        setSelectedCategory('All');
        setPullMoveY(0);
        setIsRefreshing(false);
        setIsAppLoading(false);
      }, 1500);
    } else {
      setPullMoveY(0);
    }
    setPullStartY(null);
  };

  return (
    <div 
      className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30 touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <div 
        className="fixed top-0 left-0 right-0 z-[200] flex justify-center pointer-events-none transition-all duration-300"
        style={{ 
          height: pullMoveY > 0 ? pullMoveY : 0, 
          opacity: pullMoveY / 60,
          transform: `translateY(${pullMoveY > 0 ? 0 : -20}px)`
        }}
      >
        <div className="mt-4 bg-blue-600 p-2 rounded-full shadow-lg shadow-blue-500/40">
          <RefreshCw size={20} className={cn("text-white", (isRefreshing || pullMoveY >= 60) && "animate-spin")} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isAppLoading ? (
          <motion.div 
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#010101]"
          >
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center font-black text-2xl shadow-[0_0_50px_rgba(37,99,235,0.4)]">
                O
              </div>
              <div className="space-y-4 text-center">
                <h1 className="text-3xl font-black tracking-tighter italic">oburiG TV</h1>
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 overflow-hidden w-48 h-0.5 bg-white/5 rounded-full">
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "0%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="w-full h-full bg-blue-500"
                    />
                  </div>
                  <span className="text-[10px] font-black text-blue-500/50 uppercase tracking-[0.5em] mt-2 translate-x-[0.25em]">
                    System Booting
                  </span>
                </div>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute bottom-12 flex flex-col items-center gap-2 opacity-20"
            >
              <div className="flex items-center gap-4 text-[8px] font-black tracking-[0.2em] uppercase">
                <span>Core: V3.4.1</span>
                <span>•</span>
                <span>Signal: Encrypted</span>
                <span>•</span>
                <span>Node: AIS-CLD</span>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            {/* Dynamic Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
              <div 
                className="absolute top-1/4 -left-1/4 w-[80vw] h-[80vw] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen transition-all duration-1000" 
                style={{ transform: `translate(${activeChannel.id === 'mbc' ? '20%' : '-10%'}, ${activeChannel.id === 'sbs' ? '10%' : '0%'})` }}
              />
              <div className="absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] bg-indigo-900/40 rounded-full blur-[100px] mix-blend-screen" />
              <div className="absolute top-0 inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05)_0%,transparent_50%)]" />
            </div>

            {/* Combined Sticky Header (Nav + Player + Info) */}
            <header className="sticky top-0 z-[100] bg-[#0a0a0a]/98 backdrop-blur-2xl border-b border-white/10 shadow-2xl shadow-black/80">
              <nav className="flex items-center justify-between px-4 sm:px-6 h-[56px] sm:h-[72px] border-b border-white/5">
                <div className="flex items-center gap-4 sm:gap-8">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center font-black text-[10px] sm:text-xs shadow-lg shadow-blue-500/20">
                      O
                    </div>
                    <h1 className="text-lg sm:text-xl font-black tracking-tighter italic">oburiG TV</h1>
                  </div>
                  <div className="hidden lg:flex items-center gap-6 text-[10px] font-bold uppercase tracking-widest text-white/40">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                      SYSTEM OPERATIONAL
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                    <input 
                      type="text"
                      placeholder="채널 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-[10px] font-bold focus:outline-none focus:border-blue-500/50 transition-all w-40 lg:w-60"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-white/60 hover:text-white transition-colors"
                  >
                    <Settings size={18} />
                  </button>
                  <button className="p-2 text-white/60 hover:text-white transition-colors">
                    <User size={18} />
                  </button>
                  <div className="h-6 sm:h-8 w-px bg-white/10" />
                  <div className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-white/5 border border-white/10 rounded-full text-[8px] sm:text-[10px] font-bold">
                    <Signal size={10} className="text-green-500 animate-pulse" />
                    <span className="text-white/80 hidden xs:inline">STABLE NETWORK</span>
                    <span className="text-white/80 xs:hidden">STABLE</span>
                  </div>
                </div>
              </nav>

              <div className="max-w-[1700px] mx-auto px-4 sm:px-6 pt-3 pb-4 space-y-4">
                {/* Mobile Search Bar - Compact */}
                <div className="md:hidden relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={12} />
                  <input 
                    type="text"
                    placeholder="채널 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-[10px] font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>

                {/* Compact Player + Info Section */}
                <div className="flex flex-col xl:flex-row gap-4 items-center xl:items-start">
                  <div className="w-full xl:w-[60%] 2xl:w-[65%]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeChannel.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <VideoPlayer 
                          url={kbsStreamUrl || activeChannel.streamUrl} 
                          className="ring-1 ring-white/10 overflow-hidden rounded-lg sm:rounded-2xl shadow-xl aspect-video bg-black mx-auto"
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="flex-1 w-full space-y-4">
                    <div className="flex flex-col sm:flex-row xl:flex-col justify-between xl:justify-start gap-4 h-full">
                      <div className="flex items-start gap-3">
                        <div className="h-10 sm:h-12 flex items-center shrink-0">
                          <LogoWithFallback src={activeChannel.logo} name={activeChannel.name} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-red-600 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">LIVE</span>
                            <h2 className="text-white font-bold text-base sm:text-xl tracking-tight uppercase italic truncate">{activeChannel.name}</h2>
                          </div>
                          <p className="text-[10px] sm:text-xs text-white/50 font-medium line-clamp-2 leading-relaxed">
                            {activeChannel.description || 'oburiG TV 실시간 프리미엄 방송'} • {activeChannel.quality} 해상도 송출 중
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-col xl:flex-row items-center gap-2 shrink-0">
                        <button className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-white text-black rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-white/90 transition-all">
                          <Share2 size={12} />
                          공유
                        </button>
                        <button className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-white transition-all">
                          <Info size={12} />
                          정보
                        </button>
                      </div>
                    </div>

                    {/* Compact Filter Header */}
                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 truncate">Channels</h2>
                        <span className="text-[9px] font-medium text-white/10 px-2 py-0.5 border border-white/5 rounded-full whitespace-nowrap">{filteredChannels.length} ON AIR</span>
                      </div>
                      <div className="relative min-w-[140px]">
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 pr-8 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:text-white transition-all cursor-pointer"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat} className="bg-[#0a0a0a] text-white text-xs">
                              {cat.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" size={12} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            <main className="relative z-10 max-w-[1700px] mx-auto px-4 sm:px-6 pt-4 pb-20">
              <div className="relative">
                {/* Channel Selection Grid (Scrollable part) */}
                <section className="px-1 py-1">
                  <ChannelGrid 
                    channels={filteredChannels} 
                    activeChannel={activeChannel} 
                    onSelect={handleSelectChannel} 
                  />
                </section>

                {/* Informational Section */}
                <section className="grid md:grid-cols-3 gap-6 mt-16 pb-12">
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                      <Signal size={20} />
                    </div>
                    <h3 className="font-bold text-sm">초고화질 UHD 송출</h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      독자적인 압축 기술을 통해 저대역폭에서도 끊김 없는 4K UHD 화질을 제공합니다. 네트워크 환경에 따라 자동으로 해상도가 조절됩니다.
                    </p>
                  </div>
                  
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
                      <Tv size={20} />
                    </div>
                    <h3 className="font-bold text-sm">스마트 TV 미러링</h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      플레이어 하단의 'TV 연결' 버튼을 눌러 주변의 스마트 TV나 크롬캐스트 기기로 영상을 즉시 전송할 수 있습니다.
                    </p>
                  </div>

                  <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400">
                      <Activity size={20} />
                    </div>
                    <h3 className="font-bold text-sm">공중파 통합 플랫폼</h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      KBS, MBC, SBS, EBS 등 대한민국의 주요 공중파 방송을 한 곳에서 편리하게 시청하세요. 채널 관리자를 통해 커스텀 채널을 추가할 수 있습니다.
                    </p>
                  </div>
                </section>
              </div>
            </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-500/20 rounded-xl text-blue-500">
                    <Settings size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black italic uppercase">Channel Manager</h2>
                    <p className="text-[10px] text-white/40 font-bold tracking-[0.2em] uppercase mt-0.5">Custom Live Stream Configuration</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-xl transition-colors"
                >
                  <X />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col lg:flex-row gap-10">
                {/* Form Section */}
                <div className="flex flex-col gap-6 lg:w-1/2">
                  <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">
                    {editingChannel ? <Edit2 size={12} /> : <Plus size={12} />}
                    {editingChannel ? '방송 채널 수정' : '신규 방송 채널 등록'}
                  </h3>
                  
                  <form onSubmit={handleAddOrUpdateChannel} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-blue-500/60 ml-1">01. 방송국 명칭</label>
                      <input 
                        required
                        value={formState.name}
                        onChange={e => setFormState({...formState, name: e.target.value})}
                        placeholder="예: KBS 1TV, SBS Golf 등"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-white/10 shadow-inner"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">02. 스트리밍 화질</label>
                        <select 
                          value={formState.quality}
                          onChange={e => setFormState({...formState, quality: e.target.value as any})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                          <option value="UHD">UHD (4K)</option>
                          <option value="FHD">FHD (1080p)</option>
                          <option value="HD">HD (720p)</option>
                          <option value="SD">SD (480p)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">03. 카테고리</label>
                        <select 
                          value={formState.category}
                          onChange={e => setFormState({...formState, category: e.target.value as any})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                        >
                          {['OTT', 'General', 'News', 'Drama', 'Sports', 'Entertainment', 'Culture', 'Education'].map(cat => (
                            <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">04. 방송 송출 주소 (HLS/m3u8 또는 YouTube)</label>
                      <input 
                        required
                        value={formState.streamUrl}
                        onChange={e => setFormState({...formState, streamUrl: e.target.value})}
                        placeholder="https://.../index.m3u8"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-white/10"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">05. 방송국 로고 URL</label>
                        <input 
                          value={formState.logo}
                          onChange={e => setFormState({...formState, logo: e.target.value})}
                          placeholder="https://.../logo.png"
                          className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-white/10"
                        />
                      </div>
                      <div className="flex flex-col justify-center gap-2 pl-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20">07. 외부 링크 설정</label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={formState.isExternal || false}
                            onChange={e => setFormState({...formState, isExternal: e.target.checked})}
                            className="w-5 h-5 rounded border-white/10 bg-white/5 text-blue-600 focus:ring-blue-500/50 transition-all cursor-pointer"
                          />
                          <span className="text-[10px] font-bold text-white/40 group-hover:text-white/60 transition-colors uppercase tracking-wider">
                            새 창으로 열기 (임베드 불가 시)
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">06. 방송 설명</label>
                      <input 
                        value={formState.description}
                        onChange={e => setFormState({...formState, description: e.target.value})}
                        placeholder="간단한 설명 (선택사항)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-white/10"
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-4 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-500/20"
                      >
                        {editingChannel ? '채널 정보 업데이트' : '새 채널 등록하기'}
                      </button>
                      {editingChannel && (
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingChannel(null);
                            setFormState({ name: '', streamUrl: '', logo: '', category: 'General', description: '', quality: 'FHD', isExternal: false });
                          }}
                          className="px-6 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all border border-white/5"
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex gap-3">
                    <div className="shrink-0 text-blue-500">
                      <Globe size={18} />
                    </div>
                    <p className="text-[10px] text-white/40 leading-relaxed font-bold uppercase tracking-wider">
                      유튜브 주소를 입력할 경우 임베드 형식(youtube.com/embed/...) 혹은 일반 주소를 모두 지원합니다. 모든 데이터는 브라우저 로컬 저장소에 안전하게 보관됩니다.
                    </p>
                  </div>
                </div>

                {/* List Section */}
                <div className="flex flex-col gap-6 lg:w-1/2">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40">
                      <Activity size={12} />
                      등록된 채널 (총 {channels.length} 개)
                    </h3>
                    <button 
                      onClick={resetAllChannels}
                      className="text-[9px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors"
                    >
                      전체 초기화
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {channels.map(channel => (
                      <div 
                        key={channel.id}
                        className="group flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-black rounded-lg overflow-hidden border border-white/10 flex items-center justify-center p-1.5 shrink-0">
                            <LogoWithFallback src={channel.logo} name={channel.name} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black italic uppercase tracking-tight truncate">{channel.name}</p>
                            <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">{channel.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => startEdit(channel, e)}
                            className="p-2.5 bg-white/5 hover:bg-blue-500/20 text-blue-500/60 hover:text-blue-500 rounded-xl transition-all border border-white/5 active:scale-90"
                            title="수정"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={(e) => handleDeleteChannel(channel.id, e)}
                            className="p-2.5 bg-white/5 hover:bg-red-500/20 text-red-500/60 hover:text-red-500 rounded-xl transition-all border border-white/5 active:scale-90"
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-20 border-t border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center font-black text-[10px]">O</div>
              <span className="text-sm font-black tracking-tighter italic opacity-50">oburiG TV</span>
            </div>
            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
              © 2026 oburiG TV Service. All Broadcasters' Logos belong to their respective owners.
            </p>
          </div>
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-white/40">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">API</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
