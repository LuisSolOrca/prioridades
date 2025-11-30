import mongoose, { Schema, Model } from 'mongoose';

export type PresenceStatus = 'online' | 'away' | 'dnd' | 'invisible';

export interface IUserStatus {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;

  // Presence status
  status: PresenceStatus;

  // Custom status message
  customStatus?: string;
  customStatusEmoji?: string;
  customStatusExpiresAt?: Date;

  // Last seen tracking
  lastSeenAt: Date;
  lastActiveChannelId?: mongoose.Types.ObjectId;

  // Connection tracking
  isConnected: boolean;
  connectedAt?: Date;
  disconnectedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const UserStatusSchema = new Schema<IUserStatus>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  // Presence status
  status: {
    type: String,
    enum: ['online', 'away', 'dnd', 'invisible'],
    default: 'online',
  },

  // Custom status message
  customStatus: {
    type: String,
    trim: true,
    maxlength: [100, 'El estado personalizado no puede exceder 100 caracteres'],
  },
  customStatusEmoji: {
    type: String,
    maxlength: 10,
  },
  customStatusExpiresAt: {
    type: Date,
  },

  // Last seen tracking
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
  lastActiveChannelId: {
    type: Schema.Types.ObjectId,
    ref: 'Channel',
  },

  // Connection tracking
  isConnected: {
    type: Boolean,
    default: false,
  },
  connectedAt: {
    type: Date,
  },
  disconnectedAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
UserStatusSchema.index({ status: 1, isConnected: 1 });
UserStatusSchema.index({ lastSeenAt: -1 });

// Static method to get or create user status
UserStatusSchema.statics.getOrCreate = async function(userId: mongoose.Types.ObjectId | string) {
  let status = await this.findOne({ userId });
  if (!status) {
    status = await this.create({ userId, lastSeenAt: new Date() });
  }
  return status;
};

// Instance method to update last seen
UserStatusSchema.methods.updateLastSeen = async function(channelId?: mongoose.Types.ObjectId) {
  this.lastSeenAt = new Date();
  if (channelId) {
    this.lastActiveChannelId = channelId;
  }
  await this.save();
};

// Instance method to go online
UserStatusSchema.methods.goOnline = async function() {
  this.isConnected = true;
  this.connectedAt = new Date();
  this.lastSeenAt = new Date();
  if (this.status === 'invisible') {
    // Keep invisible status, just update connection
  } else {
    this.status = 'online';
  }
  await this.save();
};

// Instance method to go offline
UserStatusSchema.methods.goOffline = async function() {
  this.isConnected = false;
  this.disconnectedAt = new Date();
  this.lastSeenAt = new Date();
  await this.save();
};

// Virtual for display status (respects invisible)
UserStatusSchema.virtual('displayStatus').get(function() {
  if (this.status === 'invisible') {
    return 'offline'; // Show as offline to others
  }
  if (!this.isConnected && this.status === 'online') {
    return 'offline';
  }
  return this.status;
});

// Virtual for formatted last seen
UserStatusSchema.virtual('lastSeenFormatted').get(function() {
  if (!this.lastSeenAt) return 'Nunca';

  const now = new Date();
  const diff = now.getTime() - this.lastSeenAt.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;

  return this.lastSeenAt.toLocaleDateString('es-MX');
});

// Check if custom status has expired
UserStatusSchema.methods.isCustomStatusExpired = function() {
  if (!this.customStatusExpiresAt) return false;
  return new Date() > this.customStatusExpiresAt;
};

// Clear expired custom status
UserStatusSchema.methods.clearExpiredCustomStatus = async function() {
  if (this.isCustomStatusExpired()) {
    this.customStatus = undefined;
    this.customStatusEmoji = undefined;
    this.customStatusExpiresAt = undefined;
    await this.save();
  }
};

interface IUserStatusModel extends Model<IUserStatus> {
  getOrCreate(userId: mongoose.Types.ObjectId | string): Promise<IUserStatus>;
}

const UserStatus: IUserStatusModel =
  mongoose.models.UserStatus as IUserStatusModel ||
  mongoose.model<IUserStatus, IUserStatusModel>('UserStatus', UserStatusSchema);

export default UserStatus;

// Status display labels
export const STATUS_LABELS: Record<PresenceStatus, string> = {
  online: 'En línea',
  away: 'Ausente',
  dnd: 'No molestar',
  invisible: 'Invisible',
};

// Status colors for UI
export const STATUS_COLORS: Record<PresenceStatus | 'offline', string> = {
  online: '#22c55e',    // green-500
  away: '#f59e0b',      // amber-500
  dnd: '#ef4444',       // red-500
  invisible: '#6b7280', // gray-500
  offline: '#6b7280',   // gray-500
};

// Default custom status presets
export const STATUS_PRESETS = [
  { emoji: '📅', text: 'En reunión' },
  { emoji: '🏖️', text: 'De vacaciones' },
  { emoji: '🏠', text: 'Trabajando desde casa' },
  { emoji: '🍽️', text: 'Almorzando' },
  { emoji: '🚗', text: 'En tránsito' },
  { emoji: '🎯', text: 'Enfocado' },
  { emoji: '🤒', text: 'Enfermo' },
  { emoji: '📵', text: 'Desconectado' },
];
