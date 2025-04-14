/*
 * @Author: 罗文涛 luo_wt@hisuntech.com
 * @Date: 2025-02-26 16:17:53
 * @LastEditors: 罗文涛 luo_wt@hisuntech.com
 * @LastEditTime: 2025-03-19 14:08:28
 * @FilePath: \foundesrcPro\ollama-webui\src\lib\api\request.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// import { browser } from "$app/environment";
import axios from "axios";
// @ts-ignore
import { goto } from "$app/navigation";
import toast from "svelte-french-toast"; // 轻量提示库
// import { user } from "$lib/stores/auth"; // 用户状态库
// import { setToken } from "$lib/stores";
const BASE_URL = import.meta.env.VITE_API_BASE;
import { getToken, setToken, removeToken } from "$lib/utils/cookie";
import { logout } from "$lib/api/user";
const redirectUrl: any = import.meta.env.VITE_API_REDIRECT_URL;

// 创建核心请求实例
const service = axios.create({
	baseURL: BASE_URL,
	timeout: 20000
});

// Request interceptors
service.interceptors.request.use(
	config => {
		// Add X-Access-Token header to every request, you can add other custom headers here
		if (getToken()) {
			config.headers["X-Token"] = getToken();
		}
		return config;
	},
	error => {
		Promise.reject(error);
	}
);

// Response interceptors
service.interceptors.response.use(
	response => {
		// Some example codes here:
		// code == 000000: success
		// code == 50001: invalid access token
		// code == 50002: already login in other place
		// code == 50003: access token expired
		// code == 50004: invalid user (user not exist)
		// code == 50005: username or password is incorrect
		// You can change this part for your own usage.
		// debugger;
		const res = response.data;
		console.log("response", response);
		const contentType = response.headers["content-type"];
		if (contentType.includes("stream")) {
			return response.data; // 不处理流数据
		}
		if (res.code !== "000000") {
			// toast.error(res.message || "Error+1");
			// Message({
			//   message: res.message || 'Error',
			//   type: 'error',
			//   duration: 5 * 1000
			// })
			if (
				res.code === 50008 ||
				res.code === 50012 ||
				res.code === 50014 ||
				res.code === "000104"
			) {
				// debugger;
				// debugger;
				toast.error(res.message || "Error");
				reset();

				// goto(redirectUrl);
				//   MessageBox.confirm('You have been logged out, try to login again.', 'Log out', {
				// 	confirmButtonText: 'Relogin',
				// 	cancelButtonText: 'Cancel',
				// 	type: 'warning'
				//   }).then(() => {
				// 	UserModule.ResetToken()
				// 	location.reload() // To prevent bugs from vue-router
				//   })
			}

			return Promise.reject(new Error(res.message || "Error+1"));
		} else {
			// return JSON.parse(response.data); // 处理普通 JSON
			return response.data;
		}
	},
	error => {
		//   Message({
		// 	message: error.message,
		// 	type: 'error',
		// 	duration: 5 * 1000
		//   })
		const { status, data } = error.response;
		if (data.code === "000104") {
			reset();
			return;
		}
		toast.error(error.message);
		return Promise.reject(error);
	}
);
const reset = () => {
	// location.reload()
	removeToken();
	logout();
	goto(redirectUrl);
};
export default service;
