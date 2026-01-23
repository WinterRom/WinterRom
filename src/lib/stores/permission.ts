/*
 * @Author: 罗文涛 luo_wt@hisuntech.com
 * @Date: 2025-03-04 10:25:25
 * @LastEditors: 罗文涛 luo_wt@hisuntech.com
 * @LastEditTime: 2026-01-19 09:10:51
 * @FilePath: \foundesrcPro\ollama-webui\src\lib\stores\permission.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { goto } from "$app/navigation";
import { getInfo, wxLogin } from "$lib/api/user";
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
const redirectUrl: any = import.meta.env.VITE_APP_SSO_REDIRECT_URL;
import { logout } from "$lib/api/user";

export const thirdLogin = async (params: any) => {
	// console.log("token-thirdLogin", token);

	// debugger;

	if (!params.token) {
		params.token = getToken();
	} else {
		setToken(params.token);
	}
	// console.log("getToken()", getToken());
	if (params.code) {
		wxLogin(params)
			.then((response: any) => {
				const result = response.data.data;
				setToken(result.token);
			})
			.catch(error => {});
	}
	// debugger;
	if (!params.token && !getToken()) {
		showToast("登陆失败");
		goto(redirectUrl);
		redirectToSSO();
		return;
	}

	try {
		const data: any = await getInfo(params.token || getToken());
		// const data: any = await getInfos(token);
		// console.log("data.code", data.code);

		// debugger;
		if (data.code === "000000") {
			// console.log("data.menus?.length", data.menus?.length);

			// debugger;
			if (data.menus?.length > 0) {
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
	removeToken();
	logout();

	redirectToSSO();
};
const clearTokenLocalStorage = () => {
	localStorage.removeItem("token");
	sessionStorage.removeItem("token");
	redirectToSSO();
};
