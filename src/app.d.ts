// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
	//  在这里扩展 Svelte 的 HTML 属性定义
	namespace svelteHTML {
		interface HTMLAttributes<T> {
			"on:swipeleft"?: (event: CustomEvent) => void;
			"on:swiperight"?: (event: CustomEvent) => void;
			"on:swipeup"?: (event: CustomEvent) => void;
			"on:swipedown"?: (event: CustomEvent) => void;
			"on:tap"?: (event: CustomEvent) => void;
			"on:longpress"?: (event: CustomEvent) => void;
		}
	}
}

export {};
