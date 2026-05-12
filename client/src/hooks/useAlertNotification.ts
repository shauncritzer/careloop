import { useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import type { AlertResult } from '@/lib/alertEngine';

/**
 * Hook to send automated alert notifications when check-in responses
 * indicate concerning health patterns.
 */
export function useAlertNotification() {
  const saveAlertMutation = trpc.careloop.saveAlert.useMutation();

  const notifyOnAlert = useCallback(async (
    patientName: string,
    alertResult: AlertResult,
    patientId: number
  ) => {
    // Save alert to database regardless of severity (for history)
    try {
      await saveAlertMutation.mutateAsync({
        patientId,
        severity: alertResult.severity,
        messages: alertResult.messages,
        recommendations: alertResult.recommendations,
      });
    } catch (e) {
      console.error('Failed to save alert:', e);
    }
  }, [saveAlertMutation]);

  return { notifyOnAlert };
}
