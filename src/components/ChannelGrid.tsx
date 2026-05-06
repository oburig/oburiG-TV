import { useState } from 'react';
import { CHANNELS } from '../constants';
import { Channel } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ChannelGridProps {
  channels: Channel[];
  activeChannel: Channel;
  onSelect: (channel: Channel) => void;
}

function ChannelLogo({ channel, isActive }: { channel: Channel, isActive: boolean }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-12 h-12 sm:w-16 sm:h-16 mb-2 sm:mb-3 flex items-center justify-center">
      {(!hasError && channel.logo) ? (
        <img 
          src={channel.logo} 
          alt={channel.name} 
          onError={() => setHasError(true)}
          className={cn(
            "max-w-full max-h-full object-contain filter transition-all duration-300",
            isActive ? "brightness-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "opacity-80 group-hover:opacity-100"
          )}
        />
      ) : (
        <div className={cn(
          "w-full h-full rounded-xl flex items-center justify-center border-2 border-dashed transition-colors",
          isActive ? "border-white/40 text-white" : "border-white/10 text-white/40"
        )}>
          <span className="text-sm font-black italic">{channel.name.split(' ')[0]}</span>
        </div>
      )}
      {channel.quality === "UHD" && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-[8px] font-black px-1 rounded text-white shadow-sm z-10">UHD</span>
      )}
    </div>
  );
}

export default function ChannelGrid({ channels, activeChannel, onSelect }: ChannelGridProps) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/5">
        <span className="text-white/20 font-black uppercase tracking-widest text-xs">No Channels Found</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3 sm:gap-4 p-3 sm:p-6 bg-black/40 backdrop-blur-sm rounded-2xl border border-white/5">
      {channels.map((channel) => (
        <motion.button
          key={channel.id}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(channel)}
          className={cn(
            "relative group flex flex-col items-center justify-center p-3 sm:p-5 rounded-2xl border transition-all duration-300",
            activeChannel.id === channel.id
              ? "bg-white/10 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              : "bg-white/5 border-white/10 hover:border-white/20"
          )}
        >
          <ChannelLogo channel={channel} isActive={activeChannel.id === channel.id} />
          <span className={cn(
            "text-[10px] sm:text-xs font-black tracking-tighter uppercase whitespace-nowrap",
            activeChannel.id === channel.id ? "text-white" : "text-white/40 group-hover:text-white/60"
          )}>
            {channel.name}
          </span>
          
          {activeChannel.id === channel.id && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-white rounded-full translate-y-2 opacity-50" />
          )}
        </motion.button>
      ))}
    </div>
  );
}
