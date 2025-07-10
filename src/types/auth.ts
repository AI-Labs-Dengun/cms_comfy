export interface AuthResponse {
  success: boolean;
  user_id?: string;
  username?: string;
  user_role?: 'app' | 'cms' | 'psicologo';
  name?: string;
  error?: string;
  code?: string;
  authorized?: boolean;
  required_role?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  avatar_path: string;
  birth_date?: string;
  gender?: string;
  postal_code?: string;
  guardian_email: string;
  authorized: boolean | null;
  user_role: 'app' | 'cms' | 'psicologo';
  approval_token: string;
  approval_email_sent: boolean;
  approval_email_sent_at?: string;
  email_resend_count: number;
  last_email_resent_at?: string;
  authorized_at?: string;
  authorized_by?: string;
  rejection_reason?: string;
  is_online: boolean;
  created_at: string;
  updated_at: string;
} 