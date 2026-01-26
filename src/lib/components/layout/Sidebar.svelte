<script lang="ts">
	import { v4 as uuidv4 } from "uuid";
	import { logout } from "$lib/api/user";
	import { getToken, setToken, removeToken } from "$lib/utils/cookie";
	import tippy from "tippy.js";
	const redirectUrl: any = import.meta.env.VITE_APP_SSO_REDIRECT_URL;
	import {
		getChat,
		updateChatName,
		deleteConversation,
		getChatList
	} from "$lib/api/chat";
	import { page } from "$app/stores";
	import fileSaver from "file-saver";
	const { saveAs } = fileSaver;
	//	@ts-ignore
	import { goto } from "$app/navigation";
	import { db, chats, showSettings, chatId, temporaryChat } from "$lib/stores";
	import { onMount, tick } from "svelte";
	import { get } from "svelte/store";
	import { userInfor, userName } from "$lib/stores";
	import { swipe } from "$lib/utils/swipe";
	import toast from "svelte-french-toast";
	import { tooltip } from "$lib/utils";
	export let show = false;
	export let conversationId = "";
	export let isMobile: boolean;
	let navElement;
	let importFileInputElement: any;
	let importFiles: any;
	let showLongOutbtn: boolean = false;
	let title: string = "小C+";
	let search = "";
	let username: HTMLElement;
	let renameChatRecord: HTMLElement;
	let deleteChstRecord: HTMLElement;
	let chatDeleteId: string = "";
	// let windowWidth = 0;
	// $: isMobile = windowWidth <= 1040;
	let chatTitleEditId: any = "";
	let chatTitle = "";
	let chatList: any = [];
	let showDeleteHistoryConfirm = false;
	let userNames: string = "";
	let selectStatus: any[] = [];
	// 用于记录当前被滑动的条目 ID

	// 用于记录当前鼠标悬停的条目 ID (电脑端)
	let hoveredItemId: string = "";
	onMount(async () => {
		tippy(username, {
			content: "是否退出登录"
			// 其他Tippy选项...
		});

		// handleResize
		if (window.innerWidth > 1280) {
			show = true;
		}
		!$temporaryChat?.id && getChatConversationsList();
		// await chats.set(await $db.getChats());
	});
	$: if ($userName) {
		userNames = get(userName);
	}

	// 用于记录当前被滑动的条目 ID
	let swipedItemId: string = "";
	let hoverTimeout: any;
	const handleMouseEnter = (id: string) => {
		if (isMobile) return;
		clearTimeout(hoverTimeout);
		hoveredItemId = id;
	};
	const handleMouseLeave = () => {
		if (isMobile) return;
		swipedItemId = "";
		hoverTimeout = setTimeout(() => {
			hoverTimeout = "";
			hoveredItemId = "";
			// clearTimeout(hoverTimeout);
		}, 300);
	};
	//  处理滑动手势
	function handleSwipeLeft(id: string) {
		swipedItemId = id; // 标记该条目为左滑状态
	}

	function handleSwipeRight() {
		swipedItemId = ""; // 复位，关闭所有侧滑
	}
	// Tooltip Action
	// function tooltip(node: HTMLElement, content: string) {
	// 	const instance = tippy(node, {
	// 		content: content, // 提示文字
	// 		placement: "bottom", // 在下方显示
	// 		arrow: true, // 显示小箭头
	// 		delay: [200, 0], // [显示延迟, 隐藏延迟] 防止划过时闪烁
	// 		duration: [200, 100], // 动画时长
	// 		touch: ["hold", 150]
	// 	});

	// 	return {
	// 		update(newContent: string) {
	// 			instance.setProps({ content: newContent });
	// 		},
	// 		destroy() {
	// 			instance.destroy();
	// 		}
	// 	};
	// }
	// function handleResize() {
	// 	windowWidth = window.innerWidth;
	// 	show = windowWidth > 1040;
	// }
	const getChatConversationsList = async () => {
		const { data } = await getChatList();
		// chatList = data;
		chats.set(data);
		// temporaryChat.set(null);
		// let data = JSON.parse(conversationsList);
	};
	const loadChat = async (id: any, i: number) => {
		// 设置当前的 chatId store，以便页面能够感知到切换

		show = window.innerWidth > 1040;
		selectStatus[i] = true;
		$temporaryChat?.messagesSend && temporaryChat.set(null);
		await chatId.set(id);
		goto(`/c/${id}`);
	};

	const editChatTitle = async (id: any, name: any) => {
		if ($temporaryChat?.id === id) {
			temporaryChat.set({
				id: id,
				name: name,
				isTemp: true
			});
			swipedItemId = "";
			toast.success("修改成功");
		} else {
			const query: any = {
				name: name,
				conversationId: id
			};
			const data: any = await updateChatName(query);
			data.code === "000000"
				? toast.success(data.message)
				: toast.error(data.message);
			getChatConversationsList();
			chatTitle = "";
			swipedItemId = "";
		}
	};

	const deleteChat = async (id: any) => {
		if ($temporaryChat?.id === id) {
			temporaryChat.set(null);
			toast.success("删除成功");
			swipedItemId = "";
		} else {
			const data: any = await deleteConversation({ conversationId: id });
			data.code === "000000"
				? toast.success(data.message)
				: toast.error(data.message);
			swipedItemId = "";
		}
		getChatConversationsList();
		goto("/");
	};

	const deleteChatHistory = async () => {
		await $db.deleteAllChat();
	};

	const importChats = async (chatHistory: any) => {
		await $db.addChats(chatHistory);
	};

	const exportChats = async () => {
		let blob = new Blob([JSON.stringify(await $db.exportChats())], {
			type: "application/json"
		});
		saveAs(blob, `chat-export-${Date.now()}.json`);
	};
	const goLogOut = async () => {
		await logout();
		removeToken();
		goto(redirectUrl);
	};
	$: if (importFiles) {
		let reader = new FileReader();
		reader.onload = (event: any) => {
			let chats: any = JSON.parse(event.target.result);
			importChats(chats);
		};
		// var file = document.getElementById('fileInput').files[0];
		const formData = new FormData();
		formData.append("file", importFiles[0]);

		fetch("http://127.0.0.1:11434/api/upload", {
			method: "POST",
			body: formData
		})
			.then(response => response.text())
			.then(data => console.log("files", data))
			.catch(error => console.error("Error:", error));
		reader.readAsText(importFiles[0]);
	}
</script>
<style>
	.set-new-bg {
		background-color: #ebeffa;
		color: #000;
	}
	.set-new-bg-gray {
		background-color: #dde1ed;
		color: #b6b9bd;
	}
	.set-bg-boder {
		border: 1px solid #4955f5;
		border-radius: 10px;
		height: 46px;
		background-color: #dfe4f9;
		margin-bottom: 6px;
	}
	.set-color {
		color: #4955f5;
	}
	.set-left-radius {
		border-top-left-radius: 50%;
		border-bottom-left-radius: 50%;
	}
	.set-right-radius {
		border-top-right-radius: 16px;
		border-bottom-right-radius: 16px;
	}
	.set-select-bgc {
		background: #e0e4f0;
	}
</style>
<div
	bind:this={navElement}
	class="h-screen {show
		? ''
		: '-translate-x-[260px]'}  w-[260px] fixed top-0 left-0 z-40 transition bg-[#0a0a0a] text-gray-200 text-sm set-new-bg
        "
	style="width:{show ? '18rem' : ''}"
>
	<div class="py-2.5 my-auto flex flex-col justify-between h-screen">
		<!--小c+-->
		<div class="px-2.5 flex justify-center space-x-2">
			<button
				class="flex-grow flex justify-between rounded-md px-3 py-1.5 mt-2 hover transition"
				on:click={async () => {
					// 获取最新列表
					!isMobile && getChatConversationsList();
					// messagesSend存在表示已有对话记录继续新对话应该重置临时记录
					$temporaryChat?.messagesSend && temporaryChat.set(null);
					const newId = $temporaryChat?.id || uuidv4();
					await chatId.set(newId);
					temporaryChat.set({
						id: newId,
						name: "新对话",
						isTemp: true
					});
					if (isMobile) {
						show = false;
					}
					goto("/");
				}}
			>
				<div class="flex self-center">
					<div class="self-center mr-3.5">
						<img src="/favicon.png" alt="favicon" class=" w-5 rounded-full" />
					</div>
					<div class=" self-center font-medium text-sm">小C+</div>
				</div>
			</button>
		</div>
		<!--新对话-->
		<div class="px-2.5 flex justify-center space-x-2">
			<button
				class="flex-grow flex justify-between rounded-md px-3 py-1.5 mt-2 hover:bg-gray-1000 transition set-bg-boder"
				on:click={async () => {
					// 获取最新列表
					!isMobile && getChatConversationsList();
					// 重置路由和ID
					// goto("/");
					// messagesSend存在表示已有对话记录继续新对话应该重置临时记录
					$temporaryChat?.messagesSend && temporaryChat.set(null);
					const newId = $temporaryChat?.id || uuidv4();
					await chatId.set(newId);
					// 设置临时会话
					temporaryChat.set({
						id: newId,
						name: "新对话",
						isTemp: true
					});
					goto("/");
					// tick();
					if (isMobile) {
						show = false;
					}
					// if (selectStatus.length > chatList.length) {
					// 	getChatConversationsList();
					// }
					// await chatId.set(uuidv4());
					// chatList.push({
					// 	id: uuidv4(),
					// 	inputs: {},
					// 	introduction: "",
					// 	name: "新对话",
					// 	status: "normal"
					// });
					// createNewChat();
				}}
			>
				<div class="flex self-center">
					<!-- <div class="self-center mr-3.5">
						<img src="/ollama.png" class=" w-5 rounded-full" />
					</div> -->

					<div class=" self-center font-medium text-sm set-color">新对话</div>
				</div>

				<div class="self-center set-color">
					<!-- <svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="w-4 h-4"
					>
						<path
							d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z"
						/>
						<path
							d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z"
						/>
					</svg> -->
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						class="w-4 h-4"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="12" y1="4" x2="12" y2="20" />
						<line x1="4" y1="12" x2="20" y2="12" />
					</svg>
				</div>
			</button>
		</div>
		<div class="px-2.5 mt-1 mb-2 flex justify-star">
			<!-- <input
				bind:this={importFileInputElement}
				bind:files={importFiles}
				type="file"
				hidden
			/> -->
			<!-- <button
				class=" rounded-md hover:bg-gray-1000 transition"
				on:click={() => {
					importFileInputElement.click();
					// importChats();
				}}
			>
				<div class=" self-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="w-5 h-5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
						/>
					</svg>
				</div>
				
			</button> -->
			<!-- <button
				class="  rounded-md hover:bg-gray-1000 transition"
				on:click={() => {
					exportChats();
				}}
			>
				<div class=" self-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="w-5 h-5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
						/>
					</svg>
				</div>
			</button> -->
			<!--删除-->
			<!-- {#if showDeleteHistoryConfirm}
				<div
					class="flex justify-between rounded-md items-center py-3 px-3.5 w-full transition"
				>
					<div class="flex items-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-5 h-5 mr-3"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
							/>
						</svg>
						<span>Are you sure?</span>
					</div>

					<div class="flex space-x-1.5 items-center">
						<button
							class="hover:text-customBlue transition"
							on:click={() => {
								deleteChatHistory();
								showDeleteHistoryConfirm = false;
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
									d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
									clip-rule="evenodd"
								/>
							</svg>
						</button>
						<button
							class="hover:text-customRed transition"
							on:click={() => {
								showDeleteHistoryConfirm = false;
							}}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								class="w-4 h-4"
							>
								<path
									d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
								/>
							</svg>
						</button>
					</div>
				</div>
			{:else}
				<button
					class=" rounded-md hover:bg-gray-1000 transition"
					on:click={() => {
						showDeleteHistoryConfirm = true;
					}}
				>
					<div class="mr-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-5 h-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
							/>
						</svg>
					</div>
				
				</button>
			{/if} -->
		</div>
		<!--搜索-->
		<div
			class="px-2.5 mt-1 mb-2 flex justify-center space-x-2 set-boder-radius"
		>
			<div class="flex w-full">
				<div
					class="self-center pl-3 py-2 rounded-l bg-gray-900 set-new-bg-gray set-left-radius"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="w-4 h-4"
					>
						<path
							fill-rule="evenodd"
							d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>

				<input
					class="w-full rounded-r py-1.5 pl-2.5 pr-4 text-sm text-gray-300 bg-gray-900 set-new-bg-gray outline-none set-right-radius"
					placeholder="搜索历史记录"
					bind:value={search}
				/>
			</div>
		</div>

		<div class="pl-2.5 my-2 flex-1 flex flex-col space-y-1 overflow-y-auto">
			<!--@ts-ignore-->
			{#each ($temporaryChat ? [$temporaryChat, ...$chats] : $chats).filter(// @ts-ignore
				chat => {
					if (search === "") {
						return true;
					} else {
						let title = chat.name.toLowerCase();

						if (title.includes(search)) {
							return true;
						} else {
							return false;
						}
					}
				}) as chat, i}
				<div
					class=" w-full pr-2 relative {(selectStatus[i]
						? selectStatus[i]
						: chat.isTemp) ||
					chat.id === conversationId ||
					chat.id === $chatId
						? 'set-select-bgc'
						: ''}"
					style="touch-action: pan-y;"
					role="group"
					use:swipe
					on:swiperight={() => handleSwipeRight()}
					on:swipeleft={() => handleSwipeLeft(chat.id)}
					on:mouseenter={() => handleMouseEnter(chat.id)}
					on:mouseleave={() => handleMouseLeave()}
				>
					<button
						class=" w-full flex justify-between rounded-md px-3 py-2 hover:bg-gray-1000 hover:900bg-gray- {chat.id
							? ''
							: 'bg-gray-1050'} transition whitespace-nowrap text-ellipsis"
						on:click={() => {
							selectStatus = [];
							selectStatus.length = $chats.length + ($temporaryChat ? 1 : 0);
							// goto(`/c/${chat.id}`);
							// 重新切换到新对话，显示选中背景色
							if (chat.id === $temporaryChat?.id) {
								chatId.set(chat.id || $temporaryChat?.id);
								temporaryChat.set({
									isTemp: true,
									name: "新对话",
									id: $temporaryChat?.id
								});
								// tick();
							}
							if (chat.id !== chatTitleEditId) {
								chatTitleEditId = "";
								chatTitle = "";
							}
							if (chat.id && !chatTitleEditId) {
								if (chat.isTemp) {
									// temporaryChat.set({
									// 	isTemp: true,
									// 	name: "新对话",
									// 	id: $temporaryChat?.id
									// });
									chatId.set($temporaryChat?.id);
									goto("/");
									selectStatus[i] = true;
								} else {
									selectStatus[i] = true;
									if ($temporaryChat?.messagesSend) {
										getChatConversationsList();
										temporaryChat.set(null);
									} else if ($temporaryChat?.id) {
										// 有新对话但是没开始会话就切换其它对话记录，不显示选中标签色
										temporaryChat.set({
											isTemp: false,
											name: "新对话",
											id: $temporaryChat?.id
										});
									}
									// $temporaryChat?.id &&
									// 	temporaryChat.set({
									// 		isTemp: false,
									// 		name: "新对话",
									// 		id: $temporaryChat?.id
									// 	});
									chatId.set(chat.id);
									loadChat(chat.id, i);
								}
							}
						}}
					>
						<div class=" flex self-center flex-1">
							<div class=" self-center mr-3">
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
										d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
									/>
								</svg>
							</div>
							<div
								class=" text-left self-center overflow-hidden {chat.id
									? 'w-[180px]'
									: 'w-[120px]'} "
								style="width: 10.5rem;"
							>
								{#if chatTitleEditId === chat.id}
									<input
										bind:value={chatTitle}
										class=" bg-transparent w-full"
									/>
								{:else}
									<span class="truncate">{chat.name}</span>
								{/if}
							</div>
						</div>
					</button>

					{#if chat.id === $chatId || swipedItemId === chat.id || hoveredItemId === chat.id}
						<div class=" absolute right-[22px] top-[10px]">
							{#if chatTitleEditId === chat.id}
								<div class="flex self-center space-x-1.5">
									<button
										class=" self-center hover:text-customBlue transition"
										use:tooltip={"确认"}
										on:click={() => {
											editChatTitle(chat.id, chatTitle);
											chatTitleEditId = "";
											chat.name = "";
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
												d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
									<button
										class=" self-center hover:text-customRed transition"
										use:tooltip={"取消"}
										on:click={() => {
											chatTitleEditId = "";
											chatTitle = "";
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											class="w-4 h-4"
										>
											<path
												d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
											/>
										</svg>
									</button>
								</div>
							{:else if chatDeleteId === chat.id}
								<div class="flex self-center space-x-1.5">
									<button
										class=" self-center hover:text-customBlue transition"
										use:tooltip={"确认"}
										on:click={() => {
											deleteChat(chat.id);
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
												d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
												clip-rule="evenodd"
											/>
										</svg>
									</button>
									<button
										class=" self-center hover:text-customRed transition"
										use:tooltip={"取消"}
										on:click={() => {
											chatDeleteId = "";
										}}
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 20 20"
											fill="currentColor"
											class="w-4 h-4"
										>
											<path
												d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
											/>
										</svg>
									</button>
								</div>
							{:else}
								<div class="flex self-center space-x-1.5">
									<button
										class=" self-center hover:text-customBlue transition"
										use:tooltip={"重命名"}
										on:click={() => {
											chatTitle = chat.name;
											chatTitleEditId = chat.id;
											// swipedItemId = "";
											// editChatTitle(chat.id, 'a');
										}}
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
										class=" self-center hover:text-customRed transition"
										use:tooltip={"删除对话"}
										on:click={() => {
											chatDeleteId = chat.id;
											// swipedItemId = "";
										}}
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
												d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
											/>
										</svg>
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<!--用户-->
		<div class="px-2.5 flex justify-center space-x-2">
			<div
				class="flex-grow flex justify-between rounded-md px-3 py-1.5 hover transition"
			>
				<div class="flex self-center">
					<div class="self-center mr-3.5">
						<!-- <img src="/favicon.png" alt="favicon" class=" w-5 rounded-full" /> -->
						<img
							src="/user.png"
							class=" max-w-[28px] object-cover rounded-full"
							alt="User profile"
							draggable="false"
						/>
					</div>

					<div class=" self-center font-medium text-sm">
						{#if userNames}
							<span>
								{userNames}
							</span>
						{:else}
							<button
								class="flex-grow flex justify-between rounded-md px-3 py-1.5 mt-2 hover transition"
								on:click={async () => {
									await goto(redirectUrl);
								}}>请登录</button
							>
							<!-- <span class=" text-gray-500 text-sm font-medium"
									>{message.model ? ` ${message.model}` : ""}</span
								> -->
						{/if}
					</div>
				</div>
			</div>
			{#if show && isMobile}
				{#if showLongOutbtn}
					<div
						class="fixed h-8 flex leading-loose rounded-md items-center px-3.5 transition"
						style="bottom: 3.5rem;left:7rem"
					>
						<div class="flex items-center">
							<span>是否确定退出？</span>
						</div>

						<div class="flex space-x-1.5 items-center">
							<button
								class="hover:text-customBlue transition"
								on:click={() => {
									showLongOutbtn = false;
									goLogOut();
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
										d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
							<button
								class="hover:text-customRed transition"
								on:click={() => {
									showLongOutbtn = false;
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									class="w-4 h-4"
								>
									<path
										d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
									/>
								</svg>
							</button>
						</div>
					</div>
				{/if}
				<button
					class="hover:text-white transition self-center"
					on:click={() => {
						showLongOutbtn = true;
					}}
					bind:this={username}
					><svg
						class="icon self-center"
						viewBox="0 0 1024 1024"
						version="1.1"
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						><path
							d="M585.142857 914.285714H219.428571c-58.514286 0-109.714286-51.2-109.714285-109.714285V219.428571c0-58.514286 51.2-109.714286 109.714285-109.714285h365.714286c58.514286 0 109.714286 51.2 109.714286 109.714285v73.142858c0 21.942857-14.628571 36.571429-36.571429 36.571428s-36.571429-14.628571-36.571428-36.571428V219.428571c0-21.942857-14.628571-36.571429-36.571429-36.571428H219.428571c-21.942857 0-36.571429 14.628571-36.571428 36.571428v585.142858c0 21.942857 14.628571 36.571429 36.571428 36.571428h365.714286c21.942857 0 36.571429-14.628571 36.571429-36.571428v-73.142858c0-21.942857 14.628571-36.571429 36.571428-36.571428s36.571429 14.628571 36.571429 36.571428v73.142858c0 58.514286-51.2 109.714286-109.714286 109.714285z"
							fill="#1B78F4"
						/><path
							d="M804.571429 650.971429c-7.314286 0-21.942857 0-29.257143-7.314286-14.628571-14.628571-14.628571-36.571429 0-51.2L855.771429 512l-80.457143-80.457143c-14.628571-14.628571-14.628571-36.571429 0-51.2s36.571429-14.628571 51.2 0l102.4 102.4c14.628571 14.628571 14.628571 36.571429 0 51.2l-102.4 102.4c0 14.628571-14.628571 14.628571-21.942857 14.628572z"
							fill="#1B78F4"
						/><path
							d="M877.714286 548.571429H512c-21.942857 0-36.571429-14.628571-36.571429-36.571429s14.628571-36.571429 36.571429-36.571429h365.714286c21.942857 0 36.571429 14.628571 36.571428 36.571429s-14.628571 36.571429-36.571428 36.571429z"
							fill="#1B78F4"
						/></svg
					></button
				>
			{/if}
		</div>
		<!-- <div class="px-2.5">
			<hr class=" border-gray-800 mb-2 w-full" />

			<div class="flex flex-col">
				<div class="flex">
					<input
						bind:this={importFileInputElement}
						bind:files={importFiles}
						type="file"
						hidden
					/>
					<button
						class=" flex rounded-md py-3 px-3.5 w-full hover:bg-gray-900 transition"
						on:click={() => {
							importFileInputElement.click();
							// importChats();
						}}
					>
						<div class=" self-center mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-5 h-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
								/>
							</svg>
						</div>
						<div class=" self-center">Import</div>
					</button>
					<button
						class=" flex rounded-md py-3 px-3.5 w-full hover:bg-gray-900 transition"
						on:click={() => {
							exportChats();
						}}
					>
						<div class=" self-center mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-5 h-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
								/>
							</svg>
						</div>
						<div class=" self-center">Export</div>
					</button>
				</div>
				{#if showDeleteHistoryConfirm}
					<div
						class="flex justify-between rounded-md items-center py-3 px-3.5 w-full transition"
					>
						<div class="flex items-center">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-5 h-5 mr-3"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
								/>
							</svg>
							<span>Are you sure?</span>
						</div>

						<div class="flex space-x-1.5 items-center">
							<button
								class="hover:text-white transition"
								on:click={() => {
									deleteChatHistory();
									showDeleteHistoryConfirm = false;
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
										d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
							<button
								class="hover:text-white transition"
								on:click={() => {
									showDeleteHistoryConfirm = false;
								}}
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									class="w-4 h-4"
								>
									<path
										d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
									/>
								</svg>
							</button>
						</div>
					</div>
				{:else}
					<button
						class=" flex rounded-md py-3 px-3.5 w-full hover:bg-gray-900 transition"
						on:click={() => {
							showDeleteHistoryConfirm = true;
						}}
					>
						<div class="mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="w-5 h-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
								/>
							</svg>
						</div>
						<span>Clear conversations</span>
					</button>
				{/if}
				<button
					class=" flex rounded-md py-3 px-3.5 w-full hover:bg-gray-900 transition"
					on:click={async () => {
						await showSettings.set(true);
					}}
				>
					<div class=" self-center mr-3">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="w-5 h-5"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					</div>
					<div class=" self-center font-medium">Settings</div>
				</button>
			</div>
		</div> -->
	</div>

	<div
		class="fixed left-0 top-[50dvh] z-40 -translate-y-1/2 transition-transform translate-x-[255px] md:translate-x-[260px] rotate-0"
	>
		<button
			class=" group"
			on:click={() => {
				show = !show;
				// show = show
			}}
			><span class="" data-state="closed"
				><div
					class="flex h-[72px] w-8 items-center justify-center opacity-20 group-hover:opacity-100 transition"
				>
					<div class="flex h-6 w-6 flex-col items-center">
						<div
							class="h-3 w-1 rounded-full bg-[#0f0f0f] dark:bg-white rotate-0 translate-y-[0.15rem] {show
								? 'group-hover:rotate-[15deg]'
								: 'group-hover:rotate-[-15deg]'}"
						/>
						<div
							class="h-3 w-1 rounded-full bg-[#0f0f0f] dark:bg-white rotate-0 translate-y-[-0.15rem] {show
								? 'group-hover:rotate-[-15deg]'
								: 'group-hover:rotate-[15deg]'}"
						/>
					</div>
				</div>
			</span>
		</button>
	</div>
</div>
