<script lang="ts">
	import { uploadFile } from "$lib/api/chat"; // 引入上传接口
	import toast from "svelte-french-toast";
	export let submitPrompt: Function;
	export let stopResponse: Function;
	export let autoScroll = true;
	export let prompt = "";
	export let messages: any = [];
	export let isMobile: boolean;
	export let stopChatTaskId: any = "";
	let importFileInputElement: any;
	let importFiles: any;
	//存储已上传成功的文件信息（用于预览和发送）
	let selectedFiles: any[] = [];
	let isUploading = false;
	// 删除预览图片
	const removeFile = (index: number) => {
		selectedFiles = selectedFiles.filter((_, i) => i !== index);
	};
	// 监听文件选择，一旦选择立即上传
	$: if (importFiles && importFiles.length > 0) {
		const file = importFiles[0];
		if (importFiles.length > 1) {
			importFiles.splice(importFiles.length - 1, 1);
			toast.error("只能上传一张图片，请先删除已有图片");
		}
		handleUpload(file);
		importFileInputElement.value = "";
	}
	const handleUpload = async (file: File) => {
		if (selectedFiles.length > 1) {
			toast.error("只能上传一张图片，请先删除已有图片");
			return;
		}
		isUploading = true;
		const loadingId = toast.loading("正在上传...");
		//  1. 生成本地预览链接，实现“秒开”效果
		const localUrl = URL.createObjectURL(file);
		// const tempId = Date.now().toString(); // 生成临时ID用于后续定位更新
		// 2. 立即将文件加入列表显示
		// const newFile = {
		// 	type: "image",
		// 	name: file.name,
		// 	url: localUrl, // 使用本地 Blob URL
		// 	uploading: true, // 标记正在上传
		// 	tempId: tempId // 临时ID
		// };
		// selectedFiles = [...selectedFiles, newFile];
		try {
			const res: any = await uploadFile(file);
			// 假设接口返回结构中包含 url (例如 res.data.url 或 res.url)
			// 请根据实际后端返回调整
			const fileData = res.data;
			console.log("res-file", res);

			if (fileData.id) {
				selectedFiles = [
					...selectedFiles,
					{
						type: "image",
						name: fileData.name,
						url: localUrl,
						// 如果后端返回了 id，也可以存入
						id: fileData.id
					}
				];
				toast.success("上传成功", { id: loadingId });
			} else {
				throw new Error("返回数据缺少 URL");
			}
		} catch (error) {
			toast.error("上传失败", { id: loadingId });
		} finally {
			isUploading = false;
		}
	};
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
			submitPrompt(prompt, selectedFiles);
			selectedFiles = [];
		}
	}
	function InputEvent(e: any) {
		// console.log("InputEvent", e);

		if (e.target) {
			e.target.style.height = "";
			e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
		}
	}
	const submitHandler = () => {
		if (isUploading) return;
		// 将 prompt 和 selectedFiles 一起传递
		submitPrompt(prompt, selectedFiles);
		// 发送后清空已选文件
		selectedFiles = [];
	};
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
		/* width: calc(68% + 4px); */
		width: inherit;
	}
	.set-no-padding {
		padding: 0;
	}
	.set-mobile {
		width: 96%;
		margin: 0 2%;
	}
	.set-new-bottom {
		bottom: 34px;
	}
	.set-new-chat {
		width: 100%;
	}
</style>
<div
	class=" {messages.length > 0
		? 'fixed set-new-bottom '
		: isMobile
		? ''
		: 'set-new-chat'} set-padding-right {isMobile
		? 'set-mobile'
		: 'content-right'}"
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
						// selectedFiles = [];
						// submitPrompt(prompt);
						submitHandler();
					}}
				>
					<div class="">
						{#if selectedFiles.length > 0}
							<div class="mx-2 mt-2 mb-2 flex flex-wrap gap-2">
								{#each selectedFiles as file, index}
									<div class="relative group">
										<img
											src={file.url}
											alt={file.name}
											class="h-16 w-16 object-cover rounded-md border border-gray-200 dark:border-gray-600"
										/>
										<button
											class="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-xs shadow-sm hover:bg-red-600 cursor-pointer"
											on:click={() => removeFile(index)}
											type="button"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												viewBox="0 0 20 20"
												fill="currentColor"
												class="w-3 h-3"
											>
												<path
													d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
												/>
											</svg>
										</button>
									</div>
								{/each}
							</div>
						{/if}
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
							{#if !stopChatTaskId || messages.length == 0}
								<button
									type="button"
									class="bg-white hover:bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-800 transition rounded-lg p-1 mr-0.5 w-7 h-7 self-center"
									on:click={() => {
										if (selectedFiles.length >= 1) {
											toast("只能上传一张图片，请先删除已有图片");
											return;
										}
										importFileInputElement.click();
									}}
									title="上传图片"
									disabled={isUploading}
								>
									<svg
										width="20"
										height="20"
										viewBox="0 0 20 20"
										fill="none"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M1.85278 4.81463C1.85278 3.58733 2.84771 2.59241 4.07501 2.59241H15.9269C17.1542 2.59241 18.1491 3.58733 18.1491 4.81463V15.185C18.1491 16.4123 17.1542 17.4072 15.9269 17.4072H4.075C2.8477 17.4072 1.85278 16.4123 1.85278 15.185V4.81463Z"
											stroke="currentColor"
											stroke-width="1.6"
										/>
										<circle
											cx="13.7136"
											cy="7.14282"
											r="2.1"
											fill="currentColor"
											stroke="white"
											stroke-width="0.8"
										/>
										<path
											d="M1.85278 14.2326L5.08504 9.72923C5.81909 8.70649 7.25533 8.49716 8.25077 9.26783L17.5001 16.4286"
											stroke="currentColor"
											stroke-width="1.6"
										/>
									</svg>
									<!-- 上传文件图标<svg
										viewBox="0 0 24 24"
										xmlns="http://www.w3.org/2000/svg"
										width="24"
										height="24"
										fill="currentColor"
										class="remixicon h-5 w-5"
										><path
											d="M14 13.5V8C14 5.79086 12.2091 4 10 4C7.79086 4 6 5.79086 6 8V13.5C6 17.0899 8.91015 20 12.5 20C16.0899 20 19 17.0899 19 13.5V4H21V13.5C21 18.1944 17.1944 22 12.5 22C7.80558 22 4 18.1944 4 13.5V8C4 4.68629 6.68629 2 10 2C13.3137 2 16 4.68629 16 8V13.5C16 15.433 14.433 17 12.5 17C10.567 17 9 15.433 9 13.5V8H11V13.5C11 14.3284 11.6716 15 12.5 15C13.3284 15 14 14.3284 14 13.5Z"
										/></svg 
									>-->
								</button>
								<input
									type="file"
									bind:this={importFileInputElement}
									class="hidden"
									bind:files={importFiles}
									accept="image/*"
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
									disabled={!stopChatTaskId}
									title={!stopChatTaskId ? "正在建立连接" : "停止生成"}
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
