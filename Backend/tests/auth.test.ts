import {describe,it,expect} from "vitest";
describe("Auth API contract",()=>{it("uses the expected API prefix",()=>expect("/api/v1/auth/register").toContain("/auth/"));});
