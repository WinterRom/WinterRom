<script>
	import "../app.css";
	import "../tailwind.css";
	import "tippy.js/dist/tippy.css";
	import { Toaster } from "svelte-french-toast";
</script>

<svelte:head>
	<title>小助手</title>
</svelte:head>

<Toaster />
<slot />
