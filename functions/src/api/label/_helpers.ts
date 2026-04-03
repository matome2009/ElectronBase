import { RowDataPacket } from 'mysql2';

export function rowToLabel(row: RowDataPacket): object {
  return {
    id:        row.id,
    userId:    row.user_id,
    name:      row.name,
    color:     row.color,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}
