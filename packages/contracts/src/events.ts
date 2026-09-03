export type RealtimeEvent =
  | { type: 'encounter.updated'; encounterId: string; version: number }
  | { type: 'asset.ready'; encounterId: string; assetId: string }
  | { type: 'upload.progress'; batchId: string; completed: number; total: number }
  | { type: 'layout.ready'; encounterId: string; layoutId: string }
  | { type: 'invite.accepted'; invitationId: string; userId: string };
