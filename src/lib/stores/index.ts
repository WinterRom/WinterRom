/*
 * @Author: Winter Rom
 * @Date: 2025-01-21 14:38:03
 * @LastEditTime: 2025-02-17 15:40:14
 * @LastEditors: your name
 * @Description:
 * @FilePath: \foundesrc\ollama-webui\src\lib\stores\index.ts
 */
import { writable } from "svelte/store";
import type { Model } from "../utils/Model";
// // Backend
export const info: any = writable({});

// Frontend
export const db: any = writable(undefined);
export const chatId: any = writable("");
export const chats: any = writable([]);
export const models: any = writable<Model[]>([]);
export const settings: any = writable({});
export const showSettings: any = writable(false);

export const userInfor: any = writable({});
export const setToken: any = writable("");
export const userName: any = writable<string | null>(null);
