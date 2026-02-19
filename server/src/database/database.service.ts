import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, ConnectionStates } from 'mongoose';

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  onModuleInit() {
    // Check immediate connection state
    if (this.connection.readyState === ConnectionStates.connected) {
      console.log('✅ MongoDB connected successfully');
      console.log(`📌 Database: ${this.connection.name}`);
    } else {
      console.log(
        `⏳ MongoDB connection state: ${this.getConnectionStateName(this.connection.readyState)}`,
      );
    }

    // Listen for future connection events
    this.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });

    this.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    this.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
  }

  private getConnectionStateName(state: ConnectionStates): string {
    const states: { [key in ConnectionStates]: string } = {
      [ConnectionStates.disconnected]: 'disconnected',
      [ConnectionStates.connected]: 'connected',
      [ConnectionStates.connecting]: 'connecting',
      [ConnectionStates.disconnecting]: 'disconnecting',
      [ConnectionStates.uninitialized]: 'uninitialized',
    };
    return states[state] || 'unknown';
  }
}
