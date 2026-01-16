import axios from "axios";
// @ts-ignore
import { goto } from "$app/navigation";
import toast from "svelte-french-toast";
const BASE_URL = import.meta.env.VITE_API_BASE;
import { getToken, removeToken } from "$lib/utils/cookie";
import { logout } from "$lib/api/user";
const redirectUrl: any = import.meta.env.VITE_API_REDIRECT_URL;

// 创建核心请求实例
const service = axios.create({
	baseURL: BASE_URL,
	timeout: 50000
});

// Request interceptors
service.interceptors.request.use(
	config => {
		if (getToken()) {
			config.headers["X-Token"] = getToken();
		}
		return config;
	},
	error => {
		return Promise.reject(error);
	}
);

// Response interceptors
service.interceptors.response.use(
	response => {
		const res = response.data;
		const contentType = response.headers["content-type"];
		// 如果是流式数据，直接返回 response
		if (contentType && contentType.includes("stream")) {
			return response;
		}
		if (res?.code !== "000000" || response.status !== 200) {
			if (["50008", "50012", "50014", "000104"].includes(String(res.code))) {
				toast.error(res.message || "Error");
				reset();
			}
			return Promise.reject(new Error(res.message || "Error"));
		} else {
			return response.data || response;
		}
	},
	error => {
		// 拦截超时逻辑
		if (error.message.includes("timeout") || error.code === "ECONNABORTED") {
			toast.error("请求超时，请稍后重试");

			// 方式 A：返回一个 resolve 的 Promise，带上自定义的超时响应结构
			// 这样前端调用处不会进 catch，而是进 then，可以通过 code 判断
			return Promise.resolve({
				code: "TIMEOUT",
				message: "服务超时请稍后再试！",
				data: null
			});

			// 方式 B（如果希望前端走 catch 逻辑，请使用下面的代码）：
			// return Promise.reject(new Error("请求超时"));
		}
		const { data } = error.response || {};
		if (data && data.code === "000104") {
			reset();
			return;
		}
		toast.error(error.message);
		return Promise.reject(error);
	}
);

const reset = () => {
	removeToken();
	logout();
	goto(redirectUrl);
};

/**
 * 扩展的 request 函数，支持流式处理
 */
const request = (config: any) => {
	// 如果配置中包含 onMessage，说明是流式请求
	if (config.onMessage) {
		return streamRequest(config);
	}
	return service(config);
};

/**
 * 专门处理流式请求的内部函数 (基于 XMLHttpRequest)
 */
function streamRequest(config: any) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		const fullUrl = config.baseURL
			? config.baseURL + config.url
			: service.defaults.baseURL + config.url;

		// 处理参数：确保 config.params 中的属性（如 {message: '...'}）被正确编码
		let urlWithParams = fullUrl;
		if (config.params) {
			const params = new URLSearchParams();
			Object.keys(config.params).forEach(key => {
				if (config.params[key] !== undefined && config.params[key] !== null) {
					params.append(key, config.params[key]);
				}
			});
			const queryString = params.toString();
			if (queryString) {
				urlWithParams +=
					(urlWithParams.includes("?") ? "&" : "?") + queryString;
			}
		}

		xhr.open(config.method || "get", urlWithParams, true);

		// 复制拦截器中的 Header 处理逻辑
		if (getToken()) {
			xhr.setRequestHeader("X-Token", getToken() || "");
		}

		// 设置自定义 Header
		if (config.headers) {
			Object.keys(config.headers).forEach(key => {
				xhr.setRequestHeader(key, config.headers[key]);
			});
		}

		let seenBytes = 0;
		xhr.onprogress = () => {
			const newData = xhr.responseText.substr(seenBytes);
			seenBytes = xhr.responseText.length;

			const lines = newData.split("\n");
			for (const line of lines) {
				if (line.trim().startsWith("data:")) {
					try {
						const jsonString = line.trim().replace(/^data:\s*/, "");
						const data = JSON.parse(jsonString);
						if (config.onMessage) config.onMessage(data);
					} catch (e) {}
				}
			}
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				if (config.onEnd) config.onEnd();
				resolve(xhr.response);
			} else {
				const error = new Error(`HTTP ${xhr.status}`);
				if (config.onError) config.onError(error);
				reject(error);
			}
		};

		xhr.onerror = () => {
			const error = new Error("Network Error");
			if (config.onError) config.onError(error);
			reject(error);
		};

		xhr.send();
	});
}

// export default request;

export default service;
