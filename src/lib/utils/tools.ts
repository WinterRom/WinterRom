// tools.ts
const isEmpty = (val: any) => val === undefined || val === null || val === '';

/**
 * 解析 URL 参数并返回键值对对象
 *
 * @param url 待解析的 URL 字符串
 * @returns 返回解析后的键值对对象，若 URL 不含参数则返回空对象
 */
const parseUrl = (url: string) => {
	if (url.indexOf('?') >= 0 && url.indexOf('=') > 1) {
		const txt = decodeURIComponent(
			url.substr(url.indexOf('?') + 1, url.length)
		).split('&');
		const param: { [key: string]: string } = {};
		txt.forEach(item => {
			const index = item.indexOf('=');
			const start = item.substring(0, index);
			if (!isEmpty(start)) {
				param[start] = item.substring(index + 1);
			}
		});
		return param;
	} else {
		return {};
	}
};
export default {
	isEmpty,
	parseUrl,
};
