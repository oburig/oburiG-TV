import { Channel } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface ChannelGridProps {
  channels: Channel[];
  activeChannel: Channel;
  onSelect: (channel: Channel) => void;
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
  const categories = ["EBS", "KBS", "MBC", "SBS", "기타", "Radio", "OTT", "Debug"];
  
  return (
    <div className="space-y-8 p-3 sm:p-5 bg-white/[0.01] backdrop-blur-sm rounded-3xl border border-white/5">
      {categories.map((category) => {
        const categoryChannels = channels.filter(c => 
          category === "기타" 
            ? !["OTT", "EBS", "KBS", "MBC", "SBS", "Radio", "Debug"].includes(c.category)
            : c.category === category
        );

        if (categoryChannels.length === 0) return null;

        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center gap-2 pl-1">
              <div className="w-1 h-4 bg-blue-500 rounded-full" />
              <h2 className="text-sm font-bold text-blue-500 uppercase tracking-wider">
                {category === "Debug" ? "SYSTEM TEST" : category}
              </h2>
            </div>
            
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-3">
              {categoryChannels.map((channel) => (
                <motion.button
                  key={channel.id}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(channel)}
                  className={cn(
                    "relative group flex items-center justify-center py-4 px-3 rounded-xl border transition-all duration-300 min-h-[54px]",
                    activeChannel.id === channel.id
                      ? "bg-blue-600/15 border-blue-500/50 shadow-[0_4px_20px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/20"
                      : "bg-white/[0.04] border-white/5 hover:bg-white/[0.08] hover:border-white/10"
                  )}
                >
                  <span className={cn(
                    "relative z-10 text-[13px] sm:text-[14px] font-bold tracking-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis w-full text-center transition-colors duration-300",
                    activeChannel.id === channel.id ? "text-blue-400" : "text-white/60 group-hover:text-white"
                  )}>
                    {channel.name}
                  </span>

                  {(channel.isExternal || (channel.streamUrl && channel.streamUrl.startsWith('http://'))) && (
                    <div className="absolute top-1 right-1 p-0.5 bg-white/5 rounded text-[7px] font-black uppercase text-white/40 tracking-tighter">
                      OUT
                    </div>
                  )}
                  
                  {activeChannel.id === channel.id && (
                    <motion.div 
                      layoutId="activeIndicator"
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-5 h-1 bg-blue-500 rounded-full" 
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
