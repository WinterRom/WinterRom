/*
 * @Author: 罗文涛 luo_wt@hisuntech.com
 * @Date: 2025-02-07 09:02:10
 * @LastEditors: your name
 * @LastEditTime: 2026-01-16 17:10:10
 * @FilePath: \foundesrc\itc_ai_self_ui\vite.config.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
const devServerPort = 9539;
// const BASE_URL = import.meta.env.VITE_API_BASE;
export default defineConfig({
	plugins: [sveltekit()],
	build: {
		sourcemap: false // 禁用.map文件生成‌:ml-citation{ref="1,3" data="citationList"}
	},
	server: {
		port: devServerPort,
		// open: true,
		// overlay: {
		// 	warnings: false,
		// 	errors: true
		// },
		// progress: false,
		proxy: {
			["/api"]: {
				target: `http://localhost:50207`,
			
				changeOrigin: true, // needed for virtual hosted sites
				ws: true, // proxy websockets
				rewrite: path => path.replace(/^\/api/, "")
			}
		}
	}
});
