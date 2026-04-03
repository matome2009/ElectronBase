import { RowDataPacket } from 'mysql2';

export function rowToWallet(row: RowDataPacket): object {
  return {
    id:        row.id,
    userId:    row.user_id,
    address:   row.address,
    chainId:   row.chain_id,
    label:     row.label,
    isActive:  row.is_active === 1,
    createdAt: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at,
  };
}
