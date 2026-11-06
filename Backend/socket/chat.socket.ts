import type {Server} from "socket.io";
export function registerChatSocket(io:Server){io.on("connection",socket=>{socket.on("chat:join",(id:string)=>socket.join(`conversation:${id}`));});}
