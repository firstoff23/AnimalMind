export function calculateAudioLevel(samples: Uint8Array): number {
  if (samples.length === 0) return 0;

  let sumSquares = 0;

  for (let i = 0; i < samples.length; i++) {
    const centered = (samples[i] - 128) / 128;
    sumSquares += centered * centered;
  }

  const rms = Math.sqrt(sumSquares / samples.length);
  return Math.min(1, Math.round(rms * 100) / 100);
}

export function createWaveform(samples: Uint8Array, buckets = 16): number[] {
  if (samples.length === 0 || buckets <= 0) return [];

  const bucketSize = Math.max(1, Math.floor(samples.length / buckets));
  const waveform: number[] = [];

  for (let start = 0; start < samples.length && waveform.length < buckets; start += bucketSize) {
    const end = Math.min(samples.length, start + bucketSize);
    let peak = 0;

    for (let i = start; i < end; i++) {
      peak = Math.max(peak, Math.abs((samples[i] - 128) / 128));
    }

    waveform.push(Math.min(1, Math.round(peak * 100) / 100));
  }

  return waveform;
}
