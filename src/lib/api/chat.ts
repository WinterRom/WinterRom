/*
 * @Author: 罗文涛 luo_wt@hisuntech.com
 * @Date: 2025-03-04 10:22:31
 * @LastEditors: 罗文涛 luo_wt@hisuntech.com
 * @LastEditTime: 2025-04-17 10:28:30
 * @FilePath: \foundesrcPro\ollama-webui\src\lib\api\chat.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import request from "$lib/utils/request";
import { getToken, setToken, removeToken } from "$lib/utils/cookie";
import { OLLAMA_API_BASE_URL } from "$lib/constants";
export const getChat = (data: any) =>
	request({
		url: "/difyApi/chatMessages",
		method: "get",
		data
	});
export const getChatSSE = async (data: any, onData: (data: string) => void) => {
	// 1. 创建AbortController以便取消请求
	const controller = new AbortController();

	try {
		// 2. 发起fetch请求
		const response: any = await fetch(`/difyApi/chatMessages`, {
			method: "get",
			headers: {
				"Content-Type": "application/json",
				Accept: "text/event-stream", // 关键头声明
				Authorization: "Bearer app-Pu6zAG33K8oesH4CjlY0WTAn",
				// 可在此添加认证头等信息
				"X-Token": getToken() || ""
			},
			body: JSON.stringify({
				// inputs: {},
				// query: "你好，你是谁？",
				message: data

				// response_mode: "streaming",
				// user: "abc-123"
			})

			// signal: controller.signal
		});

		// 3. 处理异常响应
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		// 4. 准备流式读取
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		// 5. 持续读取流数据
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			// 6. 解码并累积数据
			buffer += decoder.decode(value, { stream: true });

			// 7. 解析SSE事件（按\n\n分割）
			let lastIndex = 0;
			while (true) {
				// 查找事件边界
				const eventEnd = buffer.indexOf("\n\n", lastIndex);
				if (eventEnd === -1) break;

				// 提取完整事件
				const eventContent = buffer.slice(lastIndex, eventEnd);
				lastIndex = eventEnd + 2; // 跳过两个换行符

				// 解析事件内容
				const eventData = parseSSEEvent(eventContent);
				if (eventData) onData(eventData);
			}

			// 保留未处理的数据供下次读取
			buffer = buffer.slice(lastIndex);
		}

		// 8. 处理剩余数据（如果有）
		if (buffer) {
			const eventData = parseSSEEvent(buffer);
			if (eventData) onData(eventData);
		}
	} catch (error: any) {
		if (error.name !== "AbortError") {
			throw error; // 抛出非取消错误
		}
	}

	return {
		abort: () => controller.abort()
	};
};

// SSE事件解析器
const parseSSEEvent = (rawContent: string): string | null => {
	let data = "";
	// 按行分割处理
	for (const line of rawContent.split("\n")) {
		if (line.startsWith("data: ")) {
			data += line.slice(6).trim() + "\n"; // 保留多行数据
		}
		// 可扩展处理其他字段（如event, id等）
	}
	return data.trim() || null;
};
