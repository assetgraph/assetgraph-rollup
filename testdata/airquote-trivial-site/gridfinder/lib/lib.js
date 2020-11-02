import Point from "./Point.js";

export function findGrid(points) {
	let left = points[0].x;
	let right = points[0].x;
	let top = points[0].y;
	let bottom = points[0].y;

	for (let {x, y} of points.slice(1)) {
		if (x < left) left = x;
		if (x > right) right = x;
		if (y < top) top = y;
		if (y > bottom) bottom = y;
	}

	let width = right - left;
	let height = bottom - top;
	let minDim = Math.min(width, height);
	let maxDim = Math.max(width, height);

	let origin = new Point(left, top);

	let relPoints = points.slice(1).map(({x, y}) => new Point(x, y).sub(origin));

	let candidates = [];
	for (let cells = minDim/8 |0; cells > 0; cells--) {
		let minPx = minDim / cells;
		let maxCells = Math.round(maxDim/minPx);
		let px = maxDim/maxCells;

		let err = 0;
		for (let point of relPoints) {
			err += point.roundError(px).div(px).lengthSquared();
		}

		candidates.push({px, err});
	}
	candidates.sort((a, b) => a.err - b.err || b.px - a.px);

	let px = candidates[0].px;

	let off = relPoints
		.map(p => p.roundError(px))
		.reduce((a, b) => a.add(b))
		.div(points.length)
		.add(origin.roundError(px));

	return {
		cellSize: {width: px, height: px},
		offset: {x: off.x, y: off.y},
	}
}
