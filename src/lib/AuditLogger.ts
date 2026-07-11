import { supabaseAdmin } from '@/lib/supabaseServer';

export class AuditLogger {
  /**
   * Mencatat tindakan Admin ke tabel audit_logs.
   * @param userId ID Admin (dari tabel system_users)
   * @param action Nama tindakan (contoh: 'DELETE_REWARD', 'UPDATE_MEMBER')
   * @param targetTable Tabel yang terdampak
   * @param details Data spesifik yang relevan dengan tindakan ini
   */
  static async log(userId: string | null, action: string, targetTable: string, details: any) {
    try {
      await supabaseAdmin.from('audit_logs').insert({
        user_id: userId,
        action,
        target_table: targetTable,
        details
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
}
