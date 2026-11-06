import type {Server} from "socket.io";
export function registerNotificationSocket(io:Server){io.on("connection",socket=>{socket.on("notifications:join",(id:string)=>socket.join(`user:${id}`));});}
