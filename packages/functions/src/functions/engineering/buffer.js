/** 
 * DL-3707: we use IEEE 754, i.e. single precision
 */
const buffer = new ArrayBuffer(4);
// const binary = new Uint8Array(buffer);
const uint = new Uint32Array(buffer);
const float = new Float32Array(buffer);

const toBinStr = (str, val) => `${str}${val.toString(2)}`;
const toHexStr = (str, val) => `${str}${val.toString(16)}`;
const toBin = () => uint.reduceRight(toBinStr, '');
const toHex = () => uint.reduceRight(toHexStr, '');


const binary2float = (binstr) => {
	uint[0] = parseInt(binstr, 2);
	return float[0];
};

const float2binary = (floatnr) => {
	float[0] = floatnr;
	return toBin();
};
const float2hex = (floatnr) => {
	float[0] = floatnr;
	return toHex();
};

const hex2float = (hexstr) => {
	uint[0] = parseInt(hexstr, 16);
	return float[0];
};

module.exports = {
	binary2float,
	float2binary,
	float2hex,
	hex2float
};
