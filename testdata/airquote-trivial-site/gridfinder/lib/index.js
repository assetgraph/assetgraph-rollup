const ui = import("./ui.js");

canvas.addEventListener("click", async (...args) => (await ui).click(...args));
canvas.addEventListener("mousedown", async (e, ...args) => {
	if (e.button != 1) return; // Only middle clicks.
	if (!points.length) return;

	e.preventDefault();

	(await ui).mousedown(e, ...args);
})

upload.addEventListener("change", e => {
	bg.src = URL.createObjectURL(e.target.files[0]);
});

window.addEventListener("paste", e => {
	if (!e.clipboardData.files.length) return;

	upload.files = e.clipboardData.files;
	bg.src = URL.createObjectURL(upload.files[0]);
});

document.addEventListener("dragover", e => {
	e.preventDefault();
});

document.addEventListener("drop", e => {
	e.preventDefault();

	let url;
	if (e.dataTransfer.files.length) {
		upload.files = e.dataTransfer.files;
		bg.src = URL.createObjectURL(upload.files[0]);
	} else if (url = e.dataTransfer.getData('URL')) {
		let f = document.getElementById("url");
		f.i.value = url;
		f.submit();
	}
});

+function(){
	let params = new URLSearchParams(location.search);
	let i = params.get("i");
	if (i) {
		bg.src = i;
		document.getElementById("url").i.value = i;
	} else if (upload.files.length) {
		bg.src = URL.createObjectURL(upload.files[0]);
	}
}();
