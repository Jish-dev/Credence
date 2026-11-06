export type UserRole = "customer" | "provider" | "admin";
export interface AuthUser { id:string; name:string; email:string; role:UserRole }
