import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ChatType, MessageStatus } from './schemas/chat.schema';
import mongoose from 'mongoose';

interface ConnectedUser {
  userId: string;
  socketId: string;
  lastSeen: Date;
}

@WebSocketGateway({
  port: 3002,
  namespace: 'chat',
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');
  private connectedUsers = new Map<string, ConnectedUser>();
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway Initialized');
  }

  // ==================== CONNECTION MANAGEMENT ====================

  handleConnection(client: Socket) {
    // --- JWT authentication ---
    const rawToken =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers?.authorization as string);

    if (!rawToken) {
      this.logger.warn(
        `Connection rejected - no token provided (${client.id})`,
      );
      client.emit('error', { message: 'Authentication token required' });
      client.disconnect();
      return;
    }

    let userId: string;
    try {
      const token = rawToken.startsWith('Bearer ')
        ? rawToken.slice(7)
        : rawToken;
      const payload = this.jwtService.verify<{ sub: string }>(token, {
        secret: process.env.JWT_SECRET,
      });
      userId = payload.sub;
    } catch {
      this.logger.warn(`Connection rejected – invalid token (${client.id})`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect();
      return;
    }

    this.logger.log(`User ${userId} connected with socket ${client.id}`);

    // Store the connected user
    this.connectedUsers.set(client.id, {
      userId,
      socketId: client.id,
      lastSeen: new Date(),
    });

    // Store socket ID for user (support multiple connections)
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.add(client.id);
    }

    // Join user room for targeted messages
    void client.join(`user_${userId}`);

    // Join private chat rooms for all active private chats
    void this.joinPrivateChatRooms(client, userId);

    // Join group chat rooms
    void this.joinGroupChatRooms(client, userId);

    // Notify others that user is online
    this.server.emit('userOnline', {
      userId,
      isOnline: true,
      connectedAt: new Date(),
    });

    // Update user as online in database
    void this.updateUserOnlineStatus(
      new mongoose.Types.ObjectId(userId),
      true,
    ).catch((err) => this.logger.error('Error updating user status:', err));
  }

  handleDisconnect(client: Socket) {
    const connectedUser = this.connectedUsers.get(client.id);

    if (!connectedUser) {
      return;
    }

    const { userId } = connectedUser;

    // Remove from connected users
    this.connectedUsers.delete(client.id);

    // Remove socket from user's sockets
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(client.id);

      // Only mark user offline if they have no other connections
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);

        this.logger.log(`User ${userId} disconnected`);

        // Notify others that user is offline
        this.server.emit('userOffline', {
          userId,
          isOnline: false,
          lastSeen: new Date(),
        });

        // Update user as offline in database
        void this.updateUserOnlineStatus(
          new mongoose.Types.ObjectId(userId),
          false,
        ).catch((err) =>
          this.logger.error('Error updating user offline status:', err),
        );
      }
    }
  }

  // ==================== MESSAGE EVENTS ====================

  @SubscribeMessage('sendMessage')
  async handleSendMessage(client: Socket, payload: any) {
    try {
      const { messageData } = payload as { messageData: CreateMessageDto };
      const connectedUser = this.connectedUsers.get(client.id);

      if (!connectedUser) {
        client.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Create message in database
      const createdMessage = await this.chatService.createMessage({
        ...messageData,
        // Always enforce the sender from the verified connection – never from client payload
        sender: new mongoose.Types.ObjectId(connectedUser.userId),
      } as CreateMessageDto);

      // Emit based on chat type
      if (messageData.chatType === ChatType.PRIVATE) {
        // Send to private chat room
        this.server.to(messageData.chatRoomId).emit('messageReceived', {
          ...createdMessage,
          timestamp: new Date(),
        });
      } else if (messageData.chatType === ChatType.GROUP) {
        // Send to group chat room
        this.server
          .to(`group_${messageData.groupId?.toString() || ''}`)
          .emit('groupMessageReceived', {
            ...createdMessage,
            senderName: connectedUser.userId,
            timestamp: new Date(),
          });
      }

      // Emit confirmation to sender
      client.emit('messageSent', {
        messageId: createdMessage.messageId,
      });

      this.logger.log(`Message sent: ${createdMessage.messageId}`);
    } catch (error) {
      this.logger.error('Error sending message:', error);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('messageDelivered')
  async handleMessageDelivered(client: Socket, payload: any) {
    try {
      const { messageId } = payload as { messageId: string };

      // Update message status to delivered
      await this.chatService.updateMessageStatus(
        messageId,
        MessageStatus.DELIVERED,
      );

      // Broadcast delivery confirmation
      this.server.emit('messageStatus', {
        messageId,
        status: MessageStatus.DELIVERED,
      });

      this.logger.log(`Message delivered: ${messageId}`);
    } catch (error) {
      this.logger.error('Error marking message as delivered:', error);
    }
  }

  @SubscribeMessage('messageRead')
  async handleMessageRead(client: Socket, payload: any) {
    try {
      const { messageId, groupId, userId } = payload as {
        messageId: string;
        groupId?: string;
        userId: string;
      };

      if (groupId) {
        // For group messages
        await this.chatService.markMessageAsReadByGroupMember(
          messageId,
          new mongoose.Types.ObjectId(userId),
        );
      } else {
        // For private messages
        await this.chatService.updateMessageStatus(
          messageId,
          MessageStatus.READ,
        );
      }

      // Broadcast read confirmation
      this.server.emit('messageStatus', {
        messageId,
        status: MessageStatus.READ,
        readBy: userId,
      });

      this.logger.log(`Message read: ${messageId}`);
    } catch (error) {
      this.logger.error('Error marking message as read:', error);
    }
  }

  @SubscribeMessage('fetchMessages')
  async handleFetchMessages(client: Socket, payload: any) {
    try {
      const { currentUserId, senderId, receiverId, groupId, page, limit } =
        payload;

      const messages = await this.chatService.fetchChatMessages({
        currentUserId: new mongoose.Types.ObjectId(String(currentUserId)),
        senderId: senderId
          ? new mongoose.Types.ObjectId(String(senderId))
          : undefined,
        receiverId: receiverId
          ? new mongoose.Types.ObjectId(String(receiverId))
          : undefined,
        groupId: groupId
          ? new mongoose.Types.ObjectId(String(groupId))
          : undefined,
        page: page || 1,
        limit: limit || 20,
      });

      client.emit('messagesFetched', { messages });

      this.logger.log(`Messages fetched for user ${currentUserId}`);
    } catch (error) {
      this.logger.error('Error fetching messages:', error);
      client.emit('error', { message: 'Failed to fetch messages' });
    }
  }

  // ==================== TYPING INDICATORS ====================

  @SubscribeMessage('userTyping')
  handleUserTyping(client: Socket, payload: any) {
    try {
      const { chatRoomId, userId, groupId } = payload as {
        chatRoomId?: string;
        userId: string;
        groupId?: string;
      };

      if (groupId) {
        // Typing in group
        this.server.to(`group_${groupId}`).emit('userTyping', {
          userId,
          groupId,
          isTyping: true,
        });
      } else if (chatRoomId) {
        // Typing in private chat
        this.server.to(chatRoomId).emit('userTyping', {
          userId,
          chatRoomId,
          isTyping: true,
        });
      }
    } catch (error) {
      this.logger.error('Error handling typing indicator:', error);
    }
  }

  @SubscribeMessage('userStoppedTyping')
  handleUserStoppedTyping(client: Socket, payload: any) {
    try {
      const { chatRoomId, userId, groupId } = payload as {
        chatRoomId?: string;
        userId: string;
        groupId?: string;
      };

      if (groupId) {
        this.server.to(`group_${groupId}`).emit('userTyping', {
          userId,
          groupId,
          isTyping: false,
        });
      } else if (chatRoomId) {
        this.server.to(chatRoomId).emit('userTyping', {
          userId,
          chatRoomId,
          isTyping: false,
        });
      }
    } catch (error) {
      this.logger.error('Error handling stop typing:', error);
    }
  }

  // ==================== USER PRESENCE ====================

  @SubscribeMessage('getUserStatus')
  async handleGetUserStatus(client: Socket, payload: any) {
    try {
      const { userId } = payload as { userId: string };

      const isOnline = this.userSockets.has(userId);
      const userStatus = await this.chatService.getUserOnlineStatus(
        new mongoose.Types.ObjectId(userId),
      );

      client.emit('userStatus', {
        userId,
        isOnline: isOnline ?? userStatus.isOnline,
        lastSeen: userStatus.lastSeen,
      });

      this.logger.log(`Status requested for user ${userId}`);
    } catch (error) {
      this.logger.error('Error getting user status:', error);
    }
  }

  @SubscribeMessage('updateLastSeen')
  async handleUpdateLastSeen(client: Socket, payload: any) {
    try {
      const { userId } = payload as { userId: string };

      await this.chatService.updateUserLastSeen(
        new mongoose.Types.ObjectId(userId),
        new Date(),
      );

      this.logger.log(`Last seen updated for user ${userId}`);
    } catch (error) {
      this.logger.error('Error updating last seen:', error);
    }
  }

  // ==================== PRIVATE CHAT OPERATIONS ====================

  @SubscribeMessage('joinPrivateChat')
  handleJoinPrivateChat(client: Socket, payload: any) {
    try {
      const { chatRoomId, userId } = payload as {
        chatRoomId: string;
        userId: string;
      };

      void client.join(chatRoomId);
      this.logger.log(`User ${userId} joined private chat ${chatRoomId}`);

      // Notify other users in the room
      this.server.to(chatRoomId).emit('userJoinedChat', { userId });
    } catch (error) {
      this.logger.error('Error joining private chat:', error);
    }
  }

  @SubscribeMessage('leavePrivateChat')
  handleLeavePrivateChat(client: Socket, payload: any) {
    try {
      const { chatRoomId, userId } = payload as {
        chatRoomId: string;
        userId: string;
      };

      void client.leave(chatRoomId);
      this.logger.log(`User ${userId} left private chat ${chatRoomId}`);

      // Notify other users in the room
      this.server.to(chatRoomId).emit('userLeftChat', { userId });
    } catch (error) {
      this.logger.error('Error leaving private chat:', error);
    }
  }

  // ==================== GROUP CHAT OPERATIONS ====================

  @SubscribeMessage('joinGroup')
  handleJoinGroup(client: Socket, payload: any) {
    try {
      const { groupId, userId } = payload as {
        groupId: string;
        userId: string;
      };

      void client.join(`group_${groupId}`);
      this.logger.log(`User ${userId} joined group ${groupId}`);

      // Notify group members
      this.server.to(`group_${groupId}`).emit('userJoinedGroup', {
        userId,
        groupId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error joining group:', error);
    }
  }

  @SubscribeMessage('leaveGroup')
  handleLeaveGroup(client: Socket, payload: any) {
    try {
      const { groupId, userId } = payload as {
        groupId: string;
        userId: string;
      };

      void client.leave(`group_${groupId}`);
      this.logger.log(`User ${userId} left group ${groupId}`);

      // Notify group members
      this.server.to(`group_${groupId}`).emit('userLeftGroup', {
        userId,
        groupId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Error leaving group:', error);
    }
  }

  @SubscribeMessage('getGroupMessages')
  async handleGetGroupMessages(client: Socket, payload: any) {
    try {
      const { groupId, currentUserId, page, limit } = payload;

      const messages = await this.chatService.fetchChatMessages({
        currentUserId: new mongoose.Types.ObjectId(String(currentUserId)),
        groupId: new mongoose.Types.ObjectId(String(groupId)),
        page: page || 1,
        limit: limit || 20,
      });

      client.emit('groupMessagesFetched', { groupId, messages });

      this.logger.log(`Group messages fetched for group ${groupId}`);
    } catch (error) {
      this.logger.error('Error fetching group messages:', error);
      client.emit('error', { message: 'Failed to fetch group messages' });
    }
  }

  @SubscribeMessage('groupCall')
  handleGroupCall(client: Socket, payload: any) {
    try {
      const { groupId, callerId, callerName } = payload as {
        groupId: string;
        callerId: string;
        callerName: string;
      };

      // Notify all group members about the call
      this.server.to(`group_${groupId}`).emit('groupCallIncoming', {
        groupId,
        callerId,
        callerName,
        timestamp: new Date(),
      });

      this.logger.log(`Group call initiated in ${groupId} by ${callerId}`);
    } catch (error) {
      this.logger.error('Error handling group call:', error);
    }
  }

  // ==================== HELPER METHODS ====================

  private async joinPrivateChatRooms(
    client: Socket,
    userId: string,
  ): Promise<void> {
    try {
      const chatRooms = await this.chatService.chatRoom(
        new mongoose.Types.ObjectId(userId),
      );

      chatRooms.forEach((chat: any) => {
        // Extract chatRoomId from the chat room data
        const chatRoomId = this.generateChatRoomId(
          userId,
          (chat.userId as mongoose.Types.ObjectId).toString(),
        );
        void client.join(chatRoomId);
      });

      this.logger.log(
        `User ${userId} joined ${chatRooms.length} private chats`,
      );
    } catch (error) {
      this.logger.error('Error joining private chat rooms:', error);
    }
  }

  private async joinGroupChatRooms(
    client: Socket,
    userId: string,
  ): Promise<void> {
    try {
      const groups = await this.chatService.getUserGroups(
        new mongoose.Types.ObjectId(userId),
      );

      groups.forEach((group: any) => {
        void client.join(`group_${group._id}`);
      });

      this.logger.log(`User ${userId} joined ${groups.length} groups`);
    } catch (error) {
      this.logger.error('Error joining group chat rooms:', error);
    }
  }

  private updateUserOnlineStatus(
    userId: mongoose.Types.ObjectId,
    isOnline: boolean,
  ): Promise<void> {
    return this.chatService.setUserOnlineStatus(userId, isOnline);
  }

  private generateChatRoomId(userId1: string, userId2: string): string {
    // Generate consistent room ID regardless of order
    const ids = [userId1, userId2].sort();
    return `${ids[0]}_${ids[1]}`;
  }
}
