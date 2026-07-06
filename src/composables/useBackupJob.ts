/**
 * Drives one backup/restore job: kicks it off, then polls `GET /jobs/{id}` every
 * ~1.5s while it is QUEUED/RUNNING and stops on SUCCEEDED/FAILED. Start failures
 * and poll failures both land in `error` (parsed FDP envelope), so the view can
 * branch on `.status` (403/404/409/413). The timer is cleared on unmount and on
 * every new `run`, so nothing leaks.
 *
 * One instance per section (backup, restore) — they run independently.
 */
import { computed, onUnmounted, ref } from "vue";
import { getBackupJob, isJobDone, type BackupJob } from "@/api/backup";
import { parseFdpError, type ParsedError } from "@/api/errors";

const POLL_MS = 1500;

export function useBackupJob() {
  const job = ref<BackupJob | null>(null);
  const starting = ref(false);
  const polling = ref(false);
  const error = ref<ParsedError | null>(null);
  /** true while the start request or the poll loop is in flight. */
  const busy = computed(() => starting.value || polling.value);

  let timer: ReturnType<typeof setTimeout> | undefined;
  function stopPolling() {
    if (timer) clearTimeout(timer);
    timer = undefined;
    polling.value = false;
  }

  async function tick() {
    const id = job.value?.id;
    if (!id) return;
    try {
      const next = await getBackupJob(id);
      job.value = next;
      if (isJobDone(next.state)) {
        stopPolling();
        return;
      }
      timer = setTimeout(() => void tick(), POLL_MS);
    } catch (e) {
      error.value = parseFdpError(e);
      stopPolling();
    }
  }

  /** Start a job via `starter`, then poll it to completion. Resets prior state. */
  async function run(starter: () => Promise<BackupJob>) {
    stopPolling();
    error.value = null;
    job.value = null;
    starting.value = true;
    try {
      const started = await starter();
      job.value = started;
      starting.value = false;
      if (!isJobDone(started.state)) {
        polling.value = true;
        timer = setTimeout(() => void tick(), POLL_MS);
      }
    } catch (e) {
      starting.value = false;
      error.value = parseFdpError(e);
    }
  }

  /** Clear the tracked job, error, and any running poll. */
  function reset() {
    stopPolling();
    job.value = null;
    error.value = null;
  }

  onUnmounted(stopPolling);
  return { job, busy, polling, error, run, reset };
}
