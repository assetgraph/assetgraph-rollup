import Point from "./Point.js";
import {findGrid} from "./lib.js";

let points = [];

let instructions = document.getElementById("instructions");

let canvas = document.getElementById("canvas");
let ctx = canvas.getContext('2d');

export function click(e) {
	let point = eventToCanvasCoords(e, canvas);
	points.push(point)

	drawPoint(point);

	console.log({points});

	if (points.length >= 3) {
		drawGrid();
	}
};

export function mousedown(e) {
	let point = eventToCanvasCoords(e, canvas);

	let nearestPoint = 0;
	let nearestDistance = points[0].sub(point).length();
	console.log(0, points[0], nearestDistance)
	for (let i = 1; i < points.length; i++) {
		let p = points[i]
		let d = p.sub(point).length();
		console.log(i, p, d)
		if (d < nearestDistance) {
			nearestPoint = i;
			nearestDistance = d;
		}
	}

	points.splice(nearestPoint, 1);

	if (points.length > 2) {
		drawGrid()
	} else {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		points.forEach(drawPoint);
	}

	return false;
}

function eventToCanvasCoords(e, canvas) {
	let {top, bottom, left, right} = e.target.getBoundingClientRect();

	let screenX = e.clientX - left;
	let screenY = e.clientY - top;

	let screenWidth = right - left;
	let screenHeight = bottom - top;

	let canvasX = screenX / screenWidth * canvas.width;
	let canvasY = screenY / screenHeight * canvas.height;

	return new Point(canvasX, canvasY);
}

function drawPoint({x, y}, {color="red", size=null, thickness=null} = {}) {
	size = size || canvas.width / 200;
	thickness = thickness || size/2;

	ctx.beginPath();
	ctx.setLineDash([]);
	ctx.strokeStyle = color;
	ctx.lineWidth = thickness;
	ctx.arc(x, y, size, 0, 2 * Math.PI);
	ctx.stroke();
}

function drawGrid() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	let {cellSize, offset} = findGrid(points);
	console.log({cellSize, offset});
	let px = cellSize.width;

	instructions.textContent = `
		Grid cells are ${Math.round(px*100)/100}px.
		Offset ${Math.round(offset.x)}, ${Math.round(offset.y)}.
		Map is ${Math.round(canvas.width/px)}x${Math.round(canvas.height/px)} cells.
	`;

	ctx.beginPath();
	ctx.strokeStyle = "red";
	ctx.lineWidth = Math.max(1, px/40);
	ctx.setLineDash([px/2]);

	for (let x = offset.x; x < canvas.width; x += px) {
		ctx.moveTo(x, offset.y - px/4);
		ctx.lineTo(x, canvas.height);
	}
	for (let y = offset.y; y < canvas.height; y += px) {
		ctx.moveTo(offset.x - px/4, y);
		ctx.lineTo(canvas.width, y);
	}

	ctx.stroke();

	points.forEach(drawPoint);
}

let img = document.getElementById("bg");
function onLoad() {
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	points = [];

	instructions.textContent = "Click intersections on the map to identify the grid.";
}
img.addEventListener("load", onLoad);
if (img.complete && img.src) onLoad();

let upload = document.getElementById("upload");
upload.addEventListener("change", e => {
	img.src = URL.createObjectURL(e.target.files[0]);
});

window.addEventListener("paste", e => {
	if (!e.clipboardData.files.length) return;

	upload.files = e.clipboardData.files;
	img.src = URL.createObjectURL(upload.files[0]);
});

document.addEventListener("dragover", e => {
	e.preventDefault();
});

document.addEventListener("drop", e => {
	e.preventDefault();

	let url;
	if (e.dataTransfer.files.length) {
		upload.files = e.dataTransfer.files;
		img.src = URL.createObjectURL(upload.files[0]);
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
		img.src = i;
		document.getElementById("url").i.value = i;
	} else if (upload.files.length) {
		img.src = URL.createObjectURL(upload.files[0]);
	}
}();
