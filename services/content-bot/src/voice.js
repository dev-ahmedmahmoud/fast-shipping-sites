// Voice -> text with Cloudflare Workers AI (Whisper). Free daily quota on the Workers free plan.
// The text goes back into the input box; the person reads and fixes it before sending.
const MODEL = '@cf/openai/whisper-large-v3-turbo';
// Helps Whisper spell the names and words this site uses.
const HINT = 'قائمة المهندس حسين داود، نادي طنطا الرياضي، الصفحة الرئيسية، الفوتر، الشعار، المرشحين، الملفات، الشكاوى.';

function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function transcribe(env, bytes) {
  const out = await env.AI.run(MODEL, { audio: toBase64(bytes), language: 'ar', task: 'transcribe', initial_prompt: HINT, vad_filter: true });
  return String(out?.text || '').replace(/\s+/g, ' ').trim();
}
