<script lang="ts">
	import { v4 as uuidv4 } from "uuid";
	import toast from "svelte-french-toast";
	import { onMount, tick } from "svelte";
	import { OLLAMA_API_BASE_URL } from "$lib/constants";

	import { convertMessagesToHistory, splitStream } from "$lib/utils";
	import { goto } from "$app/navigation";
	import { models, settings, db, chats, chatId } from "$lib/stores";
	import Sidebar from "$lib/components/layout/Sidebar.svelte";
	import MessageInput from "$lib/components/chat/MessageInput.svelte";
	import Messages from "$lib/components/chat/Messages.svelte";
	import ModelSelector from "$lib/components/chat/ModelSelector.svelte";
	import Navbar from "$lib/components/layout/Navbar.svelte";
	import { page } from "$app/stores";

	let loaded = false;
	let stopResponseFlag = false;
	let autoScroll = true;
	let copyContent: any;
	// let chatId = $page.params.id;
	let show: boolean = true; // $settings.showSidebar;
	let title = "";
	let prompt = "";
	console.log("show", show);

	let messages: any = [];
	let history: any = {
		messages: {},
		currentId: null
	};
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
			console.log("chat--1", chat);

			await tick();
			if (chat) {
				loaded = true;
			} else {
				await goto("/");
			}
		})();
	}

	//////////////////////////
	// Web functions
	//////////////////////////

	const loadChat = async () => {
		await chatId.set($page.params.id);
		const chat = await $db.getChatById($chatId);

		if (chat) {
			console.log("chat-loadChat", chat);

			history =
				(chat?.history ?? undefined) !== undefined
					? chat.history
					: convertMessagesToHistory(chat.messages);
			title = chat.title;

			let _settings = JSON.parse(localStorage.getItem("settings") ?? "{}");
			await settings.set({
				..._settings,
				system: chat.system ?? _settings.system,
				options: chat.options ?? _settings.options
			});
			autoScroll = true;

			await tick();
			if (messages.length > 0) {
				history.messages[messages.at(-1).id].done = true;
			}
			await tick();

			return chat;
		} else {
			return null;
		}
	};

	const copyToClipboard = (text: string, usercopy?: any) => {
		console.log("copyToClipboard+page", text, usercopy);

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

	//////////////////////////
	// Ollama functions
	//////////////////////////

	const sendPrompt = async (userPrompt: any, parentId: any, _chatId: any) => {
		// await Promise.all(
		// 	// selectedModels.map(async model => {
		// 		// console.log(model);

		// 	// })
		// )
		await sendPromptOllama(userPrompt, parentId, _chatId);
		await chats.set(await $db.getChats());
	};

	const sendPromptOllama = async (
		// model: any,
		userPrompt: any,
		parentId: any,
		_chatId: any
	) => {
		let responseMessageId = uuidv4();
		let responseMessage: any = {
			parentId: parentId,
			id: responseMessageId,
			childrenIds: [],
			role: "assistant",
			content: ""
		};

		history.messages[responseMessageId] = responseMessage;
		history.currentId = responseMessageId;
		if (parentId !== null) {
			history.messages[parentId].childrenIds = [
				...history.messages[parentId].childrenIds,
				responseMessageId
			];
		}

		await tick();
		window.scrollTo({ top: document.body.scrollHeight });
		console.log("responseMessage", responseMessage);
		const res: any = await fetch(
			`http://llm.foundersc-inc.com/v1/chat-messages`,
			{
				method: "POST",
				headers: {
					// "Content-Type": "text/event-stream",
					// "X-Token": getToken() || "",
					"Content-Type": "application/json",
					Accept: "text/event-stream",
					Authorization: "Bearer app-Pu6zAG33K8oesH4CjlY0WTAn"
				},
				body: JSON.stringify({
					inputs: {},
					// query: "你好，你是谁？",
					query: userPrompt,

					response_mode: "streaming",
					user: "abc-123"
				})
			}
		).catch(err => {
			// console.log(err);
			return null;
		});
		if (!res || !res.ok) {
			// console.error("Network response was not ok");
			return null;
		}
		// if (res && res.ok) {
		const reader: any = res.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(splitStream("\n"))
			.getReader();
		while (true) {
			const { value, done } = await reader.read();
			if (done || stopResponseFlag || _chatId !== $chatId) {
				responseMessage.done = true;
				messages = messages;
				break;
			}
			try {
				let lines = value.split("\n");
				for (const line of lines) {
					if (line) {
						// event:ping 非JSON
						if (line.startsWith("event:")) {
							continue;
						}
						const jsonString = line.replace("data: ", ""); // 去除前缀
						if (!jsonString) continue; // 跳过空行
						let data = JSON.parse(jsonString);
						if (responseMessage.content == "" && !data.answer) {
							continue;
						} else {
							let resultString: any;
							if (data.event === "message") {
								console.log("message", data);
								responseMessage.content += data.answer;
								// resultString += data.answer;
								messages = messages;
								// const PRINT_SPEED = 50;
								// 自动滚动控制
								// let autoScroll = true;
								// const chars = data.answer.split("");
								// for (const char of chars) {
								// 	responseMessage.content += char;
								// 	// console.log("char", char);
								// 	messages = messages;
								// 	// ✅ 关键：每次更新都重新渲染完整 Markdown
								// 	await tick(); // 等待 DOM 更新

								// 	// 自动滚动到底部
								// 	if (autoScroll) {
								// 		window.scrollTo({
								// 			top: document.body.scrollHeight,
								// 			behavior: "smooth"
								// 		});
								// 	}
								// 	// 控制打印速度
								// 	await new Promise(resolve =>
								// 		setTimeout(resolve, PRINT_SPEED)
								// 	);
								// 	//
								// }
								window.requestAnimationFrame(() => {
									window.scrollTo({
										top: document.body.scrollHeight,
										behavior: "smooth"
									});
								});
							}
							if ($settings.responseAutoCopy) {
								copyToClipboard(responseMessage.content);
							}
						}
						// if (data.done == false) {
						// 	if (
						// 		responseMessage.content == "" &&
						// 		data.message.content == "\n"
						// 	) {
						// 		continue;
						// 	} else {
						// 		responseMessage.content += data.message.content;
						// 		messages = messages;
						// 	}
						// } else {
						// 	responseMessage.done = true;
						// 	responseMessage.context = data.context ?? null;
						// 	responseMessage.info = {
						// 		total_duration: data.total_duration,
						// 		load_duration: data.load_duration,
						// 		sample_count: data.sample_count,
						// 		sample_duration: data.sample_duration,
						// 		prompt_eval_count: data.prompt_eval_count,
						// 		prompt_eval_duration: data.prompt_eval_duration,
						// 		eval_count: data.eval_count,
						// 		eval_duration: data.eval_duration
						// 	};
						// 	messages = messages;

						// 	// if ($settings.notificationEnabled && !document.hasFocus()) {
						// 	// 	const notification = new Notification(`Ollama - ${model}`, {
						// 	// 		body: responseMessage.content,
						// 	// 		icon: "/favicon.png"
						// 	// 	});
						// 	// }

						// 	if ($settings.responseAutoCopy) {
						// 		copyToClipboard(responseMessage.content);
						// 	}
						// }
					}
				}
			} catch (error: any) {
				console.log(error);
				if ("detail" in error) {
					toast.error(error.detail);
				}
				break;
			}

			if (autoScroll) {
				window.scrollTo({ top: document.body.scrollHeight });
			}

			await $db.updateChatById(_chatId, {
				title: title === "" ? "新会话" : title,
				// models: selectedModels,
				system: $settings.system ?? undefined,
				options: {
					seed: $settings.seed ?? undefined,
					temperature: $settings.temperature ?? undefined,
					repeat_penalty: $settings.repeat_penalty ?? undefined,
					top_k: $settings.top_k ?? undefined,
					top_p: $settings.top_p ?? undefined,
					num_ctx: $settings.num_ctx ?? undefined,
					...($settings.options ?? {})
				},
				messages: messages,
				history: history
			});
		}
		// } else {
		// 	if (res !== null) {
		// 		const error = await res.json();
		// 		console.log(error);
		// 		if ("detail" in error) {
		// 			toast.error(error.detail);
		// 			responseMessage.content = error.detail;
		// 		} else {
		// 			toast.error(error.error);
		// 			responseMessage.content = error.error;
		// 		}
		// 	} else {
		// 		toast.error(`Uh-oh! There was an issue connecting to Ollama.`);
		// 		responseMessage.content = `Uh-oh! There was an issue connecting to Ollama.`;
		// 	}

		// 	responseMessage.error = true;
		// 	responseMessage.content = `Uh-oh! There was an issue connecting to Ollama.`;
		// 	responseMessage.done = true;
		// 	messages = messages;
		// }

		stopResponseFlag = false;
		await tick();
		if (autoScroll) {
			window.scrollTo({ top: document.body.scrollHeight });
		}

		if (messages.length == 2 && messages.at(1).content !== "") {
			window.history.replaceState(history.state, "", `/c/${_chatId}`);
			await generateChatTitle(_chatId, userPrompt);
		}
	};

	const submitPrompt = async (userPrompt: any) => {
		console.log("userPrompt--pageID", userPrompt);

		const _chatId = JSON.parse(JSON.stringify($chatId));
		console.log("submitPrompt", _chatId);
		// await generateChatTitle(_chatId, userPrompt);
		// if (selectedModels.includes("")) {
		// 	toast.error("Model not selected");
		// } else if (messages.length != 0 && messages.at(-1).done != true) {
		// 	console.log("wait");
		// } else {
		const textarea: any = document.getElementById("chat-textarea");
		textarea.style.height = "";

		let userMessageId = uuidv4();
		let userMessage = {
			id: userMessageId,
			parentId: messages.length !== 0 ? messages.at(-1).id : null,
			childrenIds: [],
			role: "user",
			content: userPrompt
		};

		if (messages.length !== 0) {
			history.messages[messages.at(-1).id].childrenIds.push(userMessageId);
		}

		history.messages[userMessageId] = userMessage;
		history.currentId = userMessageId;

		await tick();
		if (messages.length == 1) {
			await $db.createNewChat({
				id: _chatId,
				title: "新会话",
				// models: selectedModels,
				system: $settings.system ?? undefined,
				options: {
					seed: $settings.seed ?? undefined,
					temperature: $settings.temperature ?? undefined,
					repeat_penalty: $settings.repeat_penalty ?? undefined,
					top_k: $settings.top_k ?? undefined,
					top_p: $settings.top_p ?? undefined,
					num_ctx: $settings.num_ctx ?? undefined,
					...($settings.options ?? {})
				},
				messages: messages,
				history: history
			});
		}

		prompt = "";

		setTimeout(() => {
			window.scrollTo({
				top: document.body.scrollHeight,
				behavior: "smooth"
			});
		}, 50);

		await sendPrompt(userPrompt, userMessageId, _chatId);
	};
	// };

	const stopResponse = () => {
		stopResponseFlag = true;
		console.log("stopResponse");
	};

	const regenerateResponse = async () => {
		const _chatId = JSON.parse(JSON.stringify($chatId));
		console.log("regenerateResponse", _chatId);

		if (messages.length != 0 && messages.at(-1).done == true) {
			messages.splice(messages.length - 1, 1);
			messages = messages;

			let userMessage = messages.at(-1);
			let userPrompt = userMessage.content;

			await sendPrompt(userPrompt, userMessage.id, _chatId);
		}
	};
	const setChatTitle = async (_chatId: any, _title: any) => {
		console.log("setChatTitle", _chatId, _title);

		await $db.updateChatById(_chatId, { title: _title });
		if (_chatId === $chatId) {
			title = _title;
		}
	};
	const generateChatTitle = async (_chatId: any, userPrompt: any) => {
		if ($settings.titleAutoGenerate ?? true) {
			console.log("generateChatTitle-创建标题", userPrompt);

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
			// 					console.log(error);
			// 					return null;
			// 				});
			// console.log('res',res);
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
		margin-bottom: 4.5rem;
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
		padding: 0 6%;
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
		width: 74%;
	}
</style>
<svelte:window
	on:scroll={e => {
		autoScroll =
			window.innerHeight + window.scrollY >= document.body.offsetHeight - 40;
	}}
/>

{#if loaded}
	<!-- <Navbar {title} shareEnabled={messages.length > 0} />
	<div class="min-h-screen w-full flex justify-center bgcolor">
		<div class=" py-2.5 flex flex-col justify-between w-full set-width">
			<div class="max-w-2xl mx-auto w-full px-3 md:px-0 mt-10">
				<ModelSelector bind:selectedModels disabled={messages.length > 0} />
				{selectedModels}
			</div>

			<div class="set-new-margin h-full mt-10 mb-32 w-full flex flex-col">
				<Messages
					bind:history
					bind:messages
					bind:autoScroll
					bind:copyContent
					{sendPrompt}
					{regenerateResponse}
				/>
			</div>
		</div>

		<MessageInput
			bind:prompt
			bind:autoScroll
			{messages}
			{submitPrompt}
			{stopResponse}
		/>
	</div> -->
	<div class="min-h-screen w-full flex justify-center bgcolor">
		<div class={show ? "sidebar-left" : "hidden-width"}>
			<Sidebar bind:show />
		</div>

		<div class=" {show ? 'content-right' : 'show-width-all'}">
			<div class="nav-bar fixed py-2.5 top-0"><Navbar {title} /></div>
			<!-- <div class="max-w-2xl mx-auto w-full px-3 md:px-0 mt-10">
				<ModelSelector bind:selectedModels disabled={messages.length > 0} />
			</div> -->

			<div class="set-new-margin mt-10 mb-32 w-full flex flex-col">
				<Messages
					bind:history
					bind:messages
					bind:autoScroll
					bind:copyContent
					{sendPrompt}
					{regenerateResponse}
				/>
			</div>
			<MessageInput
				bind:prompt
				bind:autoScroll
				{messages}
				{submitPrompt}
				{stopResponse}
			/>
		</div>
	</div>
{/if}
