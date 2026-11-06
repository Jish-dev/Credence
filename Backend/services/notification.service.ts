import Notification from "../models/Notification.js"; import {getIO} from "../config/socket.js";
export async function notify(userId:string,title:string,body="",type="general",data:any={}) {
 const notification=await Notification.create({user:userId,title,body,type,data});
 try { getIO().to(`user:${userId}`).emit("notification:new",notification); } catch {}
 return notification;
}
