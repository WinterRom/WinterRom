/*
 * @Author: 罗文涛 luo_wt@hisuntech.com
 * @Date: 2025-04-15 17:25:18
 * @LastEditors: 罗文涛 luo_wt@hisuntech.com
 * @LastEditTime: 2026-01-14 11:02:44
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
	console.log("convertMessagesToHistory", messages);

	let history: any = {
		messages: {},
		currentId: null
	};
	debugger;
	let parentMessageId = null;
	let messageId = null;
	debugger;
	for (const message of messages) {
		// messageId = uuidv4();
		messageId = message.id;
		console.log("message", message);
		console.log("messageId", messageId);
		debugger;
		if (parentMessageId !== null) {
			console.log("if", parentMessageId !== null);
			debugger;
			history.messages[parentMessageId].childrenIds = [
				...history.messages[parentMessageId].childrenIds,
				messageId
			];
			console.log("if-history", history);
			debugger;
		}

		history.messages[messageId] = {
			...message,
			id: messageId,
			parentId: parentMessageId,
			childrenIds: []
		};
		console.log("history", history);
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
			console.log("Fallback: Copying text command was " + msg);
		} catch (err) {
			console.error("Fallback: Oops, unable to copy", err);
		}

		document.body.removeChild(textArea);
		return;
	}
	navigator.clipboard.writeText(text).then(
		function () {
			console.log("Async: Copying to clipboard was successful!");
		},
		function (err) {
			console.error("Async: Could not copy text: ", err);
		}
	);
};
