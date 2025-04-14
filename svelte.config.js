/*
 * @Author: 罗文涛 luo_wt@hisuntech.com
 * @Date: 2025-02-27 16:42:09
 * @LastEditors: 罗文涛 luo_wt@hisuntech.com
 * @LastEditTime: 2025-02-27 17:03:37
 * @FilePath: \foundesrcPro\ollama-webui\svelte.config.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/kit/vite";

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			pages: "build",
			assets: "build",
			fallback: "index.html"
		})
	}
};

export default config;
