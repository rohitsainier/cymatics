/**
 * YIN-inspired pitch detection — much more robust than basic autocorrelation.
 * Uses cumulative mean normalized difference function for reliable
 * fundamental frequency extraction from voice, humming, instruments.
 */
export function getDominantFrequency(analyser, sampleRate) {
  const bufferLength = analyser.fftSize;
  const buffer = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(buffer);

  // Check signal level — very low threshold for quiet humming
  let rms = 0;
  for (let i = 0; i < bufferLength; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / bufferLength);
  if (rms < 0.003) return 0; // truly silent

  const halfLen = Math.floor(bufferLength / 2);
  const minPeriod = Math.floor(sampleRate / 6000); // 6000 Hz max
  const maxPeriod = Math.min(halfLen, Math.floor(sampleRate / 40)); // 40 Hz min

  // Step 1: Compute difference function d(tau)
  const diff = new Float32Array(maxPeriod + 1);
  for (let tau = 0; tau <= maxPeriod; tau++) {
    let sum = 0;
    for (let i = 0; i < halfLen; i++) {
      const delta = buffer[i] - buffer[i + tau];
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  // Step 2: Cumulative mean normalized difference function (CMNDF)
  // This is the key YIN innovation — normalizes so the threshold is absolute
  const cmndf = new Float32Array(maxPeriod + 1);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxPeriod; tau++) {
    runningSum += diff[tau];
    cmndf[tau] = diff[tau] * tau / runningSum;
  }

  // Step 3: Find first dip below threshold (absolute threshold method)
  // Start with strict threshold, fall back to looser ones
  let bestTau = -1;
  const thresholds = [0.15, 0.25, 0.35, 0.5];

  for (const threshold of thresholds) {
    for (let tau = minPeriod; tau < maxPeriod; tau++) {
      if (cmndf[tau] < threshold) {
        // Walk forward to find the local minimum in this dip
        while (tau + 1 < maxPeriod && cmndf[tau + 1] < cmndf[tau]) {
          tau++;
        }
        bestTau = tau;
        break;
      }
    }
    if (bestTau > 0) break;
  }

  // Step 4: Parabolic interpolation for sub-sample accuracy
  if (bestTau > 0 && bestTau < maxPeriod) {
    const a = cmndf[bestTau - 1];
    const b = cmndf[bestTau];
    const c = cmndf[bestTau + 1];
    const shift = (a - c) / (2 * (a - 2 * b + c));
    if (Math.abs(shift) < 1) {
      return sampleRate / (bestTau + shift);
    }
    return sampleRate / bestTau;
  }

  // Fallback: peak frequency from FFT spectrum
  const freqData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqData);

  let maxVal = 0;
  let maxIdx = 0;
  // Skip bin 0 (DC), start from bin corresponding to ~40 Hz
  const startBin = Math.max(1, Math.floor(40 * analyser.fftSize / sampleRate));
  for (let i = startBin; i < freqData.length; i++) {
    if (freqData[i] > maxVal) {
      maxVal = freqData[i];
      maxIdx = i;
    }
  }

  if (maxVal < 20) return 0;
  return (maxIdx * sampleRate) / analyser.fftSize;
}

export function getAmplitude(analyser) {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);
  return Math.min(1.2, 0.3 + sum / data.length / 40);
}

export function getFrequencyBands(analyser) {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  const bands = { bass: 0, mid: 0, high: 0 };
  const binCount = data.length;
  const bassEnd = Math.floor(binCount * 0.1);
  const midEnd = Math.floor(binCount * 0.4);

  for (let i = 0; i < bassEnd; i++) bands.bass += data[i];
  for (let i = bassEnd; i < midEnd; i++) bands.mid += data[i];
  for (let i = midEnd; i < binCount; i++) bands.high += data[i];

  bands.bass /= bassEnd * 255;
  bands.mid /= (midEnd - bassEnd) * 255;
  bands.high /= (binCount - midEnd) * 255;

  return bands;
}
