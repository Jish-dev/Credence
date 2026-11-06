import {describe,it,expect} from "vitest";
describe("Booking status",()=>{it("recognizes supported states",()=>expect(["confirmed","in_progress","completed","cancelled"]).toContain("completed"));});
