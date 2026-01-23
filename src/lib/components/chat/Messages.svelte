<script lang="ts">
	import { marked } from "marked";
	import { createEventDispatcher } from "svelte";
	import { v4 as uuidv4 } from "uuid";
	import tippy from "tippy.js";
	import hljs from "highlight.js";
	import "highlight.js/styles/github-dark.min.css";
	import auto_render from "katex/dist/contrib/auto-render.mjs";
	import "katex/dist/katex.min.css";
	import { goto } from "$app/navigation";
	import { chatId, db } from "$lib/stores";
	import { tick } from "svelte";
	import { get } from "svelte/store";
	import { userInfor, userName } from "$lib/stores";
	import toast from "svelte-french-toast";
	import Modal from "$lib/components/common/Modal.svelte";
	import { feedbackMessage } from "$lib/api/chat";
	export let sendPrompt: Function;
	export let regenerateResponse: Function;
	export let isMobile: boolean;
	export let bottomPadding = false;
	export let autoScroll: any;
	// export let selectedModels: any;
	export let history: any = {};
	export let messages: any = [];
	export let copyContent: any;
	const dispatch = createEventDispatcher();
	let userNames: string = "";
	let showNoAnser: boolean = true;
	let displayedContent: any;
	let feedbackForm: any = {
		//会话ID
		conversationId: "",
		//消息ID
		messageId: "",
		//点赞 like, 点踩 dislike, 撤销点赞 null
		rating: "",
		//反馈内容
		content: "",
		//回答内容
		answer: "",
		//问题
		title: ""
	};
	let feedbackColor: any = [];
	// 不喜欢弹窗
	let showDislikeModal = false;
	let dislikeReason: string = "";
	let currentFeedbackItem: { message: any; index: number } | null = null;
	// 图片大图显示
	let showImagePreview = false;
	let previewImageUrl = "";
	let scale = 1;
	// 图片放大功能 最大3倍
	const zoomIn = () => {
		scale = Math.min(scale + 0.25, 3);
	};
	// 图片缩小功能 最小0.5倍
	const zoomOut = () => {
		scale = Math.max(scale - 0.25, 0.1);
	};
	const closePreview = () => {
		showImagePreview = false;
	};
	$: if (!showImagePreview) {
		scale = 1;
	}
	// 打开弹窗
	const openDislikeModal = (message: any, index: number) => {
		currentFeedbackItem = { message, index };
		dislikeReason = ""; // 重置输入框
		showDislikeModal = true;
	};

	// 确认提交不喜欢
	const confirmDislike = () => {
		if (currentFeedbackItem) {
			const { message, index } = currentFeedbackItem;
			// 更新本地 UI 状态
			feedbackColor[index] = "dislike";
			// 调用接口，传入 'dislike' 和 原因
			likeMessageHandler(message, "dislike", dislikeReason);
		}
		showDislikeModal = false;
	};

	// 取消
	const cancelDislike = () => {
		showDislikeModal = false;
		currentFeedbackItem = null;
	};
	$: if ($userName) {
		userNames = get(userName);
	}

	$: if (messages && messages.length > 0 && (messages.at(-1).done ?? false)) {
		(async () => {
			await tick();
			renderLatex();
			hljs.highlightAll();
			createCopyCodeBlockButton();

			for (const message of messages) {
				if (message.info) {
					// tippy(`#info-${message.id}`, {
					// 	content: ""
					// });
					tippy(`#copy-${message.id}`, {
						content: "复制"
					});
					tippy(`#edit-${message.id}`, {
						content: "编辑"
					});
					tippy(`#refesh-${message.id}`, {
						content: "重新生成"
					});
				}
			}
		})();
	}
	// $: if (messages && messages.length > 0) {
	// 	for (const message of messages) {
	// 		// console.log("message-if", message);
	// 		if (message.role === "assistant") {
	// 			let plainText = message.content.replace(/<[^>]*>/g, "");
	// 			console.log("plainText-assistant", plainText);

	// 			if (!plainText) {
	// 				// 如果内容为空，立即显示默认消息
	// 				showNoAnser = false;
	// 				console.log("空");
	// 			} else {
	// 				// 否则，设置一个定时器，在一段时间后可能更新状态
	// 				showNoAnser = true;
	// 				const timer = setTimeout(() => {
	// 					// showNoAnser = true;
	// 					// 这里可以根据需要更新状态，比如检查是否有新消息等
	// 					// 在这个例子中，我们仅仅模拟一段时间后仍然显示 Markdown 内容
	// 					// 如果要隐藏内容或显示其他信息，可以在这里修改状态
	// 					// showDefaultMessage = true; // 假设我们决定显示默认消息
	// 				}, 3000); // 定时器设置为3秒后触发

	// 				// 清理函数，用于在组件卸载时清除定时器
	// 				clearTimeout(timer);
	// 			}
	// 		}
	// 	}
	// }
	$: if (autoScroll && bottomPadding) {
		(async () => {
			await tick();
			window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
		})();
	}

	$: if (messages?.length > 0) {
		for (const message of messages) {
			if (message?.edit !== true) {
				tippy(`#useredit-${message.id}`, {
					content: "编辑问题"
				});
				tippy(`#usercopy-${message.id}`, {
					content: "复制到输入框"
				});
			}
		}
	}
	const createCopyCodeBlockButton = () => {
		// use a class selector if available
		let blocks = document.querySelectorAll("pre");

		blocks.forEach(block => {
			// only add button if browser supports Clipboard API

			if (
				navigator.clipboard &&
				block.childNodes.length < 2 &&
				block.id !== "user-message"
			) {
				let code: any = block.querySelector("code");
				code.style.borderTopRightRadius = 0;
				code.style.borderTopLeftRadius = 0;

				let topBarDiv = document.createElement("div");
				topBarDiv.style.backgroundColor = "#202123";
				topBarDiv.style.overflowX = "auto";
				topBarDiv.style.display = "flex";
				topBarDiv.style.justifyContent = "space-between";
				topBarDiv.style.padding = "0 1rem";
				topBarDiv.style.paddingTop = "4px";
				topBarDiv.style.borderTopRightRadius = "8px";
				topBarDiv.style.borderTopLeftRadius = "8px";

				let langDiv = document.createElement("div");

				let codeClassNames = code?.className.split(" ");
				langDiv.textContent =
					codeClassNames[0] === "hljs"
						? codeClassNames[1].slice(9)
						: codeClassNames[0].slice(9);
				langDiv.style.color = "white";
				langDiv.style.margin = "4px";
				langDiv.style.fontSize = "0.75rem";

				let button = document.createElement("button");
				button.textContent = "Copy Code";
				button.style.background = "none";
				button.style.fontSize = "0.75rem";
				button.style.border = "none";
				button.style.margin = "4px";
				button.style.cursor = "pointer";
				button.style.color = "#ddd";
				button.addEventListener("click", () => copyCode(block, button));

				topBarDiv.appendChild(langDiv);
				topBarDiv.appendChild(button);

				block.prepend(topBarDiv);

				// button.addEventListener('click', async () => {
				//  await copyCode(block, button);
				// });
			}
		});

		async function copyCode(block: any, button: any) {
			let code = block.querySelector("code");
			let text = code.innerText;

			await navigator.clipboard.writeText(text);

			// visual feedback that task is completed
			button.innerText = "Copied!";

			setTimeout(() => {
				button.innerText = "Copy Code";
			}, 1000);
		}
	};
	// 前端数学公式渲染
	const renderLatex = () => {
		let chatMessageElements = document.getElementsByClassName("chat-assistant");
		// let lastChatMessageElement = chatMessageElements[chatMessageElements.length - 1];

		for (const element of chatMessageElements) {
			auto_render(element, {
				// customised options
				// • auto-render specific keys, e.g.:
				delimiters: [
					{ left: "$$", right: "$$", display: true },
					// { left: '$', right: '$', display: false },
					{ left: "\\(", right: "\\)", display: true },
					{ left: "\\[", right: "\\]", display: true }
				],
				// • rendering keys, e.g.:
				throwOnError: false
			});
		}
	};

	const copyToClipboard = (text: string, usercopy?: any) => {
		if (usercopy) {
			copyContent = text;
		}
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
			function () {
				toast.success("复制成功");
			},
			function (err) {}
		);
	};

	const likeMessageHandler = async (
		message: any,
		feedback: any,
		content: string = ""
	) => {
		const form: any = {
			conversationId: message.conversationId,
			messageId: message.messageId,
			answer: message.content,
			title: message.query,
			rating: feedback,
			content: content
		};
		const response: any = await feedbackMessage(form);
		if (response.code === "000000") {
			toast.success("反馈成功");
		}
	};
	const editMessageHandler = async (messageId: any) => {
		// let editMessage = history.messages[messageId];
		history.messages[messageId].edit = true;
		history.messages[messageId].originalContent =
			history.messages[messageId].content;
		history.messages[messageId].editedContent =
			history.messages[messageId].content;

		await tick();

		const editElement: any = document.getElementById(
			`message-edit-${messageId}`
		);

		editElement.style.height = "";
		editElement.style.height = `${editElement.scrollHeight}px`;
	};

	const confirmEditMessage = async (messageId: any) => {
		history.messages[messageId].edit = false;

		let userPrompt = history.messages[messageId].editedContent;
		let userMessageId = uuidv4();

		let userMessage = {
			id: userMessageId,
			parentId: history.messages[messageId].parentId,
			childrenIds: [],
			role: "user",
			content: userPrompt,
			...(history.messages[messageId].files && {
				files: history.messages[messageId].files
			})
		};

		let messageParentId = history.messages[messageId].parentId;

		if (messageParentId !== null) {
			history.messages[messageParentId].childrenIds = [
				...history.messages[messageParentId].childrenIds,
				userMessageId
			];
		}

		history.messages[userMessageId] = userMessage;
		history.currentId = userMessageId;

		await tick();
		await sendPrompt(userPrompt, userMessageId, $chatId);
	};

	const confirmEditResponseMessage = async (messageId: any) => {
		history.messages[messageId].edit = false;
		history.messages[messageId].content =
			history.messages[messageId].editedContent;
	};

	const cancelEditMessage = (messageId: any) => {
		history.messages[messageId].edit = false;
		history.messages[messageId].editedContent = undefined;
	};

	const showPreviousMessage = async (message: any) => {
		if (message.parentId !== null) {
			let messageId =
				history.messages[message.parentId].childrenIds[
					Math.max(
						history.messages[message.parentId].childrenIds.indexOf(message.id) -
							1,
						0
					)
				];

			if (message.id !== messageId) {
				let messageChildrenIds = history.messages[messageId].childrenIds;

				while (messageChildrenIds.length !== 0) {
					messageId = messageChildrenIds.at(-1);
					messageChildrenIds = history.messages[messageId].childrenIds;
				}

				history.currentId = messageId;
			}
		} else {
			let childrenIds = Object.values(history.messages)
				.filter((message: any) => message.parentId === null)
				.map((message: any) => message.id);
			let messageId =
				childrenIds[Math.max(childrenIds.indexOf(message.id) - 1, 0)];

			if (message.id !== messageId) {
				let messageChildrenIds = history.messages[messageId].childrenIds;

				while (messageChildrenIds.length !== 0) {
					messageId = messageChildrenIds.at(-1);
					messageChildrenIds = history.messages[messageId].childrenIds;
				}

				history.currentId = messageId;
			}
		}

		await tick();

		autoScroll =
			window.innerHeight + window.scrollY >= document.body.offsetHeight - 40;

		setTimeout(() => {
			window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
		}, 100);
	};

	const showNextMessage = async (message: any) => {
		if (message.parentId !== null) {
			let messageId =
				history.messages[message.parentId].childrenIds[
					Math.min(
						history.messages[message.parentId].childrenIds.indexOf(message.id) +
							1,
						history.messages[message.parentId].childrenIds.length - 1
					)
				];

			if (message.id !== messageId) {
				let messageChildrenIds = history.messages[messageId].childrenIds;

				while (messageChildrenIds.length !== 0) {
					messageId = messageChildrenIds.at(-1);
					messageChildrenIds = history.messages[messageId].childrenIds;
				}

				history.currentId = messageId;
			}
		} else {
			let childrenIds = Object.values(history.messages)
				.filter((message: any) => message.parentId === null)
				.map((message: any) => message.id);
			let messageId =
				childrenIds[
					Math.min(childrenIds.indexOf(message.id) + 1, childrenIds.length - 1)
				];

			if (message.id !== messageId) {
				let messageChildrenIds = history.messages[messageId].childrenIds;

				while (messageChildrenIds.length !== 0) {
					messageId = messageChildrenIds.at(-1);
					messageChildrenIds = history.messages[messageId].childrenIds;
				}

				history.currentId = messageId;
			}
		}

		await tick();

		autoScroll =
			window.innerHeight + window.scrollY >= document.body.offsetHeight - 40;
		setTimeout(() => {
			window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
		}, 100);
	};
	function editMessageByContent(e: any) {
		e.target.style.height = `${e.target.scrollHeight}px`;
	}
</script>
<style>
	/* .float-right {
		float: right;
		
	} */
	.bgcolora {
		background-color: #fff;
		border-radius: 20px;
	}
	.marginset {
		margin-top: 12px;
		/* padding-bottom: 12px; */
	}
	/* .user-set-text-align {
		text-align: right;
		padding-top: 20px;
	} */
	.user-set-img-margin {
		margin-right: 0;
		padding-top: 20px;
		flex-wrap: wrap;
		justify-content: end;
	}
	.set-line-height-none {
		/* .prose{ */
		line-height: 26px !important;
		/* } */
	}
	.set-margin-top {
		margin-top: 20px;
	}
	.set-flex {
		display: flex;
	}
	/* .setp > p {
		padding: 0 6px;
	} */
	.set-mobile-w {
		margin: 0 3%;
		width: 94%;
	}
	.currentlikecolor {
		color: #2784ff;
	}
	.currentdislikecolor {
		color: #ff2424;
	}
	.set-new-bg {
		background-color: transparent !important;
	}
</style>
<!--没有会话消息默认新对话框-->
{#if messages.length == 0}
	<div
		class="m-auto text-center max-w-md px-2"
		style="margin: 10rem auto 1.25rem;"
	>
		<div class="flex justify-center mt-8">
			<img
				src="/favicon.png"
				class=" w-16 invert-[10%] dark:invert-[100%] rounded-full"
				alt="小C+"
				draggable="false"
			/>
		</div>
		<div class=" mt-2 text-1xl text-gray-800 dark:text-gray-100 font-semibold">
			<p>小C+，您的智能助手！</p>
			<p>有问必答,高效办理。请直接输入您的问题。</p>
		</div>
	</div>
{:else}
	{#each messages as message, messageIdx}
		<div
			class=" {isMobile ? 'set-mobile-w' : 'w-full'} {message.role === 'user'
				? ''
				: 'bgcolora'}  "
		>
			<div
				class="flex w-full {message.role === 'user'
					? 'float-right'
					: ''} justify-between px-5 mb-3 mx-auto rounded-lg group marginset"
			>
				<div class=" flex w-full">
					<div
						class="w-full {message.role === 'user'
							? 'user-set-text-align'
							: 'set-text-align-other'}"
					>
						<!--区分角色-->
						<div
							class="w-full self-center mb-0.5 {message.role === 'user'
								? 'user-set-margin'
								: 'set-margin-other'}"
						>
							<div
								class=" mr-4 {message.role === 'user'
									? 'user-set-img-margin'
									: 'set-img-margin-other'} set-flex"
							>
								<div>
									{#if message.role === "user"}
										<img
											src="/user.png"
											class=" max-w-[28px] object-cover rounded-full"
											alt="User profile"
											draggable="false"
										/>
									{:else}
										<img
											src="/favicon.png"
											class=" max-w-[28px] object-cover rounded-full"
											alt="Ollama profile"
											draggable="false"
										/>
									{/if}
								</div>
								<div style="line-height: 28px;margin-left: 4px; ">
									{#if message.role === "user"}
										{userNames}
									{:else}
										小C+
										<!-- <span class=" text-gray-500 text-sm font-medium"
									>{message.model ? ` ${message.model}` : ""}</span
								> -->
									{/if}
								</div>
							</div>
						</div>
						<!--user角色-->
						{#if message.role !== "user" && message.content === ""}
							<div class="w-full mt-3">
								<div class="animate-pulse flex w-full">
									<div class="space-y-2 w-full">
										<div
											class="h-2 bg-gray-200 dark:bg-gray-600 rounded mr-14"
										/>

										<div class="grid grid-cols-3 gap-4">
											<div
												class="h-2 bg-gray-200 dark:bg-gray-600 rounded col-span-2"
											/>
											<div
												class="h-2 bg-gray-200 dark:bg-gray-600 rounded col-span-1"
											/>
										</div>
										<div class="grid grid-cols-4 gap-4">
											<div
												class="h-2 bg-gray-200 dark:bg-gray-600 rounded col-span-1"
											/>
											<div
												class="h-2 bg-gray-200 dark:bg-gray-600 rounded col-span-2"
											/>
											<div
												class="h-2 bg-gray-200 dark:bg-gray-600 rounded col-span-1 mr-4"
											/>
										</div>

										<div class="h-2 bg-gray-200 dark:bg-gray-600 rounded" />
									</div>
								</div>
							</div>
						{:else}
							<div
								class="prose chat-{message.role} {message.role === 'user'
									? ''
									: 'set-line-height-none'} w-full max-w-full dark:prose-invert prose-headings:my-0 prose-p:my-0 prose-p:-mb-4 prose-pre:my-0 prose-table:my-0 prose-blockquote:my-0 prose-img:my-0 prose-ul:-my-4 prose-ol:-my-4 prose-li:-my-3 prose-ul:-mb-6 prose-ol:-mb-6 prose-li:-mb-4 whitespace-pre-line"
							>
								{#if message.role == "user"}
									<!--用户输入问题对话后再编辑问题-->
									{#if message?.edit === true}
										<div class="flex w-full flex-wrap">
											<textarea
												id="message-edit-{message.id}"
												class=" bg-transparent outline-none w-full resize-none"
												bind:value={history.messages[message.id].editedContent}
												on:input={e => editMessageByContent(e)}
											/>

											<div
												class=" mt-2 mb-1 flex justify-center space-x-2 text-sm font-medium"
											>
												<button
													class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-gray-100 transition rounded-lg"
													on:click={() => {
														confirmEditMessage(message.id);
													}}
												>
													保存
												</button>

												<button
													class=" px-4 py-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-100 transition outline outline-1 outline-gray-200 dark:outline-gray-600 rounded-lg"
													on:click={() => {
														cancelEditMessage(message.id);
													}}
												>
													取消
												</button>
											</div>
										</div>
									{:else}
										<div class="w-full">
											<!--图片-->
											{#if message.files}
												<div
													class="w-full flex justify-end overflow-x-auto space-x-2"
												>
													{#each message.files as file}
														<div class="w-16">
															{#if file?.type === "image"}
																<!-- svelte-ignore a11y-click-events-have-key-events -->
																<button
																	type="button"
																	class=" w-full p-0 border-0 bg-transparent cursor-pointer outline-none"
																	on:click={() => {
																		previewImageUrl = file?.url;
																		showImagePreview = true;
																	}}
																>
																	<img
																		src={file?.url}
																		alt="input"
																		class=" h-full w-full object-cover cursor-pointer"
																		draggable="false"
																	/></button
																>
															{/if}
														</div>
													{/each}
												</div>
											{/if}
											<pre
												class="w-full flex justify-end"
												id="user-message">{message.content}</pre>

											<div class="w-full flex justify-end space-x-1">
												<button
													class="invisible group-hover:visible p-1 rounded dark:hover:bg-gray-800 transition"
													on:click={() => {
														editMessageHandler(message.id);
													}}
													id="useredit-{message.id}"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														fill="none"
														viewBox="0 0 24 24"
														stroke-width="1.5"
														stroke="currentColor"
														class="w-4 h-4"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
														/>
													</svg>
												</button>

												<button
													class="invisible group-hover:visible p-1 rounded dark:hover:bg-gray-800 transition"
													on:click={() => {
														copyToClipboard(message.content, "usercopy");
													}}
													id="usercopy-{message.id}"
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														fill="none"
														viewBox="0 0 24 24"
														stroke-width="1.5"
														stroke="currentColor"
														class="w-4 h-4"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
														/>
													</svg>
												</button>
												{#if message.parentId !== null && message.parentId in history.messages && (history.messages[message.parentId]?.childrenIds.length ?? 0) > 1}
													<div class="flex self-center">
														<button
															class="self-center"
															on:click={() => {
																showPreviousMessage(message);
															}}
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																viewBox="0 0 20 20"
																fill="currentColor"
																class="w-4 h-4"
															>
																<path
																	fill-rule="evenodd"
																	d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
																	clip-rule="evenodd"
																/>
															</svg>
														</button>

														<div class="text-xs font-bold self-center">
															{history.messages[
																message.parentId
															].childrenIds.indexOf(message.id) + 1} / {history
																.messages[message.parentId].childrenIds.length}
														</div>

														<button
															class="self-center"
															on:click={() => {
																showNextMessage(message);
															}}
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																viewBox="0 0 20 20"
																fill="currentColor"
																class="w-4 h-4"
															>
																<path
																	fill-rule="evenodd"
																	d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
																	clip-rule="evenodd"
																/>
															</svg>
														</button>
													</div>
												{:else if message.parentId === null && Object.values(history.messages).filter(// @ts-ignore
														message => message.parentId === null).length > 1}
													<div class="flex self-center">
														<button
															class="self-center"
															on:click={() => {
																showPreviousMessage(message);
															}}
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																viewBox="0 0 20 20"
																fill="currentColor"
																class="w-4 h-4"
															>
																<path
																	fill-rule="evenodd"
																	d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
																	clip-rule="evenodd"
																/>
															</svg>
														</button>

														<div class="text-xs font-bold self-center">
															{Object.values(history.messages)
																.filter(
																	(
																		message // @ts-ignore
																	) => message.parentId === null
																)
																.map(
																	(
																		message // @ts-ignore
																	) => message.id
																)
																.indexOf(message.id) + 1} / {Object.values(
																history.messages
															).filter(
																(
																	message // @ts-ignore
																) => message.parentId === null
															).length}
														</div>

														<button
															class="self-center"
															on:click={() => {
																showNextMessage(message);
															}}
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																viewBox="0 0 20 20"
																fill="currentColor"
																class="w-4 h-4"
															>
																<path
																	fill-rule="evenodd"
																	d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
																	clip-rule="evenodd"
																/>
															</svg>
														</button>
													</div>
												{/if}
											</div>
										</div>
									{/if}
								{/if}
								<!--assistant角色-->
								{#if message.role === "assistant"}
									<div>
										{#if message?.edit === true}
											<div class=" w-full bgcolor">
												<textarea
													id="message-edit-{message.id}"
													class=" bg-transparent outline-none w-full resize-none"
													bind:value={history.messages[message.id]
														.editedContent}
													on:input={e => {
														// @ts-ignore
														e.target.style.height = `${e.target.scrollHeight}px`;
													}}
												/>

												<div
													class=" mt-2 mb-1 flex justify-center space-x-2 text-sm font-medium"
												>
													<button
														class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-gray-100 transition rounded-lg"
														on:click={() => {
															confirmEditResponseMessage(message.id);
														}}
													>
														保存
													</button>

													<button
														class=" px-4 py-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-100 transition outline outline-1 outline-gray-200 dark:outline-gray-600 rounded-lg"
														on:click={() => {
															cancelEditMessage(message.id);
														}}
													>
														取消
													</button>
												</div>
											</div>
										{:else}
											<div class="w-full p-[6px] setp">
												{#if message?.error === true}
													<div
														class="flex mt-2 mb-4 space-x-2 border px-4 py-3 border-red-800 bg-red-800/30 font-medium rounded-lg"
													>
														<svg
															xmlns="http://www.w3.org/2000/svg"
															fill="none"
															viewBox="0 0 24 24"
															stroke-width="1.5"
															stroke="currentColor"
															class="w-5 h-5 self-center"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
															/>
														</svg>

														<div class=" self-center">
															{message.content}
														</div>
													</div>
												{:else}
													<!-- {message.content} -->
													<div
														class="prose prose-sm max-w-none dark:prose-invert"
													>
														{@html marked(
															message.content.replace("\\\\", "\\\\\\")
														)}
														<!-- {@html message.content
															.replace("\\\\", "\\\\\\")
															.trim()
															.replace(/\n{2,}/g, "\n")
															.replace(/\//g, "")
															.replace(/<\/?strong[^>]*>/g, "")} -->
													</div>
												{/if}

												{#if message.done}
													<div
														class=" flex justify-start set-margin-top space-x-1 -mt-2"
													>
														{#if message.parentId !== null && message.parentId in history.messages && (history.messages[message.parentId]?.childrenIds.length ?? 0) > 1}
															<div class="flex self-center">
																<button
																	class="self-center"
																	on:click={() => {
																		showPreviousMessage(message);
																	}}
																>
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		viewBox="0 0 20 20"
																		fill="currentColor"
																		class="w-4 h-4"
																	>
																		<path
																			fill-rule="evenodd"
																			d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
																			clip-rule="evenodd"
																		/>
																	</svg>
																</button>

																<div class="text-xs font-bold self-center">
																	{history.messages[
																		message.parentId
																	].childrenIds.indexOf(message.id) + 1} / {history
																		.messages[message.parentId].childrenIds
																		.length}
																</div>

																<button
																	class="self-center"
																	on:click={() => {
																		showNextMessage(message);
																	}}
																>
																	<svg
																		xmlns="http://www.w3.org/2000/svg"
																		viewBox="0 0 20 20"
																		fill="currentColor"
																		class="w-4 h-4"
																	>
																		<path
																			fill-rule="evenodd"
																			d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
																			clip-rule="evenodd"
																		/>
																	</svg>
																</button>
															</div>
														{/if}

														<!-- <button
															class="{messageIdx + 1 === messages.length
																? 'visible'
																: 'invisible group-hover:visible'} p-1 rounded dark:hover:bg-gray-800 transition"
															on:click={() => {
																editMessageHandler(message);
															}}
															id="edit-{message.id}"
														>
															<svg
																viewBox="0 0 24 24"
																xmlns="http://www.w3.org/2000/svg"
																width="24"
																height="24"
																fill="currentColor"
																class="remixicon h-4 w-4"
																><path
																	d="M14.5998 8.00033H21C22.1046 8.00033 23 8.89576 23 10.0003V12.1047C23 12.3659 22.9488 12.6246 22.8494 12.8662L19.755 20.3811C19.6007 20.7558 19.2355 21.0003 18.8303 21.0003H2C1.44772 21.0003 1 20.5526 1 20.0003V10.0003C1 9.44804 1.44772 9.00033 2 9.00033H5.48184C5.80677 9.00033 6.11143 8.84246 6.29881 8.57701L11.7522 0.851355C11.8947 0.649486 12.1633 0.581978 12.3843 0.692483L14.1984 1.59951C15.25 2.12534 15.7931 3.31292 15.5031 4.45235L14.5998 8.00033ZM7 10.5878V19.0003H18.1606L21 12.1047V10.0003H14.5998C13.2951 10.0003 12.3398 8.77128 12.6616 7.50691L13.5649 3.95894C13.6229 3.73105 13.5143 3.49353 13.3039 3.38837L12.6428 3.0578L7.93275 9.73038C7.68285 10.0844 7.36341 10.3746 7 10.5878ZM5 11.0003H3V19.0003H5V11.0003Z"
																/></svg
															>
														</button> -->
														{#if message.answer}
															{#if (feedbackColor[messageIdx] !== undefined ? feedbackColor[messageIdx] : message?.feedback?.rating) !== "dislike"}
																<button
																	class="{messageIdx + 1 === messages.length
																		? 'visible'
																		: 'invisible group-hover:visible'} p-1 rounded dark:hover:bg-gray-800 transition"
																	on:click={() => {
																		// 计算当前状态（优先使用本地状态，否则使用历史状态）
																		const currentRating =
																			feedbackColor[messageIdx] !== undefined
																				? feedbackColor[messageIdx]
																				: message?.feedback?.rating;

																		// 判断是否是取消操作
																		const isLike = currentRating === "like";
																		const newLocal = isLike ? "" : "like"; // 本地设为空字符串代表取消
																		const newApi = isLike ? null : "like"; // API 发送 null 代表取消

																		feedbackColor[messageIdx] = newLocal;

																		likeMessageHandler(message, newApi);
																	}}
																	id="like-{message.id}"
																>
																	<svg
																		viewBox="0 0 24 24"
																		xmlns="http://www.w3.org/2000/svg"
																		width="24"
																		height="24"
																		fill="currentColor"
																		class="remixicon h-4 w-4 {(feedbackColor[
																			messageIdx
																		] !== undefined
																			? feedbackColor[messageIdx]
																			: message?.feedback?.rating) === 'like'
																			? 'currentlikecolor'
																			: ''}"
																		><path
																			d="M14.5998 8.00033H21C22.1046 8.00033 23 8.89576 23 10.0003V12.1047C23 12.3659 22.9488 12.6246 22.8494 12.8662L19.755 20.3811C19.6007 20.7558 19.2355 21.0003 18.8303 21.0003H2C1.44772 21.0003 1 20.5526 1 20.0003V10.0003C1 9.44804 1.44772 9.00033 2 9.00033H5.48184C5.80677 9.00033 6.11143 8.84246 6.29881 8.57701L11.7522 0.851355C11.8947 0.649486 12.1633 0.581978 12.3843 0.692483L14.1984 1.59951C15.25 2.12534 15.7931 3.31292 15.5031 4.45235L14.5998 8.00033ZM7 10.5878V19.0003H18.1606L21 12.1047V10.0003H14.5998C13.2951 10.0003 12.3398 8.77128 12.6616 7.50691L13.5649 3.95894C13.6229 3.73105 13.5143 3.49353 13.3039 3.38837L12.6428 3.0578L7.93275 9.73038C7.68285 10.0844 7.36341 10.3746 7 10.5878ZM5 11.0003H3V19.0003H5V11.0003Z"
																		/></svg
																	>
																</button>
															{/if}

															{#if (feedbackColor[messageIdx] !== undefined ? feedbackColor[messageIdx] : message?.feedback?.rating) !== "like"}
																<button
																	class="{messageIdx + 1 === messages.length
																		? 'visible'
																		: 'invisible group-hover:visible'} p-1 rounded dark:hover:bg-gray-800 transition"
																	on:click={() => {
																		// 获取当前状态（优先读取本地操作状态 feedbackColor，如果没有则读取历史状态 message.feedback.rating）
																		const currentRating =
																			feedbackColor[messageIdx] !== undefined
																				? feedbackColor[messageIdx]
																				: message?.feedback?.rating;

																		if (currentRating === "dislike") {
																			// 如果已经是 dislike 状态，点击则是“取消不喜欢”（无需弹窗）
																			feedbackColor[messageIdx] = ""; // 清空本地状态
																			likeMessageHandler(message, null);
																		} else {
																			// 如果当前不是 dislike，则打开弹窗输入原因
																			openDislikeModal(message, messageIdx);
																		}
																	}}
																	id="dislike-{message.id}"
																>
																	<svg
																		viewBox="0 0 24 24"
																		xmlns="http://www.w3.org/2000/svg"
																		width="24"
																		height="24"
																		fill="currentColor"
																		class="remixicon h-4 w-4 {(feedbackColor[
																			messageIdx
																		] !== undefined
																			? feedbackColor[messageIdx]
																			: message?.feedback?.rating) === 'dislike'
																			? 'currentdislikecolor'
																			: ''}"
																		><path
																			d="M9.40017 16H3C1.89543 16 1 15.1046 1 14V11.8957C1 11.6344 1.05118 11.3757 1.15064 11.1342L4.24501 3.61925C4.3993 3.24455 4.76447 3 5.16969 3H22C22.5523 3 23 3.44772 23 4V14C23 14.5523 22.5523 15 22 15H18.5182C18.1932 15 17.8886 15.1579 17.7012 15.4233L12.2478 23.149C12.1053 23.3508 11.8367 23.4184 11.6157 23.3078L9.80163 22.4008C8.74998 21.875 8.20687 20.6874 8.49694 19.548L9.40017 16ZM17 13.4125V5H5.83939L3 11.8957V14H9.40017C10.7049 14 11.6602 15.229 11.3384 16.4934L10.4351 20.0414C10.3771 20.2693 10.4857 20.5068 10.6961 20.612L11.3572 20.9425L16.0673 14.27C16.3172 13.9159 16.6366 13.6257 17 13.4125ZM19 13H21V5H19V13Z"
																		/></svg
																	>
																</button>
															{/if}
														{/if}
														<button
															class="{messageIdx + 1 === messages.length
																? 'visible'
																: 'invisible group-hover:visible'} p-1 rounded dark:hover:bg-gray-800 transition"
															on:click={() => {
																copyToClipboard(message.content);
															}}
															id="copy-{message.id}"
														>
															<svg
																xmlns="http://www.w3.org/2000/svg"
																fill="none"
																viewBox="0 0 24 24"
																stroke-width="1.5"
																stroke="currentColor"
																class="w-4 h-4"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
																/>
															</svg>
														</button>

														{#if message.info}
															<button
																class=" {messageIdx + 1 === messages.length
																	? 'visible'
																	: 'invisible group-hover:visible'} p-1 rounded dark:hover:bg-gray-800 transition whitespace-pre-wrap"
																on:click={() => {}}
																id="info-{message.id}"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	fill="none"
																	viewBox="0 0 24 24"
																	stroke-width="1.5"
																	stroke="currentColor"
																	class="w-4 h-4"
																>
																	<path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
																	/>
																</svg>
															</button>
														{/if}

														{#if messageIdx + 1 === messages.length}
															<button
																type="button"
																class="{messageIdx + 1 === messages.length
																	? 'visible'
																	: 'invisible group-hover:visible'} p-1 rounded dark:hover:bg-gray-800 transition"
																on:click={() => regenerateResponse()}
																id="refesh-{message.id}"
															>
																<svg
																	xmlns="http://www.w3.org/2000/svg"
																	fill="none"
																	viewBox="0 0 24 24"
																	stroke-width="1.5"
																	stroke="currentColor"
																	class="w-4 h-4"
																>
																	<path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
																	/>
																</svg>
															</button>
														{/if}
													</div>
												{/if}
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					</div>
					<!-- {} -->
				</div>
			</div>
		</div>
	{/each}

	{#if bottomPadding}
		<div class=" mb-10" />
	{/if}
	<!-- <Modal bind:show={showImagePreview}>
		<div class="flex justify-center p-2">
			<img
				src={previewImageUrl}
				alt="preview"
				class="max-w-full max-h-[80vh] rounded-lg"
				draggable="false"
			/>
		</div>
	</Modal> -->
	<Modal bind:show={showImagePreview} class="set-new-bg">
		<div class="fixed top-4 right-4 flex space-x-2 z-10">
			<button
				class="p-2 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition shadow-sm"
				on:click|stopPropagation={zoomIn}
				title="放大"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
					class="w-5 h-5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 4.5v15m7.5-7.5h-15"
					/>
				</svg>
			</button>

			<button
				class="p-2 bg-gray-200 dark:bg-gray-800 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition shadow-sm"
				on:click|stopPropagation={zoomOut}
				title="缩小"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
					class="w-5 h-5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M19.5 12h-15"
					/>
				</svg>
			</button>

			<button
				class="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full hover:bg-red-200 dark:hover:bg-red-900/50 transition shadow-sm"
				on:click|stopPropagation={closePreview}
				title="关闭"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="2"
					stroke="currentColor"
					class="w-5 h-5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<img
			src={previewImageUrl}
			alt="preview"
			class="transition-transform duration-200 ease-in-out object-contain max-w-full max-h-[80vh]"
			style="transform: scale({scale});margin:0 auto;"
			draggable="false"
		/>
	</Modal>
	{#if showDislikeModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		>
			<div
				class="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md p-6 shadow-2xl transform transition-all"
			>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
					请告诉我们您不喜欢的原因
				</h3>

				<textarea
					class="w-full h-32 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-100 resize-none text-sm"
					placeholder="请输入您的反馈，帮助我们改进..."
					bind:value={dislikeReason}
				/>

				<div class="flex justify-end space-x-3 mt-5">
					<button
						class="px-4 py-2 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition outline outline-1 outline-gray-200 dark:outline-gray-700 rounded-lg text-sm font-medium"
						on:click={cancelDislike}
					>
						取消
					</button>
					<button
						class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white transition rounded-lg text-sm font-medium shadow-sm"
						on:click={confirmDislike}
					>
						提交反馈
					</button>
				</div>
			</div>
		</div>
	{/if}
{/if}
