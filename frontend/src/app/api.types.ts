export interface User {
  id: number;
  username: string;
  email: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  role?: 'admin' | 'user';
}

export interface Guide {
  id: number;
  name: string;
  city: string;
  category: string;
  price: number;
  people_max: number;
  description?: string;
  activities?: Activity[];
}

export interface Activity {
  id: number;
  name: string;
  type: 'voiture' | 'vélo' | 'à pied';
  description?: string;
  day: number;
  order: number;
  category: string;
}

export interface Invitation {
  id: number;
  guide: number;
  invited_user: number;
  invited_email: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    is_staff: boolean;
    is_superuser: boolean;
  };
}
