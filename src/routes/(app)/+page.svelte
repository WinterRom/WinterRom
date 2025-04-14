<script lang="ts">
	import { v4 as uuidv4 } from "uuid";
	import toast from "svelte-french-toast";
	import { getInfo } from "$lib/api/user";
	import { getChat, getChatSSE } from "$lib/api/chat";
	import { OLLAMA_API_BASE_URL } from "$lib/constants";
	import { onMount, tick, onDestroy } from "svelte";
	import { splitStream } from "$lib/utils";
	import { getToken, setToken, removeToken } from "$lib/utils/cookie";
	import { settings, db, chats, chatId } from "$lib/stores";
	import Sidebar from "$lib/components/layout/Sidebar.svelte";
	import MessageInput from "$lib/components/chat/MessageInput.svelte";
	import Messages from "$lib/components/chat/Messages.svelte";
	import ModelSelector from "$lib/components/chat/ModelSelector.svelte";
	import Navbar from "$lib/components/layout/Navbar.svelte";

	// import { page } from "$app/stores";
	const redirectUrl: any = import.meta.env.VITE_API_REDIRECT_URL;
	const apiUrl: any = import.meta.env.VITE_API_BASE;
	let stopResponseFlag = false;
	let autoScroll = true;
	let show: boolean = true;
	let selectedModels = [""];
	let abortController = new AbortController();
	let title = "";
	let prompt = "";
	let copyContent: any;
	let messages: any = [];
	let history: any = {
		messages: {},
		currentId: null
	};
	let content = "";
	let isLoading = false;
	let error = null;
	$: if (copyContent) {
		prompt = copyContent;
		tick();
	}
	$: if (history.currentId !== null) {
		let _messages: any = [];

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
	let windowWidth = 0;

	$: isMobile = windowWidth <= 768;

	function handleResize() {
		windowWidth = window.innerWidth;
		console.log("isMobile", isMobile);
	}

	// console.log('show--', show)
	onMount(async () => {
		await chatId.set(uuidv4());

		chatId.subscribe(async () => {
			await initNewChat();
		});
		window.addEventListener("resize", handleResize);
		handleResize(); // 初始化尺寸
	});
	onDestroy(() => {
		window.removeEventListener("resize", handleResize);
	});

	//////////////////////////
	// Web functions
	//////////////////////////

	const initNewChat = async () => {
		autoScroll = true;

		title = "";
		messages = [];
		history = {
			messages: {},
			currentId: null
		};

		let _settings = JSON.parse(localStorage.getItem("settings") ?? "{}");

		settings.set({
			..._settings
		});
	};

	const copyToClipboard = (text: string, usercopy?: string) => {
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
			function (err) {
				console.log();
			}
		);
	};

	//////////////////////////
	// Ollama functions
	//////////////////////////

	const sendPrompt = async (userPrompt: any, parentId: any, _chatId: any) => {
		await Promise.all(
			selectedModels.map(async model => {
				await sendPromptOllama(model, userPrompt, parentId, _chatId);
			})
		);

		await chats.set(await $db.getChats());
	};

	const sendPromptOllama = async (
		model: any,
		userPrompt: any,
		parentId: any,
		_chatId: any
	) => {
		console.log("sendPromptOllama");
		let responseMessageId = uuidv4();
		let responseMessage: any = {
			parentId: parentId,
			id: responseMessageId,
			childrenIds: [],
			role: "assistant",
			content: "",
			model: model,
			isShow: false
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

				// JSON.stringify({ message: userPrompt })
				// body: JSON.stringify({
				// 	model: model,
				// 	messages: messages.map((message: any) => ({
				// 		role: message.role,
				// 		content: message.content
				// 	})),
				// 	options: {
				// 		seed: $settings.seed ?? undefined,
				// 		temperature: $settings.temperature ?? undefined,
				// 		repeat_penalty: $settings.repeat_penalty ?? undefined,
				// 		top_k: $settings.top_k ?? undefined,
				// 		top_p: $settings.top_p ?? undefined,
				// 		num_ctx: $settings.num_ctx ?? undefined,
				// 		...($settings.options ?? {})
				// 	},
				// 	format: $settings.requestFormat ?? undefined
				// })
			}
		).catch(err => {
			// console.log(err);
			return null;
		});
		if (!res || !res.ok) {
			// console.error("Network response was not ok");
			return null;
		}

		const reader = res.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(splitStream("\n"))
			.getReader();

		// const reader = res.body
		// 	.pipeThrough(new TextDecoderStream())
		// 	.pipeThrough(splitStream("\n"))
		// 	.getReader();
		while (true) {
			let { value, done } = await reader.read();
			if (done || stopResponseFlag || _chatId !== $chatId) {
				responseMessage.done = true;
				messages = messages;
				break;
			}
			try {
				let lines = value.split("\n");

				for (const line of lines) {
					if (line) {
						if (line.startsWith("event:")) {
							continue;
						}
						// console.log("line", line);
						const jsonString = line.replace("data: ", ""); // 去除前缀
						// 关键过滤逻辑：跳过 event: 开头的行

						// console.log("jsonString", JSON.parse(jsonString));
						// console.log("jsonString", jsonString);
						if (!jsonString) continue; // 跳过空行
						let data = JSON.parse(jsonString);
						console.log("data", data);
						console.log("data.event", data.event);
						if (data.event === "error") {
							// if (!responseMessage.content) {
							console.log(111);
							responseMessage.error = true;
							responseMessage.done = true;
							responseMessage.content =
								"您好，没有您想要的答案呢！可以换个问题问一问呢！";
							messages = messages;
							// }
						}
						if (responseMessage.content == "" && !data.answer) {
							continue;
						} else {
							let resultString: any;

							if (data.event === "message") {
								responseMessage.content += data.answer;
								// resultString += data.answer;
								messages = messages;
								if (!responseMessage.content) {
									responseMessage.error = true;
									responseMessage.done = true;
									responseMessage.content =
										"您好，没有您想要的答案呢！可以换个问题问一问呢！";
									messages = messages;
								}
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
								// if (!isRendering) {
								// 	isRendering = true;
								// 	renderBuffer();
								// }
							}
							if ($settings.responseAutoCopy) {
								copyToClipboard(responseMessage.content);
							}
						}
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
				models: selectedModels,
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
	// const renderBuffer = async(content:any) =>{
	// 	 // 打印速度（字符/毫秒）
	// 	 const PRINT_SPEED = 50;

	//   // 自动滚动控制
	//   let autoScroll = true;
	//   const chars = content.split("");
	//   for (const char of chars) {
	// 	responseMessage.content  += char;

	//       // ✅ 关键：每次更新都重新渲染完整 Markdown
	//       await tick(); // 等待 DOM 更新

	//       // 自动滚动到底部
	//       if (autoScroll) {
	//         window.scrollTo({
	//           top: document.body.scrollHeight,
	//           behavior: "smooth"
	//         });
	//       }

	//       // 控制打印速度
	//       await new Promise(resolve =>
	//         setTimeout(resolve, PRINT_SPEED)
	//       );
	//     }

	// }
	const submitPrompt = async (userPrompt: any) => {
		console.log("userPrompt-停止以后", userPrompt);
		if (!userPrompt) {
			return;
		}
		const _chatId: any = JSON.parse(JSON.stringify($chatId));
		// console.log("submitPrompt", _chatId);
		// await generateChatTitle(_chatId, userPrompt);
		// if (selectedModels.includes("")) {
		// 	toast.error("Model not selected");
		// } else if (messages.length != 0 && messages.at(-1).done != true) {
		// 	console.log("wait");
		// } else {
		const chatElement: any = document.getElementById("chat-textarea");
		chatElement.style.height = "";

		let userMessageId = uuidv4();
		let userMessage: any = {
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
		// }
	};

	const stopResponse = () => {
		stopResponseFlag = true;
	};

	const regenerateResponse = async () => {
		const _chatId = JSON.parse(JSON.stringify($chatId));

		if (messages.length != 0 && messages.at(-1).done == true) {
			messages.splice(messages.length - 1, 1);
			messages = messages;

			let userMessage = messages.at(-1);
			let userPrompt = userMessage.content;

			await sendPrompt(userPrompt, userMessage.id, _chatId);
		}
	};
	const setChatTitle = async (_chatId: any, _title: any) => {
		await $db.updateChatById(_chatId, { title: _title });
		if (_chatId === $chatId) {
			title = _title;
		}
	};
	const generateChatTitle = async (_chatId: any, userPrompt: any) => {
		if ($settings.titleAutoGenerate ?? true) {
			// const res = await fetch(`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/generate`, {
			// 	method: "POST",
			// 	headers: {
			// 		"Content-Type": "text/event-stream"
			// 	},
			// 	body: JSON.stringify({
			// 		model: selectedModels[0],
			// 		prompt: `Generate a brief 3-5 word title for this question, excluding the term 'title.' Then, please reply with only the title: ${userPrompt}`,
			// 		stream: false
			// 	})
			// })
			// 	.then(async (res) => {
			// 		if (!res.ok) throw await res.json();
			// 		return res.json();
			// 	})
			// 	.catch((error) => {
			// 		if ("detail" in error) {
			// 			toast.error(error.detail);
			// 		}
			// 		console.log(error);
			// 		return null;
			// 	});
			await setChatTitle(_chatId, userPrompt === "" ? "新会话" : userPrompt);
			// 	if (userPrompt) {
			// 		await setChatTitle(_chatId, userPrompt === "" ? "新会话" : userPrompt);
			// 	}
			// } else {
			// 	await setChatTitle(_chatId, `${userPrompt}`);
		}
	};
</script>
<style>
	:root {
		--main-width: calc(88% - 260px);
	}
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

<!-- <Navbar {title} /> -->
<div class="min-h-screen w-full flex justify-center bgcolor">
	<div class="sidebar-left"><Sidebar bind:show /></div>
	<div class="content-right">
		<div class="nav-bar fixed py-2.5 top-0"><Navbar {title} /></div>
		<!-- <div class=" mx-auto w-full md:px-0 mt-10">
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
	<!-- <div class=" py-2.5 flex flex-col justify-between w-full set-width">
		<div class="max-w-2xl mx-auto w-full px-3 md:px-0 mt-10">
			<ModelSelector bind:selectedModels disabled={messages.length > 0} />
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
	/> -->
</div>
