import { useState } from 'react';
import { Channel } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ChannelGridProps {
  channels: Channel[];
  activeChannel: Channel;
  onSelect: (channel: Channel) => void;
}

interface ChannelLogoProps {
  channel: Channel;
  isActive: boolean;
}

function ChannelLogo({ channel, isActive }: ChannelLogoProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-10 h-10 sm:w-12 sm:h-12 mb-1.5 flex items-center justify-center">
      {(!hasError && channel.logo) ? (
        <img 
          src={channel.logo} 
          alt={channel.name} 
          onError={() => setHasError(true)}
          className={cn(
            "max-w-full max-h-full object-contain filter transition-all duration-300",
            isActive ? "brightness-110 drop-shadow-[0_0_10px_rgba(59,130,246,0.6)] scale-110" : "opacity-70 group-hover:opacity-100"
          )}
        />
      ) : (
        <div className={cn(
          "w-full h-full rounded-lg flex items-center justify-center border border-dashed transition-colors",
          isActive ? "border-blue-500/50 text-blue-400 bg-blue-500/10" : "border-white/10 text-white/30"
        )}>
          <span className="text-[10px] font-black italic">{channel.name.slice(0, 3)}</span>
        </div>
      )}
      {channel.quality === "UHD" && (
        <span className="absolute -top-1 -right-1 bg-red-600 text-[7px] font-black px-1 rounded-sm text-white shadow-sm z-10">4K</span>
      )}
    </div>
  );
}

export default function ChannelGrid({ channels, activeChannel, onSelect }: ChannelGridProps) {
  if (channels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white/[0.02] backdrop-blur-sm rounded-3xl border border-white/5">
        <span className="text-white/20 font-black uppercase tracking-[0.3em] text-[10px]">No Channels Found</span>
      </div>
    );
  }

  // Group channels by category
  const categories = ["EBS", "KBS", "MBC", "SBS", "기타", "Radio", "Debug"];
  
  return (
    <div className="space-y-8 p-3 sm:p-5 bg-white/[0.01] backdrop-blur-sm rounded-3xl border border-white/5">
      {categories.map((category) => {
        const categoryChannels = channels.filter(c => 
          category === "기타" 
            ? !["EBS", "KBS", "MBC", "SBS", "Radio", "Debug"].includes(c.category)
            : c.category === category
        );

        if (categoryChannels.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <div className="w-1 h-4 bg-blue-500 rounded-full" />
              <h2 className="text-sm font-black text-blue-500 uppercase tracking-wider">
                {category === "Debug" ? "SYSTEM TEST" : category}
              </h2>
            </div>
            
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
              {categoryChannels.map((channel) => (
                <motion.button
                  key={channel.id}
                  whileHover={{ y: -3, scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onSelect(channel)}
                  className={cn(
                    "relative group flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all duration-300 min-h-[80px]",
                    activeChannel.id === channel.id
                      ? "bg-blue-600/10 border-blue-500/40 shadow-[0_10px_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/10"
                      : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10"
                  )}
                >
                  <ChannelLogo channel={channel} isActive={activeChannel.id === channel.id} />
                  <span className={cn(
                    "text-[11px] sm:text-[12px] font-bold tracking-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis w-full px-1 text-center mt-1",
                    activeChannel.id === channel.id ? "text-blue-400" : "text-white/50 group-hover:text-white"
                  )}>
                    {channel.name}
                  </span>
                  
                  {activeChannel.id === channel.id && (
                    <motion.div 
                      layoutId="activeIndicator"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-blue-500 rounded-full" 
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
