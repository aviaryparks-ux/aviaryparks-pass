import { supabaseAdmin } from '@/lib/supabaseServer';

export class AuditLogger {
  /**
   * Mencatat tindakan Admin ke tabel audit_logs.
   * @param userId ID Admin (dari tabel system_users)
   * @param action Nama tindakan (contoh: 'DELETE_REWARD', 'UPDATE_MEMBER')
   * @param targetTable Tabel yang terdampak
   * @param details Data spesifik yang relevan dengan tindakan ini
   */
  static async log(request: Request, actionType: string, entityType: string, entityId: string | null = null, details: any = null) {
    try {
      // Extract admin or cashier token
      let token = null;
      
      // Since request in NextJS might be a NextRequest or standard Request, we handle cookies
      if (typeof (request as any).cookies?.get === 'function') {
        token = (request as any).cookies.get('system_token')?.value;
      } else {
        const cookieHeader = request.headers.get('cookie') || '';
        const match = cookieHeader.match(/system_token=([^;]+)/);
        if (match) token = match[1];
      }

      let actorId = null;
      let actorName = 'SYSTEM';

      if (token) {
        try {
          const { jwtVerify } = await import('jose');
          const secret = process.env.JWT_SECRET || '';
          const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
          actorId = (payload.sub as string) || (payload.userId as string) || null;
          actorName = (payload.username as string) || (payload.name as string) || (payload.role as string) || 'ADMIN';
        } catch (e) {
          console.warn('Failed to parse system_token for AuditLog');
        }
      }

      await supabaseAdmin.from('audit_logs').insert({
        actor_id: actorId,
        actor_name: actorName,
        action_type: actionType,
        entity_type: entityType,
        entity_id: entityId,
        details: details
      });
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }
}
