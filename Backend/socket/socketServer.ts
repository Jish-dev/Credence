import type {Server as HttpServer} from "node:http";import {initSocket} from "../config/socket.js";
export function startSocketServer(server:HttpServer){return initSocket(server);}
