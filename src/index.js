import {Server as WebSocketServer} from 'ws';
import Handler from './Handler';

export default (http) => {
	const wss = new WebSocketServer({server: http});
	return new Handler({wss});
};