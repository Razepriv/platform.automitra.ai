import { storage } from "./storage";
import { bolnaClient } from "./bolna";
import type { InsertCall } from "@shared/schema";

// Active polling intervals
const activePolls = new Map<string, NodeJS.Timeout>();

// Polling configuration
const POLL_INTERVAL_MS = 10000; // 10 seconds
const MAX_POLL_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_POLL_ATTEMPTS = Math.floor(MAX_POLL_DURATION_MS / POLL_INTERVAL_MS);

interface PollStatus {
  attempts: number;
  startTime: number;
  callId: string;
  organizationId: string;
}

const pollStatuses = new Map<string, PollStatus>();

export function startCallPolling(
  bolnaCallId: string,
  callId: string,
  organizationId: string,
  emitCallUpdate?: (orgId: string, call: any) => void,
  emitMetricsUpdate?: (orgId: string, metrics: any) => void
) {
  // Don't start if already polling
  if (activePolls.has(bolnaCallId)) {
    console.log(`[Poll] Already polling call ${bolnaCallId}`);
    return;
  }

  console.log(`🔄 [Poll] Starting status polling for call ${bolnaCallId}`);

  pollStatuses.set(bolnaCallId, {
    attempts: 0,
    startTime: Date.now(),
    callId,
    organizationId,
  });

  const pollInterval = setInterval(async () => {
    await pollCallStatus(
      bolnaCallId,
      callId,
      organizationId,
      emitCallUpdate,
      emitMetricsUpdate
    );
  }, POLL_INTERVAL_MS);

  activePolls.set(bolnaCallId, pollInterval);
}

async function pollCallStatus(
  bolnaCallId: string,
  callId: string,
  organizationId: string,
  emitCallUpdate?: (orgId: string, call: any) => void,
  emitMetricsUpdate?: (orgId: string, metrics: any) => void
) {
  const pollStatus = pollStatuses.get(bolnaCallId);
  if (!pollStatus) return;

  pollStatus.attempts++;

  try {
    // Get current call from database
    const currentCall = await storage.getCall(callId, organizationId);
    if (!currentCall) {
      console.log(`[Poll] Call ${callId} not found, stopping poll`);
      stopCallPolling(bolnaCallId);
      return;
    }

    // If call is already in terminal state, stop polling
    if (['completed', 'failed', 'cancelled'].includes(currentCall.status)) {
      console.log(`✅ [Poll] Call ${bolnaCallId} already in terminal state: ${currentCall.status}`);
      stopCallPolling(bolnaCallId);
      return;
    }

    // Fetch details from Bolna
    console.log(`🔍 [Poll] Attempt ${pollStatus.attempts}/${MAX_POLL_ATTEMPTS} for ${bolnaCallId}`);

    const bolnaDetails = await bolnaClient.getCallDetails(bolnaCallId);

    if (!bolnaDetails || Object.keys(bolnaDetails).length === 0) {
      console.log(`[Poll] No details yet for ${bolnaCallId}`);

      // Stop if exceeded max attempts
      if (pollStatus.attempts >= MAX_POLL_ATTEMPTS) {
        console.log(`⏱️ [Poll] Max attempts reached for ${bolnaCallId}, stopping`);
        stopCallPolling(bolnaCallId);
      }
      return;
    }

    // Normalize status
    let normalizedStatus = bolnaDetails.status || currentCall.status;
    if (bolnaDetails.status) {
      const statusLower = bolnaDetails.status.toLowerCase();
      if (statusLower === 'answered' || statusLower === 'in-progress' || statusLower === 'in_progress' || statusLower === 'ongoing') {
        normalizedStatus = 'in_progress';
      } else if (statusLower === 'ended' || statusLower === 'finished' || statusLower === 'completed') {
        normalizedStatus = 'completed';
      } else if (statusLower === 'failed' || statusLower === 'error') {
        normalizedStatus = 'failed';
      } else if (statusLower === 'ringing') {
        normalizedStatus = 'ringing';
      } else if (statusLower === 'initiated' || statusLower === 'queued') {
        normalizedStatus = 'initiated';
      }
    }

    // Check if status changed
    const statusChanged = normalizedStatus !== currentCall.status;
    const hasNewData = bolnaDetails.transcript || bolnaDetails.recording_url || bolnaDetails.duration;

    if (statusChanged || hasNewData) {
      console.log(`📊 [Poll] Update found for ${bolnaCallId}:`);
      console.log(`  Status: ${currentCall.status} → ${normalizedStatus}`);
      if (bolnaDetails.duration) console.log(`  Duration: ${bolnaDetails.duration}s`);
      if (bolnaDetails.transcript) console.log(`  Transcript: ${bolnaDetails.transcript.substring(0, 50)}...`);
      if (bolnaDetails.recording_url) console.log(`  Recording: ${bolnaDetails.recording_url}`);

      const updates: Partial<InsertCall> = {
        status: normalizedStatus,
        duration: bolnaDetails.duration ?? currentCall.duration,
        transcription: bolnaDetails.transcript || currentCall.transcription,
        recordingUrl: bolnaDetails.recording_url || currentCall.recordingUrl,
        endedAt: ['completed', 'failed', 'cancelled'].includes(normalizedStatus)
          ? new Date()
          : currentCall.endedAt,
      };

      const updatedCall = await storage.updateCall(callId, organizationId, updates);

      // Emit real-time updates
      if (emitCallUpdate && updatedCall) {
        emitCallUpdate(organizationId, updatedCall);
      }

      if (emitMetricsUpdate) {
        const metrics = await storage.getDashboardMetrics(organizationId);
        emitMetricsUpdate(organizationId, metrics);
      }

      // Stop polling if in terminal state
      if (['completed', 'failed', 'cancelled'].includes(normalizedStatus)) {
        console.log(`✅ [Poll] Call ${bolnaCallId} completed, stopping poll`);
        stopCallPolling(bolnaCallId);
      }
    }

    // Stop if exceeded max attempts
    if (pollStatus.attempts >= MAX_POLL_ATTEMPTS) {
      console.log(`⏱️ [Poll] Max attempts reached for ${bolnaCallId}, stopping`);
      stopCallPolling(bolnaCallId);
    }

  } catch (error: any) {
    console.error(`❌ [Poll] Error polling ${bolnaCallId}:`, error.message);

    // Stop polling on persistent errors after multiple attempts
    if (pollStatus.attempts >= 5) {
      console.log(`[Poll] Stopping due to repeated errors for ${bolnaCallId}`);
      stopCallPolling(bolnaCallId);
    }
  }
}

export function stopCallPolling(bolnaCallId: string) {
  const interval = activePolls.get(bolnaCallId);
  if (interval) {
    clearInterval(interval);
    activePolls.delete(bolnaCallId);
    pollStatuses.delete(bolnaCallId);
    console.log(`🛑 [Poll] Stopped polling for ${bolnaCallId}`);
  }
}

export function stopAllPolling() {
  console.log(`🛑 [Poll] Stopping all active polls (${activePolls.size} active)`);
  for (const [bolnaCallId, interval] of Array.from(activePolls.entries())) {
    clearInterval(interval);
    activePolls.delete(bolnaCallId);
    pollStatuses.delete(bolnaCallId);
  }
}

// Get polling statistics
export function getPollingStats() {
  const stats = {
    activePolls: activePolls.size,
    polls: Array.from(pollStatuses.entries()).map(([bolnaCallId, status]) => ({
      bolnaCallId,
      attempts: status.attempts,
      duration: Math.floor((Date.now() - status.startTime) / 1000),
      callId: status.callId,
    })),
  };
  return stats;
}
