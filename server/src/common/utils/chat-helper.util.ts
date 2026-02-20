import mongoose from 'mongoose';

export const generateChatRoomId = (
  userId1: mongoose.Types.ObjectId,
  userId2: mongoose.Types.ObjectId,
): string => {
  // Ensure consistent ordering to generate the same chat room ID for the same pair of users
  return [userId1, userId2].sort().join('_').toString();
};
