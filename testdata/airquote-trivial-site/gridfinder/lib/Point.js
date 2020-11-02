export default class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}

	add(that) {
		return new Point(this.x + that.x, this.y + that.y)
	}

	sub(that) {
		return new Point(this.x - that.x, this.y - that.y)
	}

	mult(factor) {
		return new Point(this.x * factor, this.y * factor);
	}

	div(factor) {
		return this.mult(1/factor)
	}

	round(multiple=1) {
		return new Point(
			Math.round(this.x / multiple)*multiple,
			Math.round(this.y / multiple)*multiple)
	}

	roundError(multiple=1) {
		return this.sub(this.round(multiple))
	}

	lengthSquared() {
		return this.x*this.x + this.y*this.y;
	}

	length() {
		return Math.sqrt(this.lengthSquared());
	}
}

