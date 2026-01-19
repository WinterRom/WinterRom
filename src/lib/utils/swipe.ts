/*
 * @Author: 罗文涛 luo_wt@hisuntech.com
 * @Date: 2026-01-19 09:46:43
 * @LastEditors: 罗文涛 luo_wt@hisuntech.com
 * @LastEditTime: 2026-01-19 09:51:06
 * @FilePath: \foundesrcPro\itc_ai_self_ui\src\lib\utils\swipe.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * swipe滑动逻辑封装
 *
 */
export function swipe(node: HTMLElement, { parameters = {} } = {}) {
	let startX: number;
	let startY: number;
	let startTime: number;
	let timeOutEvent: any;
	let direction = "";

	// 角度计算逻辑 (源自 vueTouch.ts)
	function GetSlideAngle(dx: number, dy: number) {
		return (Math.atan2(dy, dx) * 180) / Math.PI;
	}

	// 方向判断逻辑 (源自 vueTouch.ts)
	function GetSlideDirection(
		startX: number,
		startY: number,
		endX: number,
		endY: number
	) {
		const dy = startY - endY;
		const dx = endX - startX;
		let result: any = 0; // 0: 无滑动

		// 如果滑动距离太短，视为点击或误触 (这里设置阈值为 10px)
		if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
			return result;
		}

		const angle = GetSlideAngle(dx, dy);

		// 根据角度判断方向
		if (angle >= -45 && angle < 45) {
			result = "swiperight";
		} else if (angle >= 45 && angle < 135) {
			result = "swipeup";
		} else if (angle >= -135 && angle < -45) {
			result = "swipedown";
		} else if (
			(angle >= 135 && angle <= 180) ||
			(angle >= -180 && angle < -135)
		) {
			result = "swipeleft";
		}
		return result;
	}

	function handleTouchStart(ev: TouchEvent) {
		startX = ev.touches[0].pageX;
		startY = ev.touches[0].pageY;
		startTime = Date.now();

		// 长按检测 (源自 vueTouch.ts)
		timeOutEvent = setTimeout(() => {
			timeOutEvent = 0;
			node.dispatchEvent(new CustomEvent("longpress"));
		}, 500);
	}

	function handleTouchMove(ev: TouchEvent) {
		clearTimeout(timeOutEvent);
		timeOutEvent = 0;
	}

	function handleTouchEnd(ev: TouchEvent) {
		clearTimeout(timeOutEvent);
		if (timeOutEvent !== 0) {
			// 如果不是长按，则判断滑动
			const endX = ev.changedTouches[0].pageX;
			const endY = ev.changedTouches[0].pageY;
			direction = GetSlideDirection(startX, startY, endX, endY) as string;

			if (direction) {
				// 派发自定义事件，例如: on:swipeleft
				node.dispatchEvent(new CustomEvent(direction));
			} else {
				// 可能是点击
				if (Date.now() - startTime < 200) {
					node.dispatchEvent(new CustomEvent("tap"));
				}
			}
		}
	}

	node.addEventListener("touchstart", handleTouchStart, { passive: true });
	node.addEventListener("touchmove", handleTouchMove, { passive: true });
	node.addEventListener("touchend", handleTouchEnd, { passive: true });

	return {
		destroy() {
			node.removeEventListener("touchstart", handleTouchStart);
			node.removeEventListener("touchmove", handleTouchMove);
			node.removeEventListener("touchend", handleTouchEnd);
		}
	};
}
