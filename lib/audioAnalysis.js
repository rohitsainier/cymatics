export function getDominantFrequency(analyser, sampleRate) {
  const bufferLength = analyser.fftSize;
  const buffer = new Float32Array(bufferLength);
  analyser.getFloatTimeDomainData(buffer);

  // Autocorrelation method for pitch detection
  let bestOffset = -1;
  let bestCorrelation = 0;
  let foundGoodCorrelation = false;

  // Search within useful cymatics range
  const minPeriod = Math.floor(sampleRate / 6000); // 6000 Hz max
  const maxPeriod = Math.floor(sampleRate / 40); // 40 Hz min

  // Check if there's enough signal
  let rms = 0;
  for (let i = 0; i < bufferLength; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / bufferLength);
  if (rms < 0.01) return 0; // too quiet

  let lastCorrelation = 1;
  for (let offset = minPeriod; offset < maxPeriod; offset++) {
    let correlation = 0;
    for (let i = 0; i < bufferLength - offset; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / (bufferLength - offset);

    if (correlation > 0.9 && correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
      foundGoodCorrelation = true;
    } else if (foundGoodCorrelation) {
      // We already found a good correlation, if it starts dropping, stop
      if (correlation - lastCorrelation < 0) {
        break;
      }
    }
    lastCorrelation = correlation;
  }

  if (bestCorrelation > 0.01 && bestOffset > 0) {
    return sampleRate / bestOffset;
  }

  // Fallback: peak frequency from FFT
  const freqData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(freqData);

  let maxVal = 0;
  let maxIdx = 0;
  for (let i = 1; i < freqData.length; i++) {
    if (freqData[i] > maxVal) {
      maxVal = freqData[i];
      maxIdx = i;
    }
  }

  if (maxVal < 10) return 0;
  return (maxIdx * sampleRate) / (analyser.fftSize * 2);
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
