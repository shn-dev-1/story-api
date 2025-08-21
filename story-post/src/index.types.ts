// Define types for the request body
export interface CreateStoryRequest {
  prompt: string;
}

// Define types for the response
export interface CreateStoryResponse {
  id?: string
  message?: string;
  receivedPrompt?: string;
  error?: string;
}

export enum StoryMetaDataStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  POST_PROCESSING = 'POST_PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface StoryMetaDataDDBItem {
    id: string;
    created_by: string;
    status: StoryMetaDataStatus;
    date_created: string;
    date_updated: string;
    media_ids: string[];
}

export enum MediaProcessingType {
    IMAGE,
    VIDEO,
    AUDIO,
    TEXT
}

export interface SQSMediaProcessingMessage {
    media_id: string;
    media_type: MediaProcessingType;
    story_id: string;
    content: string;
}