export interface Reference {
  id: string;
  subject: string;
  title: string;
  description: string;
  url: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReferenceData {
  subject: string;
  title: string;
  description: string;
  url: string;
}

export interface UpdateReferenceData {
  subject?: string;
  title?: string;
  description?: string;
  url?: string;
}

export interface ReferenceResponse {
  success: boolean;
  data?: Reference | Reference[];
  error?: string;
  message?: string;
}
