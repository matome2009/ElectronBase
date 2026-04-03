import { RowDataPacket } from 'mysql2';

export function rowToContact(row: RowDataPacket): object {
  return {
    id:          row.id,
    userId:      row.user_id,
    address:     row.address,
    label:       row.label,
    description: row.description ?? null,
    createdAt:   row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}
