export interface Channel {
  id: string;
  name: string;
  logo: string;
  streamUrl: string;
  category: string;
  description: string;
  quality: "UHD" | "FHD" | "HD";
  kbsCode?: string;
}

export interface Program {
  title: string;
  startTime: string;
  endTime: string;
  description: string;
}
