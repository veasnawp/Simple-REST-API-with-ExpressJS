
export function bytesToSize(bytes: number, decimals?: number) {
	if (!bytes || bytes === Infinity || bytes == 0) return "0 Byte";
	const k = 1024,
		dm = decimals || 2,
		sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
		i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function sizeToBytes(size:string){
	let _size = size.toLowerCase()
	  const k = 1024,
		  sizes = ["K", "M", "G", "T", "P", "E", "Z", "Y"];
	let i = 0;
	sizes.map((v,idx) => {
	  if(_size.includes(v.toLowerCase())){
		i = idx + 1;
	  }
	})
	_size = _size.replace(/[^0-9.]/g, '');
	return Math.floor(Math.pow(k, i) * Number(_size))
  };

export function formatDuration(second: number, fullFormat = false) {
	return new Date(second * 1000)
		.toISOString()
		.slice(second >= 3600 || fullFormat ? 11 : 14, 19);
}
export function formatDuration2(
	second: number,
	shortTime = false,
	addMilliseconds = 3
) {
	let timeFormat = new Date(second * 1000)
		.toISOString()
		.slice(11, 19 + addMilliseconds)
		.split(":");
	let _hour = parseInt(timeFormat[0]);
	let hour = _hour > 0 ? `${_hour} hour${_hour > 1 ? "s" : ""} ` : "";
	let _min = parseInt(timeFormat[1]);
	let min = _min > 0 ? `${_min} minute${_min > 1 ? "s" : ""} ` : "";
	let _sec = parseFloat(timeFormat[2]);

	if (shortTime) {
		if (_hour > 0) {
			let min = _min > 0 ? `${_min}mn ` : "";
			return hour + min + " left";
		} else if (_min > 0) {
			let sec =
				_sec >= 1 ? `${_sec.toString().slice(0, _sec < 10 ? 1 : 2)}sec ` : "";
			return min + sec + " left";
		} else {
			let sec =
				_sec >= 1
					? `${_sec.toString().slice(0, _sec < 10 ? 1 : 2)}`
					: _sec.toString();
			return sec + " seconds left";
		}
	}
	let sec = String(_sec) + " seconds";

	return `${hour}${min}${sec}`;
}
