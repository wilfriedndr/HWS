export interface Guide {
  id: number;
  title: string;
  description: string;
  days: number;
  mobility: string;
  season: string;
  audience: string;
}

export interface Activity {
  id: number;
  guide: number;
  title: string;
  description: string;
  category: string;
  day: number;
  order: number;
  address?: string;
  phone?: string;
  hours?: string;
  website?: string;
}
