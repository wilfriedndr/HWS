// Interfaces utilisateur
export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  role?: 'admin' | 'user'; // Propriété calculée côté client
}

// Interfaces d'authentification
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

// Interfaces pour les guides
export interface Activity {
  id: number;
  name: string;
  title?: string; // Alias pour name
  description: string;
  website?: string;
  phone?: string;
  location: string;
  address?: string; // Adresse détaillée
  duration_hours: number;
  hours?: string; // Horaires d'ouverture
  price: number;
  day: number;
  order: number;
  category?: string; // Catégorie de l'activité
  guide: number;
  created_at: string;
  updated_at: string;
}

export interface GuideInvitation {
  id: number;
  guide: number;
  invited_user?: number;
  invited_email?: string;
  created_at: string;
}

export interface Guide {
  id: number;
  title: string;
  name?: string; // Alias pour title
  description: string;
  location: string;
  city?: string; // Ville du guide
  days: number;
  mobility: string;
  season: string;
  audience: string;
  category?: string; // Catégorie du guide
  price?: number; // Prix du guide
  owner: number;
  activities: Activity[];
  invitations: GuideInvitation[];
  created_at: string;
  updated_at: string;
}

// Interfaces pour les formulaires
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_staff?: boolean;
}
