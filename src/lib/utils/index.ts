/*
 * @Author: 罗文涛 luo_wt@hisuntech.com
 * @Date: 2025-04-15 17:25:18
 * @LastEditors: 罗文涛 luo_wt@hisuntech.com
 * @LastEditTime: 2026-01-20 16:20:23
 * @FilePath: \foundesrcPro\itc_ai_self_ui\src\lib\utils\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { v4 as uuidv4 } from "uuid";

//////////////////////////
// Helper functions
//////////////////////////

export const splitStream = (splitOn: any) => {
	let buffer = "";
	return new TransformStream({
		transform(chunk, controller) {
			buffer += chunk;
			const parts = buffer.split(splitOn);
			parts.slice(0, -1).forEach(part => controller.enqueue(part));
			buffer = parts[parts.length - 1];
		},
		flush(controller) {
			if (buffer) controller.enqueue(buffer);
		}
	});
};

export const convertMessagesToHistory = (messages: any) => {
	let history: any = {
		messages: {},
		currentId: null
	};

	let parentMessageId = null;
	let messageId = null;

	for (const message of messages) {
		// messageId = uuidv4();
		messageId = message.id;

		if (parentMessageId !== null) {
			history.messages[parentMessageId].childrenIds = [
				...history.messages[parentMessageId].childrenIds,
				messageId
			];
		}

		history.messages[messageId] = {
			...message,
			id: messageId,
			parentId: parentMessageId,
			childrenIds: []
		};
		debugger;
		parentMessageId = messageId;
	}

	history.currentId = messageId;
	return history;
};

const copyToClipboard = (text: any) => {
	if (!navigator.clipboard) {
		var textArea = document.createElement("textarea");
		textArea.value = text;

		// Avoid scrolling to bottom
		textArea.style.top = "0";
		textArea.style.left = "0";
		textArea.style.position = "fixed";

		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();

		try {
			var successful = document.execCommand("copy");
			var msg = successful ? "successful" : "unsuccessful";
		} catch (err) {}

		document.body.removeChild(textArea);
		return;
	}
	navigator.clipboard.writeText(text).then(
		function () {},
		function (err) {}
	);
};

/**
 * 将后端返回的扁平化历史记录转换为前端 Messages.svelte 所需的树状 history 结构
 * 后端数据格式示例: [{ query: "...", answer: "...", id: "..." }, ...]
 */
export const convertBackendMessagesToHistory = (backendMessages: any[]) => {
	const history: any = {
		messages: {},
		currentId: null
	};
	let lastId: any = null;
	backendMessages.forEach((item, index) => {
		const userMsgId = `${item.id}-user`;
		const assistantMsgId = `${item.id}-assistant`;
		// 1. 创建用户消息节点
		history.messages[userMsgId] = {
			id: userMsgId,
			parentId: lastId,
			childrenIds: [assistantMsgId],
			role: "user",
			content: item.query,
			done: true,
			files: item.message_files
		};

		// 如果有上一个节点，将当前用户节点设为其子节点
		if (lastId && history.messages[lastId]) {
			history.messages[lastId].childrenIds.push(userMsgId);
		}

		// 2. 创建助手消息节点
		history.messages[assistantMsgId] = {
			messageId: item.id,
			feedback: item.feedback || null,
			conversationId: item.conversation_id,
			query: item.query,
			id: assistantMsgId,
			parentId: userMsgId,
			childrenIds: [],
			role: "assistant",
			content: item.answer || "手动停止",
			done: true
		};
		console.log("item.feedback ", item.feedback);

		lastId = assistantMsgId;
	});

	history.currentId = lastId;
	return history;
};
