/**
 * Export utilities for cymatics patterns — PNG screenshots and WebM video recording.
 * Zero external dependencies — uses built-in Canvas and MediaRecorder APIs.
 */

export function exportPNG(canvas, frequency, n, m) {
  if (!canvas) return;
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `cymatics-${frequency}Hz-n${n}m${m}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Video Recording (WebM via MediaRecorder) ──

let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = 0;

export function canRecord() {
  return typeof MediaRecorder !== "undefined" &&
    MediaRecorder.isTypeSupported("video/webm");
}

export function startRecording(canvas, fps = 30) {
  if (!canvas || !canRecord()) return false;

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  mediaRecorder = new MediaRecorder(stream, { mimeType });
  recordedChunks = [];
  recordingStartTime = Date.now();

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.start(100); // collect data every 100ms
  return true;
}

export function stopRecording(frequency, n, m) {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      resolve(null);
      return;
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cymatics-${frequency}Hz-n${n}m${m}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      mediaRecorder = null;
      recordedChunks = [];
      resolve(blob);
    };

    mediaRecorder.stop();
  });
}

export function getRecordingDuration() {
  if (!mediaRecorder || mediaRecorder.state === "inactive") return 0;
  return Math.floor((Date.now() - recordingStartTime) / 1000);
}

export function isRecording() {
  return mediaRecorder && mediaRecorder.state === "recording";
}
