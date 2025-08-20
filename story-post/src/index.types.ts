// Define types for the request body
export interface StoryRequest {
  prompt: string;
}

// Define types for the response
export interface StoryResponse {
  message: string;
  receivedPrompt: string;
  note?: string;
}

export enum StoryMetaDataStatus {
    PENDING,
    IN_PROGRESS,
    POST_PROCESSING,
    COMPLETED
}

export interface StoryMetaDataDDBItem {
    id: string;
    created_by: string;
    status: StoryMetaDataStatus;
    dateCreated: string;
    dateUpdated: string;
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