export const DEEPSEEK_CONFIG = {
  apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  model: 'deepseek-chat',
  url: 'https://api.deepseek.com/chat/completions',
};
