<script lang="ts">
	import { v4 as uuidv4 } from "uuid";
	import toast from "svelte-french-toast";
	import { onMount, tick, onDestroy } from "svelte";
	import { OLLAMA_API_BASE_URL } from "$lib/constants";
	import {
		getChat,
		getChatSSE,
		getConversationMessageList,
		stopChat
	} from "$lib/api/chat";
	import { getToken, setToken, removeToken } from "$lib/utils/cookie";

	import {
		convertMessagesToHistory,
		splitStream,
		convertBackendMessagesToHistory
	} from "$lib/utils";
	import { goto } from "$app/navigation";
	import { models, settings, db, chats, chatId } from "$lib/stores";
	import Sidebar from "$lib/components/layout/Sidebar.svelte";
	import MessageInput from "$lib/components/chat/MessageInput.svelte";
	import Messages from "$lib/components/chat/Messages.svelte";
	import ModelSelector from "$lib/components/chat/ModelSelector.svelte";
	import Navbar from "$lib/components/layout/Navbar.svelte";
	import { page } from "$app/stores";
	import Modal from "$lib/components/common/Modal.svelte";
	let loaded = false;
	let stopResponseFlag = false;
	let autoScroll = true;
	let copyContent: any;
	// let chatId = $page.params.id;
	let show: boolean = false;
	let showLeft: boolean = false;
	let title = "";
	let prompt = "";
	let selectedModels = [""];
	let messages: any = [];
	let history: any = {
		messages: {},
		currentId: null
	};
	let conversationId: string = $page.params.id;
	let windowWidth = 0;
	let isStreaming = false;
	let stopChatTaskId = "";
	$: isMobile = windowWidth <= 1040;
	$: if (copyContent) {
		prompt = copyContent;
		tick();
	}
	$: if (history.currentId !== null) {
		let _messages = [];
		let currentMessage: any = history.messages[history.currentId];
		while (currentMessage !== null) {
			_messages.unshift({ ...currentMessage });
			currentMessage =
				currentMessage.parentId !== null
					? history.messages[currentMessage.parentId]
					: null;
		}
		messages = _messages;
	} else {
		messages = [];
	}

	$: if ($page.params.id) {
		(async () => {
			let chat = await loadChat();
			await tick();
			if (chat) {
				loaded = true;
			} else {
				await goto("/");
			}
		})();
	}

	function handleResize() {
		windowWidth = window.innerWidth;
		show = windowWidth > 1040;
	}

	onMount(async () => {
		window.addEventListener("resize", handleResize);
		handleResize(); // 初始化尺寸
	});
	onDestroy(() => {
		window.removeEventListener("resize", handleResize);
	});
	//////////////////////////
	// Web functions
	//////////////////////////

	// const loadChat = async () => {
	// 	await chatId.set($page.params.id);
	// 	const chat = await $db.getChatById($chatId);

	// 	if (chat) {
	// 		history =
	// 			(chat?.history ?? undefined) !== undefined
	// 				? chat.history
	// 				: convertMessagesToHistory(chat.messages);
	// 		title = chat.title;

	// 		let _settings = JSON.parse(localStorage.getItem("settings") ?? "{}");
	// 		await settings.set({
	// 			..._settings,
	// 			system: chat.system ?? _settings.system,
	// 			options: chat.options ?? _settings.options
	// 		});
	// 		autoScroll = true;

	// 		await tick();
	// 		if (messages.length > 0) {
	// 			history.messages[messages.at(-1).id].done = true;
	// 		}
	// 		await tick();

	// 		return chat;
	// 	} else {
	// 		return null;
	// 	}
	// };
	// const loadChat = async () => {
	// 	await chatId.set($page.params.id);
	// 	conversationId = $page.params.id;
	// 	const params: any = { conversationId: $page.params.id };
	// 	const { data } = await getConversationMessageList(params);
	// 	if (data && Array.isArray(data)) {
	// 		// 直接使用后端返回的扁平化数组进行转换，不经过本地存储
	// 		history = convertBackendMessagesToHistory(data);
	// 		autoScroll = true;
	// 		await tick();
	// 		// 确保最后一条消息标记为完成
	// 		if (history.currentId && history.messages[history.currentId]) {
	// 			history.messages[history.currentId].done = true;
	// 		}
	// 		await tick();
	// 		if (autoScroll) {
	// 			window.scrollTo({ top: document.body.scrollHeight });
	// 		}
	// 		return data;
	// 	} else if (data && data.history) {
	// 		// 兼容可能已经包含 history 结构的情况
	// 		history = data.history;
	// 		return data;
	// 	} else {
	// 		// 如果没有数据，初始化空的 history
	// 		history = {
	// 			messages: {},
	// 			currentId: null
	// 		};
	// 		return null;
	// 	}
	// };
	// 修改 loadChat，移除 $db 相关逻辑，只从接口获取
	const loadChat = async () => {
		await chatId.set($page.params.id);
		conversationId = $page.params.id; // 确保 conversationId 初始化

		const params: any = { conversationId: conversationId };
		try {
			const { data } = await getConversationMessageList(params);
			if (data && Array.isArray(data)) {
				// 使用工具函数转换后端消息格式为前端 history 格式
				history = convertBackendMessagesToHistory(data);

				// 标记最后一条消息为完成状态
				if (history.currentId && history.messages[history.currentId]) {
					history.messages[history.currentId].done = true;
				}

				// 刷新 UI
				messages = []; // 先清空，利用 history.currentId 触发 $: block 重新生成 messages
				await tick();

				if (history.currentId !== null) {
					// 重新触发一次响应式更新
					history = { ...history };
				}

				autoScroll = true;
				await tick();
				if (autoScroll) {
					window.scrollTo({ top: document.body.scrollHeight });
				}
				loaded = true; // 标记加载完成
				return data;
			}
		} catch (e) {
			goto("/"); // 失败则返回首页
		}
	};
	const copyToClipboard = (text: string, usercopy?: any) => {
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
			} catch (err) {
				// console.error("Fallback: Oops, unable to copy", err);
			}
			document.body.removeChild(textArea);
			return;
		}
		navigator.clipboard.writeText(text).then(
			function () {},
			function (err) {}
		);
	};

	//////////////////////////
	// Ollama functions
	//////////////////////////

	const sendPrompt = async (
		userPrompt: any,
		parentId: any,
		_chatId: any,
		fileId?: string
	) => {
		// await Promise.all(
		// 	// selectedModels.map(async model => {
		// 	// })
		// )
		console.log(userPrompt, parentId, _chatId, fileId);

		await sendPromptOllama(userPrompt, parentId, _chatId, fileId);
		// await chats.set(await $db.getChats());
	};
	// 深度优化版发送函数
	const sendPromptOllama = async (
		userPrompt: any,
		parentId: any,
		_chatId: any, // 这里的 _chatId 其实就是 conversationId
		fileId?: string
	) => {
		isStreaming = true;
		stopChatTaskId = "";
		console.log("启动");

		// 1. 初始化新消息对象
		let responseMessageId = uuidv4();
		let responseMessage: any = {
			parentId: parentId,
			id: responseMessageId,
			childrenIds: [],
			role: "assistant",
			content: "",
			isShow: false
		};

		// 2. 更新内存中的历史记录
		history.messages[responseMessageId] = responseMessage;
		history.currentId = responseMessageId;
		if (parentId !== null) {
			history.messages[parentId].childrenIds = [
				...history.messages[parentId].childrenIds,
				responseMessageId
			];
		}

		// 3. 触发 Svelte 更新
		history = { ...history };
		await tick();
		window.scrollTo({ top: document.body.scrollHeight });

		// 4. 获取 UI 对象引用（关键：用于直接更新避免全量重绘）
		let uiMessage = null;
		if (messages.length > 0) {
			uiMessage = messages.find((m: any) => m.id === responseMessageId);
		}

		// 5. 构建参数
		const params = new URLSearchParams({
			message: userPrompt,
			conversationId: conversationId, // 详情页必须带上当前的 ID
			fileId: fileId || ""
		});

		try {
			// 使用根路径 /api 防止路由相对路径错误
			const res: any = await fetch(
				`/api/difyApi/chatMessages?${params.toString()}`,
				{
					method: "GET",
					headers: {
						"Content-Type": "application/json",
						Accept: "text/event-stream",
						"X-Token": getToken() || "" // 确保引入了 getToken
					}
				}
			);

			if (!res.ok) throw new Error(res.statusText);

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = "";
			let lastRenderTime = 0;
			let tagBuffer = "";
			while (true) {
				const { done, value } = await reader.read();

				if (done || stopResponseFlag) {
					if (stopResponseFlag) {
						if (uiMessage) uiMessage.content += " [已停止]";
						responseMessage.content += " [已停止]";
					}
					responseMessage.done = true;
					if (uiMessage) uiMessage.done = true;
					messages = messages; // 最后强制刷新
					break;
				}

				const chunk = decoder.decode(value, { stream: true });
				buffer += chunk;
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (!line.trim() || line.startsWith("event:")) continue;
					const jsonString = line.replace(/^data: /, "");
					if (!jsonString) continue;

					try {
						const data = JSON.parse(jsonString);

						// 更新 conversationId (理论上详情页ID不变，但以防万一)
						if (data.event === "workflow_started") {
							stopChatTaskId = data.task_id;
							if (
								data.conversation_id &&
								data.conversation_id !== conversationId
							) {
								conversationId = data.conversation_id;
							}
						}

						if (data.event === "message") {
							const content = data.answer;

							const PRINT_SPEED = 30;

							// 自动滚动控制
							let autoScroll = true;
							let fullTextChunk = tagBuffer + data.answer;
							tagBuffer = ""; // 清空缓冲
							let i = 0;
							while (i < fullTextChunk.length) {
								// 检查是否遇到标签起始
								if (fullTextChunk[i] === "<") {
									const endTagIndex = fullTextChunk.indexOf(">", i);
									if (endTagIndex !== -1) {
										// 1. 找到了完整的标签，一次性追加到 content，不触发延迟
										// 这样用户瞬间看到的是样式变化，而不是标签字符
										responseMessage.content += fullTextChunk.slice(
											i,
											endTagIndex + 1
										);
										i = endTagIndex + 1;
										continue;
									} else {
										// 2. 没找到闭合的 ">"，说明标签被截断了（例如只收到了 "<str"）
										// 将剩下的所有字符存入 buffer，等待下一个数据包拼接
										tagBuffer = fullTextChunk.slice(i);
										break; // 结束本次循环，等待下一次数据
									}
								}
								// 普通字符，逐个追加并延迟
								responseMessage.content += fullTextChunk[i];
								i++;
								// 强制更新 Svelte 视图
								messages = messages;
								await tick();
								if (autoScroll) {
									window.scrollTo({
										top: document.body.scrollHeight,
										behavior: "smooth" // 或 "auto" 以获得更好的性能
									});
								}
								// 只有普通文字才延迟，HTML标签不延迟
								await new Promise(resolve => setTimeout(resolve, PRINT_SPEED));
							}
							if (uiMessage) {
								uiMessage.content += content;
							}
							// C. 节流刷新：每 100ms 触发一次 Svelte DOM 更新
							// 这解决了“卡死”问题，避免了高频渲染
							const now = Date.now();
							if (now - lastRenderTime > 100) {
								messages = messages;
								lastRenderTime = now;

								// 滚动控制
								window.requestAnimationFrame(() => {
									if (autoScroll) {
										window.scrollTo({
											top: document.body.scrollHeight,
											behavior: "smooth"
										});
									}
								});
							}
						}

						if (data.event === "error") {
							const errText = " 发生错误";
							responseMessage.content += errText;
							if (uiMessage) uiMessage.content += errText;
							responseMessage.error = true;
						}
					} catch (e) {
						// console.error(e);
					}
				}
			}
		} catch (error: any) {
			responseMessage.done = true;
			responseMessage.content = error.message || "请求失败";
			if (uiMessage) {
				uiMessage.done = true;
				uiMessage.content = responseMessage.content;
			}
			messages = messages;
			toast.error(error.message || "网络请求失败");
		} finally {
			// 【关键】重置状态，允许再次发送
			isStreaming = false;
			stopChatTaskId = "";
			stopResponseFlag = false;
			await tick();

			window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
		}
	};
	const submitPrompt = async (userPrompt: any, files: any) => {
		// 1. 基本校验
		if (!userPrompt) return;
		const textarea: any = document.getElementById("chat-textarea");
		if (textarea) textarea.style.height = "";

		// 2. 生成用户消息对象
		let userMessageId = uuidv4();
		let userMessage = {
			id: userMessageId,
			parentId: messages.length !== 0 ? messages.at(-1).id : null,
			childrenIds: [],
			role: "user",
			content: userPrompt,
			files: files
		};

		// 3. 更新内存历史
		if (messages.length !== 0) {
			history.messages[messages.at(-1).id].childrenIds.push(userMessageId);
		}
		history.messages[userMessageId] = userMessage;
		history.currentId = userMessageId;

		await tick();

		// 4. UI 滚动
		prompt = "";
		setTimeout(() => {
			window.scrollTo({
				top: document.body.scrollHeight,
				behavior: "smooth"
			});
		}, 50);

		// 5. 发送请求 (conversationId 已在 loadChat 中设置)
		await sendPromptOllama(
			userPrompt,
			userMessageId,
			conversationId,
			files[0]?.id
		);
	};
	// const sendPromptOllama = async (
	// 	// model: any,
	// 	userPrompt: any,
	// 	parentId: any,
	// 	_chatId: any,
	// 	fileId?: string
	// ) => {
	// 	isStreaming = true;
	// 	// 每次发送新消息前，重置任务ID，防止停止按钮使用旧的ID或提前激活
	// 	stopChatTaskId = "";
	// 	let responseMessageId = uuidv4();
	// 	let responseMessage: any = {
	// 		parentId: parentId,
	// 		id: responseMessageId,
	// 		childrenIds: [],
	// 		role: "assistant",
	// 		content: ""
	// 	};

	// 	history.messages[responseMessageId] = responseMessage;
	// 	history.currentId = responseMessageId;
	// 	if (parentId !== null) {
	// 		history.messages[parentId].childrenIds = [
	// 			...history.messages[parentId].childrenIds,
	// 			responseMessageId
	// 		];
	// 	}

	// 	await tick();
	// 	window.scrollTo({ top: document.body.scrollHeight });
	// 	const response: any = await getChat({
	// 		message: userPrompt,
	// 		conversationId: conversationId,
	// 		fileId: fileId || ""
	// 	});
	// 	while (true) {
	// 		// let { value, done } = await reader.read();
	// 		if (stopResponseFlag || _chatId !== $chatId) {
	// 			responseMessage.done = true;
	// 			messages = messages;
	// 			break;
	// 		}
	// 		try {
	// 			let lines = response?.data.split("\n");
	// 			// debugger;
	// 			for (const line of lines) {
	// 				if (line) {
	// 					if (line.startsWith("event:")) {
	// 						continue;
	// 					}
	// 					const jsonString = line.replace("data: ", ""); // 去除前缀
	// 					// 关键过滤逻辑：跳过 event: 开头的行
	// 					// debugger;
	// 					if (!jsonString) continue; // 跳过空行
	// 					let data = JSON.parse(jsonString);
	// 					if (data.event === "workflow_started") {
	// 						console.log("data-id", data);

	// 						stopChatTaskId = data.task_id;
	// 						console.log("stopChatTaskId-id-page", stopChatTaskId);
	// 						conversationId = data.conversation_id;
	// 						messages.at(-1).done = false;
	// 					}
	// 					if (data.event === "error") {
	// 						// if (!responseMessage.content) {
	// 						responseMessage.error = true;
	// 						responseMessage.done = true;
	// 						responseMessage.content =
	// 							"您好，没有您想要的答案呢！可以换个问题问一问呢！";
	// 						messages = messages;
	// 						// }
	// 					}
	// 					if (responseMessage.content == "" && !data.answer) {
	// 						continue;
	// 					} else {
	// 						let resultString: any;
	// 						// switch (data.event) {
	// 						// 	case "message":
	// 						// 		// 处理消息事件
	// 						// 		responseMessage.content += data.answer;
	// 						// 		break;
	// 						// 	case "node_finished":
	// 						// 		// 处理节点完成事件
	// 						// 		break;
	// 						// 	case "workflow_finished":
	// 						// 		// 处理工作流完成事件
	// 						// 		// isStreaming = false;
	// 						// 		isStreaming = false;
	// 						// 		responseMessage.done = true;
	// 						// 		break;
	// 						// 	// ... 其他事件处理
	// 						// }
	// 						if (data.event === "message") {
	// 							// debugger;
	// 							const PRINT_SPEED = 50;
	// 							// 自动滚动控制
	// 							let autoScroll = true;
	// 							// 1. 先将 Markdown 解析为完整的 HTML
	// 							let fullHtml = data.answer;
	// 							// 2. 标签感知打字机逻辑
	// 							let i = 0;
	// 							while (i < fullHtml.length) {
	// 								if (stopResponseFlag) break;
	// 								if (fullHtml[i] === "<") {
	// 									// 如果遇到标签，找到标签结束位置，一次性追加整个标签
	// 									const endTagIndex = fullHtml.indexOf(">", i);
	// 									if (endTagIndex !== -1) {
	// 										responseMessage.content += fullHtml.slice(
	// 											i,
	// 											endTagIndex + 1
	// 										);
	// 										i = endTagIndex + 1;
	// 										// 标签追加不触发延迟，直接进入下一轮循环检查
	// 										continue;
	// 									}
	// 								}

	// 								// 如果是普通文字，逐字符追加并触发延迟
	// 								responseMessage.content += fullHtml[i];
	// 								i++;

	// 								messages = messages;
	// 								await tick();

	// 								if (autoScroll) {
	// 									window.scrollTo({
	// 										top: document.body.scrollHeight,
	// 										behavior: "smooth"
	// 									});
	// 								}

	// 								await new Promise(resolve =>
	// 									setTimeout(resolve, PRINT_SPEED)
	// 								);
	// 							}
	// 							if (!responseMessage.content) {
	// 								responseMessage.error = true;
	// 								responseMessage.done = true;
	// 								responseMessage.content =
	// 									"您好，没有您想要的答案呢！可以换个问题问一问呢！";
	// 								messages = messages;
	// 							}

	// 							window.requestAnimationFrame(() => {
	// 								window.scrollTo({
	// 									top: document.body.scrollHeight,
	// 									behavior: "smooth"
	// 								});
	// 							});
	// 							// if (!isRendering) {
	// 							// 	isRendering = true;
	// 							// 	renderBuffer();
	// 							// }
	// 						} else if (data.event === "workflow_finished") {
	// 							stopResponseFlag = true;
	// 							responseMessage.done = true;
	// 							// break;
	// 						}
	// 						if ($settings.responseAutoCopy) {
	// 							copyToClipboard(responseMessage.content);
	// 						}
	// 					}
	// 				}
	// 			}
	// 		} catch (error: any) {
	// 			if ("detail" in error) {
	// 				toast.error(error.detail);
	// 			}
	// 			break;
	// 		}
	// 		if (autoScroll) {
	// 			window.scrollTo({ top: document.body.scrollHeight });
	// 		}

	// 		await $db.updateChatById(_chatId, {
	// 			title: title === "" ? "新会话" : title,
	// 			models: selectedModels,
	// 			options: {
	// 				seed: $settings.seed ?? undefined,
	// 				temperature: $settings.temperature ?? undefined,
	// 				repeat_penalty: $settings.repeat_penalty ?? undefined,
	// 				top_k: $settings.top_k ?? undefined,
	// 				top_p: $settings.top_p ?? undefined,
	// 				num_ctx: $settings.num_ctx ?? undefined,
	// 				...($settings.options ?? {})
	// 			},
	// 			messages: messages,
	// 			history: history
	// 		});
	// 	}

	// 	stopResponseFlag = false;
	// 	await tick();
	// 	if (autoScroll) {
	// 		window.scrollTo({ top: document.body.scrollHeight });
	// 	}

	// 	if (messages.length == 2 && messages.at(1).content !== "") {
	// 		window.history.replaceState(history.state, "", `/c/${_chatId}`);
	// 		// await generateChatTitle(_chatId, userPrompt);
	// 	}
	// };

	// const submitPrompt = async (userPrompt: any, files: any) => {
	// 	const _chatId = JSON.parse(JSON.stringify($chatId));
	// 	// await generateChatTitle(_chatId, userPrompt);
	// 	// if (selectedModels.includes("")) {
	// 	// 	toast.error("Model not selected");
	// 	// } else if (messages.length != 0 && messages.at(-1).done != true) {
	// 	// } else {
	// 	const textarea: any = document.getElementById("chat-textarea");
	// 	textarea.style.height = "";
	// 	let userMessageId = uuidv4();
	// 	let userMessage = {
	// 		id: userMessageId,
	// 		parentId: messages.length !== 0 ? messages.at(-1).id : null,
	// 		childrenIds: [],
	// 		role: "user",
	// 		content: userPrompt,
	// 		files: files
	// 	};
	// 	if (messages.length !== 0) {
	// 		history.messages[messages.at(-1).id].childrenIds.push(userMessageId);
	// 	}

	// 	history.messages[userMessageId] = userMessage;
	// 	history.currentId = userMessageId;
	// 	await tick();
	// 	if (messages.length == 1) {
	// 		await $db.createNewChat({
	// 			id: _chatId,
	// 			title: "新会话",
	// 			// models: selectedModels,
	// 			system: $settings.system ?? undefined,
	// 			options: {
	// 				seed: $settings.seed ?? undefined,
	// 				temperature: $settings.temperature ?? undefined,
	// 				repeat_penalty: $settings.repeat_penalty ?? undefined,
	// 				top_k: $settings.top_k ?? undefined,
	// 				top_p: $settings.top_p ?? undefined,
	// 				num_ctx: $settings.num_ctx ?? undefined,
	// 				...($settings.options ?? {})
	// 			},
	// 			messages: messages,
	// 			history: history
	// 		});
	// 	}

	// 	prompt = "";

	// 	setTimeout(() => {
	// 		window.scrollTo({
	// 			top: document.body.scrollHeight,
	// 			behavior: "smooth"
	// 		});
	// 	}, 50);

	// 	await sendPrompt(userPrompt, userMessageId, _chatId, files[0]?.id);
	// };
	// };

	const stopResponse = async () => {
		const response: any = await stopChat({ taskId: stopChatTaskId });
		stopChatTaskId = "";
		if ((response.code = "000000")) {
			stopChatTaskId = "";
		}
		messages.at(-1).done = true;
		stopResponseFlag = true;
	};

	const regenerateResponse = async () => {
		const _chatId = JSON.parse(JSON.stringify($chatId));
		if (messages.length != 0 && messages.at(-1).done == true) {
			messages.splice(messages.length - 1, 1);
			messages = messages;

			let userMessage = messages.at(-1);
			let userPrompt = userMessage.content;
			console.log("userPrompt", userPrompt);
			console.log("userMessage", userMessage);
			await sendPrompt(userPrompt, userMessage.id, _chatId);
		}
	};
	const setChatTitle = async (_chatId: any, _title: any) => {
		// await $db.updateChatById(_chatId, { title: _title });
		if (_chatId === $chatId) {
			title = _title;
		}
	};
	const generateChatTitle = async (_chatId: any, userPrompt: any) => {
		if ($settings.titleAutoGenerate ?? true) {
			// 			const res = await fetch(`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/generate`, {
			// 				method: 'POST',
			// 				headers: {
			// 					'Content-Type': 'text/event-stream',
			// 					...($settings.authHeader && { Authorization: $settings.authHeader })
			// 				},
			// 				body: JSON.stringify({
			// 					model: selectedModels[0],
			// 					prompt: `Generate a brief 3-5 word title for this question, excluding the term 'title.' Then, please reply with only the title: ${userPrompt}`,
			// 					stream: false
			// 				})
			// 			})
			// 				.then(async (res) => {
			// 					if (!res.ok) throw await res.json();
			// 					return res.json();
			// 				})
			// 				.catch((error) => {
			// 					if ('detail' in error) {
			// 						toast.error(error.detail);
			// 					}
			// 					return null;
			// 				});
			await setChatTitle(_chatId, userPrompt === "" ? "新会话" : userPrompt);
			// 	if (userPrompt) {
			// 		await setChatTitle(_chatId, userPrompt=== '' ? '新会话' : userPrompt);
			// 	}
			// } else {
			// 	await setChatTitle(_chatId, `${userPrompt}`);
			// }
		}
	};
</script>
<style>
	/* .set-width {
		width: 50%;
	} */
	.bgcolor {
		background-color: #f4f6fc;
	}
	.set-new-margin {
		margin-bottom: 12rem;
		background-color: #f4f6fc;
	}
	.sidebar-left {
		width: 260px;
		background-color: #f4f6fc;
		/* background-color: #ccc; */
	}
	.content-right {
		width: var(--main-width);
		/* background-color: #000; */
		background-color: #f4f6fc;
		/* padding: 0 6%; */
	}
	.hidden-width {
		width: 0%;
	}
	.show-width-all {
		width: 100%;
	}
	:root {
		--main-width: calc(88% - 260px);
	}
	.nav-bar {
		width: var(--main-width);
		/* width: 74%; */
	}
	.set-margin {
		margin-bottom: 12rem !important;
		margin-top: 44px;
	}
	.set-bg {
		background-color: #f4f6fc;
		line-height: 2.5rem;
	}
</style>
<svelte:window
	on:scroll={e => {
		autoScroll =
			window.innerHeight + window.scrollY >= document.body.offsetHeight - 40;
	}}
/>

{#if loaded}
	{#if isMobile}
		<div class="w-full max-w-[{windowWidth}] pb-[env(safe-area-inset-bottom)]">
			<div class=" flex h-full undefined flex-col">
				<div
					class="w-full bg-white nav-mobile fixed mt-0 z-1000 shrink-0 flex items-center px-3 h-[44px] border-b-[0.5px] border-b-gray-200"
				>
					<div
						class="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
					>
						<button
							class=" cursor-pointer p-1 flex dark:hover:bg-gray-700 rounded-lg transition"
							on:click={async () => {
								show = !show;
							}}
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-gray-700"
								data-icon="Menu01"
								aria-hidden="true"
								><g id="menu-01"
									><path
										id="Icon"
										d="M2 8H14M2 4H14M2 12H14"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									/></g
								></svg
							></button
						>
					</div>
					<!-- <div bind:showLeft></div>
				<Sidebar bind:showLeft /> -->
					<div class="grow flex justify-center items-center px-3">
						<div class="flex self-center s-CQzCIXq4wXlR">
							<div class="self-center mr-3.5 s-CQzCIXq4wXlR">
								<img
									src="/favicon.png"
									alt="favicon"
									class="w-5 rounded-full s-CQzCIXq4wXlR"
								/>
							</div>
							<div class="self-center font-medium text-sm s-CQzCIXq4wXlR">
								小C+
							</div>
						</div>
					</div>
					<div
						class="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg"
					>
						<button
							class=" cursor-pointer p-1 flex dark:hover:bg-gray-700 rounded-lg transition"
							on:click={async () => {
								goto("/");
								await chatId.set(uuidv4());
							}}
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
								class="w-4 h-4 text-gray-700"
								data-icon="Edit05"
								aria-hidden="true"
								><g id="edit-05" clip-path="url(#clip0_17249_52683)"
									><path
										id="Icon"
										d="M7.33325 2.66617H4.53325C3.41315 2.66617 2.85309 2.66617 2.42527 2.88415C2.04895 3.0759 1.74299 3.38186 1.55124 3.75819C1.33325 4.18601 1.33325 4.74606 1.33325 5.86617V11.4662C1.33325 12.5863 1.33325 13.1463 1.55124 13.5741C1.74299 13.9505 2.04895 14.2564 2.42527 14.4482C2.85309 14.6662 3.41315 14.6662 4.53325 14.6662H10.1333C11.2534 14.6662 11.8134 14.6662 12.2412 14.4482C12.6176 14.2564 12.9235 13.9505 13.1153 13.5741C13.3333 13.1463 13.3333 12.5863 13.3333 11.4662V8.66617M5.33323 10.6662H6.4496C6.77572 10.6662 6.93878 10.6662 7.09223 10.6293C7.22828 10.5967 7.35834 10.5428 7.47763 10.4697C7.61219 10.3872 7.72749 10.2719 7.95809 10.0413L14.3333 3.66617C14.8855 3.11388 14.8855 2.21845 14.3333 1.66617C13.781 1.11388 12.8855 1.11388 12.3333 1.66617L5.95808 8.04133C5.72747 8.27193 5.61217 8.38723 5.52971 8.52179C5.45661 8.64108 5.40274 8.77114 5.37007 8.90719C5.33323 9.06064 5.33323 9.2237 5.33323 9.54982V10.6662Z"
										stroke="currentColor"
										stroke-width="1.5"
										stroke-linecap="round"
										stroke-linejoin="round"
									/></g
								><defs
									><clipPath id="clip0_17249_52683"
										><rect width="16" height="16" fill="white" /></clipPath
									></defs
								></svg
							></button
						>
					</div>
				</div>
				<div
					class="set-new-margin {isMobile
						? ''
						: 'mt-10'} mb-32 w-full h-full flex flex-col {messages.length > 0
						? 'set-margin'
						: ''}"
				>
					<Messages
						bind:history
						bind:messages
						bind:autoScroll
						bind:copyContent
						{isMobile}
						{sendPrompt}
						{regenerateResponse}
					/>
					<MessageInput
						bind:prompt
						bind:autoScroll
						{isMobile}
						{messages}
						{submitPrompt}
						{stopResponse}
						{stopChatTaskId}
					/>
				</div>
				<!-- <div class="w-full h-[54px] fixd bottom-0"> -->

				<!-- </div> -->

				<div
					class="fixed set-bg bottom-0 w-full text-sm text-center text-[#c0c0c0]"
				>
					<p>内容由AI生成，仅供参考</p>
				</div>
			</div>
			<Modal bind:show>
				<Sidebar bind:show bind:conversationId {isMobile} />
			</Modal>
		</div>
	{:else}
		<div class="min-h-screen w-full flex justify-center bgcolor">
			<div class="sidebar-left"><Sidebar bind:show {isMobile} /></div>
			<div class="content-right">
				<div class="nav-bar content-right fixed py-2.5 top-0">
					<Navbar {title} />
				</div>
				<!-- <div class=" mx-auto w-full md:px-0 mt-10">
		<ModelSelector bind:selectedModels disabled={messages.length > 0} />
	</div> -->

				<div
					class="set-new-margin {isMobile
						? ''
						: 'mt-10'} mb-32 w-full flex flex-col {history ? 'set-margin' : ''}"
				>
					<Messages
						bind:history
						bind:messages
						bind:autoScroll
						bind:copyContent
						{isMobile}
						{sendPrompt}
						{regenerateResponse}
					/>
				</div>
				<MessageInput
					bind:prompt
					bind:autoScroll
					{isMobile}
					{messages}
					{submitPrompt}
					{stopResponse}
					{stopChatTaskId}
				/>
				<div
					class="fixed content-right set-bg bottom-0 w-full text-sm text-center text-[#c0c0c0]"
				>
					<p>内容由AI生成，仅供参考</p>
				</div>
			</div>
		</div>
	{/if}
{/if}
