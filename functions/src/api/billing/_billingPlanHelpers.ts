import { RowDataPacket } from 'mysql2';

export interface BillingPlan {
  id: number;
  plan_key: string;
  billing_type: 'one_time';
  display_name_ja: string;
  display_name_en: string;
  unit_amount: number;
  currency: string;
  description_ja: string | null;
  is_active: number;
  sort_order: number;
  updated_at: string;
}

export function rowToPlan(row: RowDataPacket): BillingPlan {
  return {
    id:             row.id,
    plan_key:       row.plan_key,
    billing_type:   row.billing_type,
    display_name_ja: row.display_name_ja,
    display_name_en: row.display_name_en,
    unit_amount:    row.unit_amount,
    currency:       row.currency,
    description_ja: row.description_ja ?? null,
    is_active:      row.is_active,
    sort_order:     row.sort_order,
    updated_at:     row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}
