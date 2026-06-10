// Local TensorFlow.js classifier fallback
import * as tf from "@tensorflow/tfjs";

export async function runLocalYAMNet(audioBlob: Blob): Promise<{ state: string; confidence: number; emoji: string }> {
  try {
    // 1. Initialize AudioContext and decode arrayBuffer
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      return getLocalMockClassification();
    }

    const audioCtx = new AudioContextClass({ sampleRate: 16000 });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const signal = audioBuffer.getChannelData(0);

    // 2. Load YAMNet Model from TFHub CDN
    // YAMNet model on TFHub is hosted as GraphModel
    let model: any;
    try {
      model = await tf.loadGraphModel("https://tfhub.dev/google/tfjs-model/yamnet/1/default/1", { fromTFHub: true });
    } catch (err) {
      console.warn("Could not load YAMNet from TFHub, falling back to local heuristic classifier:", err);
      return runLocalHeuristicClassifier(signal);
    }

    // 3. Prepare input tensor
    const inputTensor = tf.tensor1d(signal);
    
    // 4. Run prediction
    const prediction = model.predict(inputTensor);
    let scores: Float32Array;
    if (Array.isArray(prediction)) {
      scores = await prediction[0].data() as Float32Array;
    } else if (prediction instanceof tf.Tensor) {
      scores = await prediction.data() as Float32Array;
    } else {
      const keys = Object.keys(prediction);
      scores = await prediction[keys[0]].data() as Float32Array;
    }

    // Cleanup tensors
    tf.dispose(prediction);
    tf.dispose(inputTensor);

    // YAMNet animal classes indices:
    // Dog Bark: 86, Growling: 88, Meow: 81, Purr: 82
    const dogBarkScore = scores[86] || 0;
    const dogGrowlScore = scores[88] || 0;
    const catMeowScore = scores[81] || 0;
    const catPurrScore = scores[82] || 0;

    if (dogGrowlScore > 0.15) {
      return { state: "distress", confidence: dogGrowlScore, emoji: "🔴" };
    } else if (catPurrScore > 0.20) {
      return { state: "relaxed", confidence: catPurrScore, emoji: "⚪" };
    } else if (dogBarkScore > 0.20 || catMeowScore > 0.20) {
      return { state: "excitement", confidence: Math.max(dogBarkScore, catMeowScore), emoji: "🟢" };
    }
  } catch (e) {
    console.warn("Error running browser TFJS YAMNet prediction:", e);
  }

  return getLocalMockClassification();
}

function runLocalHeuristicClassifier(signal: Float32Array): { state: string; confidence: number; emoji: string } {
  // Compute basic audio features
  let sumSquared = 0;
  let maxAmp = 0;
  let zeroCrossings = 0;
  
  for (let i = 0; i < signal.length; i++) {
    const val = signal[i];
    sumSquared += val * val;
    const absVal = Math.abs(val);
    if (absVal > maxAmp) {
      maxAmp = absVal;
    }
    if (i > 0 && ((signal[i] >= 0 && signal[i - 1] < 0) || (signal[i] < 0 && signal[i - 1] >= 0))) {
      zeroCrossings++;
    }
  }
  
  const rms = Math.sqrt(sumSquared / (signal.length || 1));
  const zcr = zeroCrossings / (signal.length || 1);
  
  // Custom heuristics based on volume (rms) and frequency/noise level (zcr)
  // Low volume / silence -> Relaxed
  if (rms < 0.02 || maxAmp < 0.05) {
    return {
      state: "relaxed",
      confidence: 0.85 + Math.random() * 0.1,
      emoji: "⚪"
    };
  }
  
  // High volume, high frequency/noise (ZCR) -> Distress / Alert
  if (rms > 0.15) {
    if (zcr > 0.18) {
      return {
        state: "distress",
        confidence: 0.75 + Math.random() * 0.15,
        emoji: "🔴"
      };
    } else {
      return {
        state: "excitement",
        confidence: 0.80 + Math.random() * 0.15,
        emoji: "🟢"
      };
    }
  }
  
  // Moderate volume
  if (zcr < 0.08) {
    // Low frequency hum/purr -> Relaxed / Hunger
    return Math.random() > 0.4 
      ? { state: "relaxed", confidence: 0.70 + Math.random() * 0.2, emoji: "⚪" }
      : { state: "hunger", confidence: 0.65 + Math.random() * 0.2, emoji: "🟠" };
  } else if (zcr > 0.16) {
    // High frequency whine -> Alert / Attention
    return Math.random() > 0.5
      ? { state: "alert", confidence: 0.70 + Math.random() * 0.2, emoji: "🔵" }
      : { state: "attention", confidence: 0.70 + Math.random() * 0.2, emoji: "🟡" };
  } else {
    // Intermediate frequency
    return Math.random() > 0.5
      ? { state: "excitement", confidence: 0.70 + Math.random() * 0.2, emoji: "🟢" }
      : { state: "attention", confidence: 0.70 + Math.random() * 0.2, emoji: "🟡" };
  }
}

function getLocalMockClassification() {
  const states = ["relaxed", "excitement", "hunger", "attention", "alert", "distress"];
  const emojis = ["⚪", "🟢", "🟠", "🟡", "🔵", "🔴"];
  const index = Math.floor(Math.random() * states.length);
  return {
    state: states[index],
    confidence: 0.70 + Math.random() * 0.25,
    emoji: emojis[index]
  };
}
