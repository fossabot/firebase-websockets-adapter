import * as jwt from 'jwt-simple';

export function TokenValidator(secret) {
	setSecret(secret);

	function getTime() {
		return Math.floor(new Date().getTime() / 1000);
	}

	function decode(token, noVerify = false) {
		const decoded = jwt.decode(token, secret || '', !secret || noVerify);
		if (secret && !noVerify && !isValidTimestamp(decoded)) {
			throw new Error('invalid timestamp');
		}
		return decoded;
	}

	function isValidTimestamp(claims, now = getTime()) {
		const since = validSince(claims);
		const until = validUntil(claims);
		return typeof now === 'number' &&
            typeof since === 'number' &&
            typeof until === 'number' &&
            now >= since &&
            now <= until;
	}

	function setSecret(newSecret) {
		secret = newSecret || null;
	}

	function withSecret(newSecret) {
		return TokenValidator(newSecret);
	}

	return {
		decode,
		isValidTimestamp,
		normalize,
		setSecret,
		withSecret,
	};
}

export function normalize(input) {
	const normal = {};

	function grab(a, b = a) {
		if (input.hasOwnProperty(a)) {
			normal[b] = input[a];
		} else if (input.hasOwnProperty(b)) {
			normal[b] = input[b];
		}
	}

	if (input) {
		grab('d', 'auth');
		grab('nbf', 'notBefore');
		grab('exp', 'expires');
		grab('iat');
		grab('admin');
		grab('simulate');
		grab('debug');
	}
	return normal;
}

function validUntil(claims) {
	let result = null;
	if (typeof claims === 'object') {
		if (claims.exp) {
			result = claims.exp;
		} else {
			result = validSince(claims);
			if (result) {
				result += 86400;
			}
		}
	}
	return result;
}

function validSince(claims) {
	let result = null;
	if (typeof claims === 'object') {
		if (claims.nbf) {
			result = claims.nbf;
		} else if (claims.iat) {
			result = claims.iat;
		}
	}
	return result;
}