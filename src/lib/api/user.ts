/*
 * @Author: 罗文涛 luo_wt@hisuntech.com
 * @Date: 2025-02-27 16:55:15
 * @LastEditors: 罗文涛 luo_wt@hisuntech.com
 * @LastEditTime: 2026-01-16 15:07:49
 * @FilePath: \foundesrcPro\ollama-webui\src\lib\api\user.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// 接口定义示例 (src/api/user.js)
import request from "$lib/utils/request";

// export const UserAPI = {
// 	getInfo: (token: any) => request.post("/security/info", token)
// 	// logout: () => request.post('/logout'),
// 	// wxLogin: (code:any) => request.post('/security/authCodeLogin', { code })
// };
export const getInfo = (data: any) =>
	request({
		url: "/security/info",
		method: "post",
		data
	});

export const logout = () =>
	request({
		url: "/logout",
		method: "post"
	});

export const wxLogin = (params: any) =>
	request({
		url: "security/authCodeLogin",
		method: "post",
		data: params
	});
