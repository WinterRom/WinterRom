/*
 * @Author: Winter Rom
 * @Date: 2025-01-21 14:38:03
 * @LastEditTime: 2026-01-26 16:52:24
 * @LastEditors: your name
 * @Description:
 * @FilePath: \foundesrc\itc_ai_self_ui\src\lib\constants.ts
 */
// export const OLLAMA_API_BASE_URL = `http://100.119.1.141:11434/api`;
// export const OLLAMA_API_BASE_URL = `http://100.119.0.155:11434/api`;
const env: string = import.meta.env.VITE_APP_ENV;
const prodUrl: string = "";
const otherUrl: string = "";
// VITE_APP_ENV=production
export const WEB_UI_VERSION = "v0.0.1-lite";
export const OLLAMA_API_BASE_URL = env === "production" ? prodUrl : otherUrl;
