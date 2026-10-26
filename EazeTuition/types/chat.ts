export interface ChatRoom {
  chat_room_id: number;
  room_name: string;
  last_message: string | null;
  last_time: string | null;
  unread_count: number;
  members?: number[];  
}
