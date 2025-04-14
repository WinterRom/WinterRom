<script lang="ts">
	import { v4 as uuidv4 } from "uuid";
	import { logout } from "$lib/api/user";
	import { goto } from "$app/navigation";
	import { chatId, db } from "$lib/stores";
	import { get } from "svelte/store";
	import { userInfor, userName } from "$lib/stores";
	import { onMount } from "svelte";
	import { getToken, setToken, removeToken } from "$lib/utils/cookie";
	import tippy from "tippy.js";
	const redirectUrl: any = import.meta.env.VITE_API_REDIRECT_URL;
	export let title: string = "新小C";
	let showLongOutbtn: boolean = false;
	let userNames: string = "";
	let username: HTMLElement;
	let newChat: HTMLElement;
	onMount(() => {
		tippy(username, {
			content: "退出登录"
			// 其他Tippy选项...
		});
		tippy(newChat, {
			content: "新对话"
			// 其他Tippy选项...
		});
		// return () => {
		// 	tooltip.destroy();
		// }; // 清理函数，确保组件销毁时销毁tooltip
	});
	console.log("get(userName)", get(userName));
	$: if ($userName) {
		userNames = get(userName);
	}
	const goLogOut = async () => {
		await logout();
		removeToken();
		goto(redirectUrl);
	};
</script>
<style>
	.content-right {
		/* width: var(--main-width); */
		/* max-width: 59%; */
		/* background-color: #000; */
		background-color: #f4f6fc;
		/* padding: 0 6%; */
		width: 84%;
	}
</style>
<nav
	id="nav"
	class="content-right w-full flex flex-row justify-center bg-white/95 dark:bg-gray-800/90 dark:text-gray-200 backdrop-blur-xl z-30"
>
	<div class=" flex w-full mx-auto justify-between">
		<div class="flex">
			<div class="pr-2 self-center">
				<button
					class=" cursor-pointer p-1 flex dark:hover:bg-gray-700 rounded-lg transition"
					on:click={async () => {
						console.log("newChat");
						goto("/");
						await chatId.set(uuidv4());
					}}
				>
					<div bind:this={newChat} class=" m-auto self-center">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="w-5 h-5"
						>
							<path
								d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z"
							/>
							<path
								d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z"
							/>
						</svg>
					</div>
					<div
						class=" flex-1 ml-2 self-center font-medium text-ellipsis whitespace-nowrap overflow-hidden"
					>
						{title != "" ? title : "新小C"}
					</div>
				</button>
			</div>
		</div>
		<div class="self-center flex relative">
			<span class="mr-2 cursor-pointer" id="username">{userNames}</span>

			{#if showLongOutbtn}
				<div
					class="absolute flex w-48 top-3 right-0 rounded-md items-center py-3 px-3.5 transition"
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
		</div>
	</div>
</nav>
