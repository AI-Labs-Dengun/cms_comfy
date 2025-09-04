export interface ReferenceTag {
  id: string;
  name: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Reference {
  id: string;
  tag_id: string;
  title: string;
  description: string;
  url: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Campos relacionados (join)
  tag?: ReferenceTag;
}

export interface CreateReferenceData {
  tag_id: string;
  title: string;
  description: string;
  url: string;
}

export interface UpdateReferenceData {
  tag_id?: string;
  title?: string;
  description?: string;
  url?: string;
}

export interface CreateTagData {
  name: string;
  color?: string;
}

export interface UpdateTagData {
  name?: string;
  color?: string;
}

export interface TagResponse {
  success: boolean;
  data?: ReferenceTag | ReferenceTag[];
  error?: string;
  message?: string;
}

export interface ReferenceResponse {
  success: boolean;
  data?: Reference | Reference[];
  error?: string;
  message?: string;
}
