/*
 * @Author: 罗文涛 luo_wt@hisuntech.com
 * @Date: 2025-03-04 10:25:25
 * @LastEditors: 罗文涛 luo_wt@hisuntech.com
 * @LastEditTime: 2025-04-18 10:29:25
 * @FilePath: \foundesrcPro\ollama-webui\src\lib\stores\permission.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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
import { getToken, setToken, removeToken } from "$lib/utils/cookie";
import toast from "svelte-french-toast";
const redirectUrl: any = import.meta.env.VITE_API_REDIRECT_URL;
import { logout } from "$lib/api/user";

export const thirdLogin = async (token: string | undefined | null = null) => {
	// console.log("token-thirdLogin", token);

	// debugger;

	if (!token) {
		token = getToken();
	} else {
		setToken(token);
	}
	// console.log("getToken()", getToken());

	// debugger;
	if (!token) {
		showToast("登陆失败");
		redirectToSSO();
		return;
	}

	try {
		const data: any = await getInfo(token);
		// const data: any = await getInfos(token);
		// console.log("data.code", data.code);

		// debugger;
		if (data.code === "000000") {
			// console.log("data.menus?.length", data.menus?.length);

			// debugger;
			if (data.menus?.length > 0) {
				console.log("data", data);

				userInfor.set(data);

				userName.set(data.userName);
				await goto("/");
			} else {
				// debugger;
				showToast("没有权限请联系管理员");
				clearTokenLocalStorage();

				clearTokenAndRedirect();
			}
		} else {
			showToast("登陆失败，无法连接服务器或网络问题，请稍后再试！");
			clearTokenAndRedirect();
		}
	} catch (error) {
		// debugger;
		// console.error("Failed to login with token:", error);
		showToast("登陆失败，请稍后再试！");
		clearTokenAndRedirect();
	}
};

const showToast = (message: string) => {
	toast(message);
};

const redirectToSSO = () => {
	goto(redirectUrl);
};

const clearTokenAndRedirect = () => {
	logout();
	removeToken();
	redirectToSSO();
};
const clearTokenLocalStorage = () => {
	localStorage.removeItem("token");
	sessionStorage.removeItem("token");
	redirectToSSO();
};
