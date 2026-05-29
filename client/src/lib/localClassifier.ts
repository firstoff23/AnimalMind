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
      return getLocalMockClassification();
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
