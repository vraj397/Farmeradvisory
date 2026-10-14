export interface IAiConversation {
  conversationId: string;
  farmerId: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAiMessage {
  messageId: number;
  conversationId: string;
  farmerId: number;
  role: 'user' | 'assistant' | 'system';
  message: string;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export interface ISendAiMessageDto {
  conversationId?: string;
  message: string;
  language?: 'en' | 'gu' | 'hi';
}
