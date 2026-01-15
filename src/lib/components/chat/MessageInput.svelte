<script lang="ts">
	export let submitPrompt: Function;
	export let stopResponse: Function;

	export let autoScroll = true;

	export let prompt = "";
	export let messages: any = [];
	export let isMobile: boolean;
	let importFileInputElement: any;
	let importFiles: any;
	import toast from "svelte-french-toast";
	$: if (importFiles) {
		const formData = new FormData();
		formData.append("file", importFiles[0]);
		formData.append("prompt", prompt); // 将当前输入框内容也一起上传

		// 显示上传状态
		toast.loading("正在上传文件...");

		try {
			// const response = await fetch("/api/upload", {
			// 	method: "POST",
			// 	body: formData
			// });
			// if (response.ok) {
			// 	const result = await response.json();
			// 	toast.success("文件上传成功");
			// 	// 将文件内容自动填充到输入框
			// 	prompt = result.text || prompt;
			// } else {
			// 	throw new Error("上传失败");
			// }
		} catch (error) {
			console.error("上传错误:", error);
			toast.error("文件上传失败");
		}
	}
	// const importChats = async (chatHistory) => {
	// 	await $db.addChats(chatHistory);
	// };
	function keyBoardDown(e: any) {
		// console.log("keyBoardDown", e.keyCode);
		if (e.keyCode == 13 && !e.shiftKey) {
			e.preventDefault();
		}
		if (prompt !== "" && e.keyCode == 13 && !e.shiftKey) {
			messages.at(-1).done == true;
			submitPrompt(prompt);
		}
	}
	function InputEvent(e: any) {
		// console.log("InputEvent", e);

		if (e.target) {
			e.target.style.height = "";
			e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
		}
	}
</script>
<style>
	.set-new-bg {
		background-color: #f4f6fc;
		/* padding-top: 20px; */
	}
	/* .max-w-3xl {
		max-width: 49rem !important;
	} */
	.content-right {
		/* width: var(--main-width);
		max-width: 59%; */
		/* background-color: #000; */
		background-color: #f4f6fc;
		width: 63%;
	}
	.set-no-padding {
		padding: 0;
	}
	.set-mobile {
		width: 96%;
		margin: 0 2%;
	}
	.set-new-bottom {
		bottom: 32px;
	}
</style>
<div
	class=" {messages.length > 0
		? 'fixed set-new-bottom'
		: ''} set-padding-right {isMobile ? 'set-mobile' : 'content-right'}"
>
	<div
		class="px-2.5 pt-2.5 set-no-padding -mb-0.5 mx-auto inset-x-0 bg-transparent flex justify-center"
	>
		{#if autoScroll === false && messages.length > 0}
			<div class=" flex justify-center mb-4">
				<button
					class=" bg-white border border-gray-100 dark:border-none dark:bg-white/20 p-1.5 rounded-full"
					on:click={() => {
						autoScroll = true;
						window.scrollTo({
							top: document.body.scrollHeight,
							behavior: "smooth"
						});
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						class="w-5 h-5"
					>
						<path
							fill-rule="evenodd"
							d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>
		{/if}
	</div>
	<div class="bg-white dark:bg-gray-800 set-new-bg">
		<div class=" set-no-padding px-2.5 -mb-0.5 mx-auto inset-x-0">
			<div class="bg-gradient-to-t dark:from-gray-800 from-40% pb-2">
				<form
					class=" flex flex-col relative rounded-xl border dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-gray-100"
					on:submit|preventDefault={() => {
						submitPrompt(prompt);
					}}
				>
					<div class="">
						<textarea
							id="chat-textarea"
							class=" dark:bg-gray-800 dark:text-gray-100 outline-none w-full py-3 px-2 pl-4 rounded-xl resize-none"
							placeholder="小C+，您的智能助手！快开始和我的聊天吧！"
							bind:value={prompt}
							on:keypress={e => keyBoardDown(e)}
							rows="3"
							on:input={e => InputEvent(e)}
						/>

						<div class="self-end mb-2 flex justify-end space-x-0.5 mr-2">
							{#if messages.length == 0 || messages.at(-1).done == true}
								<button
									type="button"
									class="bg-white hover:bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-800 transition rounded-lg p-1 mr-0.5 w-7 h-7 self-center"
									on:click={() => importFileInputElement.click()}
									title="上传文件"
								>
									<svg
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										fill="currentColor"
										class="remixicon h-5 w-5"
										><path
											d="M14 13.5V8C14 5.79086 12.2091 4 10 4C7.79086 4 6 5.79086 6 8V13.5C6 17.0899 8.91015 20 12.5 20C16.0899 20 19 17.0899 19 13.5V4H21V13.5C21 18.1944 17.1944 22 12.5 22C7.80558 22 4 18.1944 4 13.5V8C4 4.68629 6.68629 2 10 2C13.3137 2 16 4.68629 16 8V13.5C16 15.433 14.433 17 12.5 17C10.567 17 9 15.433 9 13.5V8H11V13.5C11 14.3284 11.6716 15 12.5 15C13.3284 15 14 14.3284 14 13.5Z"
										/></svg
									>
									<!-- <svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="w-5 h-5"
									>
										<path
											fill-rule="evenodd"
											d="M11.47 2.47a.75.75 0 011.06 0l4.5 4.5a.75.75 0 01-1.06 1.06l-3.22-3.22V16.5a.75.75 0 01-1.5 0V4.81L8.03 8.03a.75.75 0 01-1.06-1.06l4.5-4.5zM3 15.75a.75.75 0 01.75.75v2.25a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V16.5a.75.75 0 011.5 0v2.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V16.5a.75.75 0 01.75-.75z"
											clip-rule="evenodd"
										/>
									</svg> -->
								</button>
								<input
									type="file"
									bind:this={importFileInputElement}
									class="hidden"
									bind:files={importFiles}
									accept=".txt,.pdf,.doc,.docx,.xls,.xlsx"
								/>
								<button
									class="{prompt !== ''
										? 'bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100 '
										: 'text-white bg-gray-100 dark:text-gray-800 dark:bg-gray-600 disabled'} transition rounded-lg p-1 mr-0.5 w-7 h-7 self-center"
									type="submit"
									disabled={prompt === ""}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
										class="w-5 h-5"
									>
										<path
											fill-rule="evenodd"
											d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							{:else}
								<button
									class="bg-white hover:bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-800 transition rounded-lg p-1.5"
									on:click={() => stopResponse()}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										fill="currentColor"
										class="w-5 h-5"
									>
										<path
											fill-rule="evenodd"
											d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm6-2.438c0-.724.588-1.312 1.313-1.312h4.874c.725 0 1.313.588 1.313 1.313v4.874c0 .725-.588 1.313-1.313 1.313H9.564a1.312 1.312 0 01-1.313-1.313V9.564z"
											clip-rule="evenodd"
										/>
									</svg>
								</button>
							{/if}
						</div>
					</div>
				</form>

				<!-- <div class="mt-1.5 text-xs text-gray-500 text-center">
					LLMs can make mistakes. Verify important information.
				</div> -->
			</div>
		</div>
	</div>
</div>
