// socket.ts
import io from "socket.io-client";
import { API_BASE_URL } from "../config";

let socket: any = null;

export function getSocket() {
    if (!socket) {
        socket = io(API_BASE_URL, {
            path: "/socket.io",
            transports: ["websocket"],
        });
    }
    return socket;
}
