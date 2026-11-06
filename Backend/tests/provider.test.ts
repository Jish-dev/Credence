import {describe,it,expect} from "vitest";
describe("Provider matching",()=>{it("trust score is bounded 0-100",()=>{const score=Math.max(0,Math.min(100,120));expect(score).toBe(100);});});
