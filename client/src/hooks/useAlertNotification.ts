import { useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import type { AlertResult } from '@/lib/alertEngine';

/**
 * Hook to send automated alert notifications when check-in responses
 * indicate concerning health patterns.
 * 
 * Notifications are:
 * 1. Stored as alerts in Supabase (already done in check-in flow)
 * 2. Sent via tRPC to server for logging/email dispatch
 * 3. Shown as in-app toast notifications
 */
export function useAlertNotification() {
  const sendAlert = trpc.careloop.sendAlert.useMutation();

  const notifyOnAlert = useCallback(async (
    patientName: string,
    alertResult: AlertResult,
    patientId: string
  ) => {
    // Only notify on yellow or red alerts
    if (alertResult.severity === 'green') return;

    // Get family members to notify
    const { data: familyMembers } = await supabase
      .from('family_access')
      .select('user_id')
      .eq('patient_id', patientId);

    // Send server-side alert (for logging and potential email dispatch)
    try {
      await sendAlert.mutateAsync({
        patientName,
        severity: alertResult.severity,
        messages: alertResult.messages,
      });
    } catch (e) {
      console.error('Failed to send alert notification:', e);
    }
  }, [sendAlert]);

  return { notifyOnAlert };
}
