/*
 * swipe滑动逻辑封装 - 修复版
 * 支持 Touch (手机) 和 Mouse (电脑/模拟器)
 * 修复了移动导致滑动计算失效的 Bug
 */

export function swipe(node: HTMLElement, { parameters = {} } = {}) {
	let startX: number;
	let startY: number;
	let startTime: number;
	let longPressTimer: any; // 专门用于长按的定时器
	let isMoving = false; // 标记是否发生过移动
	let isMouseDown = false; // 标记鼠标是否按下

	// 核心逻辑：判断滑动方向
	// 使用 X轴 vs Y轴 距离比较法，比角度法更适合列表滑动
	function GetSlideDirection(
		startX: number,
		startY: number,
		endX: number,
		endY: number
	) {
		const dy = startY - endY;
		const dx = endX - startX;
		let result: any = "";

		// 如果滑动距离太短，视为点击或误触 (阈值 5px)
		if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
			return result;
		}

		// 判断主轴方向 (X轴移动距离 > Y轴移动距离 则是左右滑，反之上下滑)
		if (Math.abs(dx) > Math.abs(dy)) {
			// 水平滑动
			if (dx > 0) {
				result = "swiperight";
			} else {
				result = "swipeleft";
			}
		} else {
			// 垂直滑动 (通常留给浏览器滚动，但这里也识别出来)
			if (dy > 0) {
				result = "swipeup";
			} else {
				result = "swipedown";
			}
		}
		return result;
	}

	// --- 统一处理函数 ---

	function handleStart(x: number, y: number) {
		startX = x;
		startY = y;
		startTime = Date.now();
		isMoving = false;

		// 长按检测
		clearTimeout(longPressTimer);
		longPressTimer = setTimeout(() => {
			// 如果移动了，就不算长按
			if (!isMoving) {
				node.dispatchEvent(new CustomEvent("longpress"));
			}
		}, 500);
	}

	function handleMove(x: number, y: number) {
		isMoving = true;
		// 如果移动距离超过一定阈值，取消长按判定
		if (Math.abs(x - startX) > 10 || Math.abs(y - startY) > 10) {
			clearTimeout(longPressTimer);
		}
	}

	function handleEnd(x: number, y: number) {
		clearTimeout(longPressTimer);

		const direction = GetSlideDirection(startX, startY, x, y);

		if (direction) {
			// 派发滑动事件
			node.dispatchEvent(new CustomEvent(direction));
		} else {
			// 如果没有滑动方向，且时间极短，视为点击
			if (Date.now() - startTime < 200 && !isMoving) {
				node.dispatchEvent(new CustomEvent("tap"));
			}
		}
	}

	// --- Touch 事件监听 ---

	function handleTouchStart(ev: TouchEvent) {
		handleStart(ev.touches[0].pageX, ev.touches[0].pageY);
	}

	function handleTouchMove(ev: TouchEvent) {
		handleMove(ev.touches[0].pageX, ev.touches[0].pageY);
	}

	function handleTouchEnd(ev: TouchEvent) {
		handleEnd(ev.changedTouches[0].pageX, ev.changedTouches[0].pageY);
	}

	// --- Mouse 事件监听 (支持电脑端/模拟器鼠标拖拽) ---

	function handleMouseDown(ev: MouseEvent) {
		isMouseDown = true;
		handleStart(ev.pageX, ev.pageY);
		// 监听 window 防止鼠标拖出元素外松开
		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
	}

	function handleMouseMove(ev: MouseEvent) {
		if (!isMouseDown) return;
		handleMove(ev.pageX, ev.pageY);
	}

	function handleMouseUp(ev: MouseEvent) {
		if (!isMouseDown) return;
		isMouseDown = false;
		handleEnd(ev.pageX, ev.pageY);
		// 清理全局监听
		window.removeEventListener("mousemove", handleMouseMove);
		window.removeEventListener("mouseup", handleMouseUp);
	}

	// 注册监听
	// 注意：Touch事件不使用 passive: true，允许我们在必要时阻止滚动（虽然这里主要靠 CSS touch-action）
	node.addEventListener("touchstart", handleTouchStart);
	node.addEventListener("touchmove", handleTouchMove);
	node.addEventListener("touchend", handleTouchEnd);

	node.addEventListener("mousedown", handleMouseDown);

	return {
		destroy() {
			node.removeEventListener("touchstart", handleTouchStart);
			node.removeEventListener("touchmove", handleTouchMove);
			node.removeEventListener("touchend", handleTouchEnd);

			node.removeEventListener("mousedown", handleMouseDown);
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		}
	};
}
