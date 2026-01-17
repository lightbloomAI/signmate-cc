export { SignMateWebSocketClient, type SignMateClientEvents, type ClientType } from './client';
export type { SignMateMessage } from './client';

// Connection Manager exports
export {
  WebSocketConnectionManager,
  ConnectionPool,
  getConnectionPool,
  type ConnectionConfig,
  type ConnectionState,
  type ConnectionMetrics,
  type ConnectionMessage,
  type ConnectionEventType,
  type MessageType,
} from './connectionManager';

export {
  ConnectionManagerProvider,
  useConnectionManager,
  useSecondaryConnection,
  useConnectionHealth,
  useConnectionHealthSafe,
  useConnectionEvent,
} from './ConnectionManagerContext';
