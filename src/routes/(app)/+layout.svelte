<script lang="ts">
	import { v4 as uuidv4 } from "uuid";
	import { openDB, deleteDB } from "idb";
	import { onMount, tick } from "svelte";
	import { goto } from "$app/navigation";
	import { getInfo, getInfos } from "$lib/api/user";
	import {
		info,
		showSettings,
		settings,
		models,
		db,
		chats,
		chatId,
		userInfor,
		userName
	} from "$lib/stores";
	// import { getUserInfoFromToken } from "$lib/api/api";
	import { getToken, setToken, removeToken } from "$lib/utils/cookie";
	import SettingsModal from "$lib/components/chat/SettingsModal.svelte";
	import Sidebar from "$lib/components/layout/Sidebar.svelte";
	import toast from "svelte-french-toast";
	import { OLLAMA_API_BASE_URL } from "$lib/constants";
	import tools from "$lib/utils/tools";
	import { thirdLogin } from "$lib/stores/permission";
	import { get } from "svelte/store";
	const redirectUrl: any = import.meta.env.VITE_APP_SSO_REDIRECT_URL;
	let requiredOllamaVersion = "0.1.16";
	let loaded = false;
	let tokens: any = "";
	onMount(async () => {
		// if (import.meta.env.MODE === "development") {
		// }
		// console.log("import.meta.env", import.meta.env);

		// debugger;
		await settings.set(JSON.parse(localStorage.getItem("settings") ?? "{}"));
		let _db = await getDB();
		await db.set(_db);
		// await setOllamaVersion(await getOllamaVersion());
		await tick();
		const params = tools.parseUrl(window.top?.location.search || "");
		const { token, code, redirect } = params;
		// console.log("get", getToken());
		// console.log("token", token);
		// debugger;
		await thirdLogin(token || code);
		if (token || getToken()) {
			loaded = true;
		}

		// console.log("get", get(userName));
		// debugger;
	});
	const getDB = async () => {
		const DB = await openDB("Chats", 1, {
			upgrade(db) {
				const store = db.createObjectStore("chats", {
					keyPath: "id",
					autoIncrement: true
				});
				store.createIndex("timestamp", "timestamp");
			}
		});

		return {
			db: DB,
			getChatById: async function (id: any) {
				return await this.db.get("chats", id);
			},
			getChats: async function () {
				let chats = await this.db.getAllFromIndex("chats", "timestamp");
				chats = chats.map((item, idx) => ({
					title: chats[chats.length - 1 - idx].title,
					id: chats[chats.length - 1 - idx].id
				}));
				return chats;
			},
			exportChats: async function () {
				let chats = await this.db.getAllFromIndex("chats", "timestamp");
				chats = chats.map((item, idx) => chats[chats.length - 1 - idx]);
				return chats;
			},
			addChats: async function (_chats: any) {
				for (const chat of _chats) {
					console.log(chat);
					await this.addChat(chat);
				}
				await chats.set(await this.getChats());
			},
			addChat: async function (chat: any) {
				await this.db.put("chats", {
					...chat
				});
			},
			createNewChat: async function (chat: any) {
				await this.addChat({ ...chat, timestamp: Date.now() });
				await chats.set(await this.getChats());
			},
			updateChatById: async function (id: any, updated: any) {
				const chat = await this.getChatById(id);

				await this.db.put("chats", {
					...chat,
					...updated,
					timestamp: Date.now()
				});

				await chats.set(await this.getChats());
			},
			deleteChatById: async function (id: any) {
				if ($chatId === id) {
					goto("/");
					await chatId.set(uuidv4());
				}
				await this.db.delete("chats", id);
				await chats.set(await this.getChats());
			},
			deleteAllChat: async function () {
				const tx = this.db.transaction("chats", "readwrite");
				await Promise.all([tx.store.clear(), tx.done]);

				await chats.set(await this.getChats());
			}
		};
	};

	// const getOllamaVersion = async () => {
	// 	const res = await fetch(
	// 		`${$settings?.API_BASE_URL ?? OLLAMA_API_BASE_URL}/version`,
	// 		{
	// 			method: "GET",
	// 			headers: {
	// 				Accept: "application/json",
	// 				"Content-Type": "application/json"
	// 			}
	// 		}
	// 	)
	// 		.then(async res => {
	// 			if (!res.ok) throw await res.json();
	// 			return res.json();
	// 		})
	// 		.catch(error => {
	// 			console.log(error);
	// 			if ("detail" in error) {
	// 				toast.error(error.detail);
	// 			} else {
	// 				toast.error("Server connection failed");
	// 			}
	// 			return null;
	// 		});

	// 	console.log(res);

	// 	return res?.version ?? "0";
	// };

	const setOllamaVersion = async (ollamaVersion: any) => {
		await info.set({ ...$info, ollama: { version: ollamaVersion } });

		if (
			ollamaVersion.localeCompare(requiredOllamaVersion, undefined, {
				numeric: true,
				sensitivity: "case",
				caseFirst: "upper"
			}) < 0
		) {
			toast.error(`Ollama Version: ${ollamaVersion}`);
		}
	};

	// onMount(async () => {

	// });
</script>
<style>
	.bgcolor {
		background-color: #f4f6fc;
	}
</style>
{#if loaded}
	<div class="app relative">
		{#if !$userName}
			<div class="absolute w-full h-full flex z-50">
				<div
					class="absolute rounded-xl w-full h-full backdrop-blur bg-gray-900/60 flex justify-center"
				>
					<div class="m-auto pb-44 flex flex-col justify-center">
						<div class="max-w-md">
							<div
								class="text-center dark:text-white text-2xl font-medium z-50"
							>
								登录失败
							</div>

							<div class=" mt-4 text-center text-sm dark:text-gray-200 w-full">
								无法连接到服务器<br
									class=" hidden sm:flex"
								/>请检查网络是否已连接
								<br class=" hidden sm:flex" />
							</div>

							<div class=" mt-6 mx-auto relative group w-fit">
								<button
									class="relative z-20 flex px-5 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition font-medium text-sm"
									on:click={async () => {
										// await setOllamaVersion(await getOllamaVersion());
									}}
								>
									重新登陆
								</button>

								<button
									class="text-xs text-center w-full mt-2 text-gray-400 underline"
									on:click={async () => {
										await goto(redirectUrl);
									}}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<div
			class=" text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-800 min-h-screen overflow-auto flex flex-row bgcolor"
		>
			<!-- <Sidebar /> -->

			<!-- <SettingsModal bind:show={$showSettings} /> -->

			<slot />
		</div>
	</div>
{/if}
