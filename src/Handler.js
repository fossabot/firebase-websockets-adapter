import {TokenValidator} from './utils/tokenValidator';
import WebSocket from 'ws';

export default class Handler {

	constructor({wss}) {
		this.wss = wss;
		this.listeners = [];
		this.handle();
	}

	handle() {
		let self = this;
		this.wss.on('connection', function connection(ws) {
			let auth;
			let tokenValidator = new TokenValidator(null);
			const send = (message) => {
				const payload = JSON.stringify(message);
				try {
					const numFragments = Math.ceil(payload.length / 16384);
					if (ws.readyState === WebSocket.OPEN) ws.send(String(numFragments));
					for (let startIdx = 0; startIdx < payload.length; startIdx += 16384) {
						if (ws.readyState === WebSocket.OPEN) ws.send(payload.substr(startIdx, 16384));
					}
				} catch (err) {
					throw(err);
				}
			};

			const pushData = (path, data) => {
				send({d: {a: 'd', b: {p: path, d: data}}, t: 'd'});
			};

			const authData = (token) => {
				try {
					let data;
					const decodedToken = tokenValidator.decode(token);
					if ('d' in decodedToken) {
						data = decodedToken.d;
					} else {
						data = {
							// 'user_id' is firebase-specific and may be
							// convenience only; 'sub' is standard JWT.
							provider: decodedToken.provider_id,
							token: decodedToken,
							uid: decodedToken.user_id || decodedToken.sub,
						};
					}
					return data;
				} catch (e) {
					return null;
				}
			};

			const authorize = (reqId, credential) => {
				auth = authData(credential);
			};

			ws.on('message', (data) => {
				if (data.toString() === '0') {
					return;
				}
				const parsed = Handler.accumulateFrames(ws, data.toString());
				if (parsed && parsed.t === 'd') {
					let path;
					if (typeof parsed.d.b.p !== 'undefined') {
						path = parsed.d.b.p;
					}
					path = Handler.normalizePath(path || '');
					const requestId = parsed.d.r;
					if (parsed.d.a === 'l' || parsed.d.a === 'q') {
						path = path.path;
						if (self.readCallback) {
							self.readCallback(path, auth || null, (data) => {
								pushData(path, data);
								self.listeners.push({path, pushData});
							});
						}
					}
					if (parsed.d.a === 'm') {
						if (self.updateCallback) {
							self.updateCallback(path.path, auth || null, parsed.d.b.d, () => {
							});
						}
					}
					if (parsed.d.a === 'p') {
						if (self.setCallback) {
							self.setCallback(path.path, auth || null, parsed.d.b.d, () => {
							});
						}
					}
					if (parsed.d.a === 'auth' || parsed.d.a === 'gauth') {
						authorize(requestId, parsed.d.b.cred);
					}
				}

			});

			send({d: {t: 'h', d: {ts: new Date().getTime(), v: '5', h: 'enbase.server', s: ''}}, t: 'c'});
		});
	}

	static send(ws, message) {
		const payload = JSON.stringify(message);
		try {
			const numFragments = Math.ceil(payload.length / 16384);
			if (ws.readyState === WebSocket.OPEN) ws.send(String(numFragments));
			for (let startIdx = 0; startIdx < payload.length; startIdx += 16384) {
				if (ws.readyState === WebSocket.OPEN) ws.send(payload.substr(startIdx, 16384));
			}
		} catch (err) {
			throw(err);
		}
	}

	static permissionDenied(ws, requestId) {
		Handler.send(ws, {d: {r: requestId, b: {s: 'permission_denied', d: 'Permission denied'}}, t: 'd'});
	}

	static accumulateFrames(ws, data) {
		if (typeof ws.frameBuffer === 'undefined') {
			ws.frameBuffer = '';
		}

		try {
			const parsed = JSON.parse(ws.frameBuffer + data);
			ws.frameBuffer = '';
			return parsed;
		} catch (e) {
			ws.frameBuffer += data;
		}

		return '';
	}

	static normalizePath(fullPath) {
		let path = fullPath;
		const isPriorityPath = /\/?\.priority$/.test(path);
		if (isPriorityPath) {
			path = path.replace(/\/?\.priority$/, '');
		}
		if (path.charAt(0) === '/') {
			path = path.substr(1);
		}
		return {
			fullPath,
			isPriorityPath,
			path,
		};
	}

	handleRead(callback) {
		this.readCallback = callback;
	}

	handleSet(callback) {
		this.setCallback = callback;
	}

	handleUpdate(callback) {
		this.updateCallback = callback;
	}

	notifyChanges(path, data) {
		if (data != null) {
			for (let listener of this.listeners) {
				if (path.match(`^${listener.path}`)) {
					listener.pushData(path, data);
				}
			}
		}
	}

	close() {
		this.wss.close();
	}
}