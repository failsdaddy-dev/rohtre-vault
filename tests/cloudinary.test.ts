import { describe, expect, it } from "vitest";
import { apiSignature, stringToSign } from "../supabase/functions/_shared/cloudinary-sign";

// Worked examples copied from Cloudinary's docs (API secret "abcd").
describe("Cloudinary signatures", () => {
  it("API signature: timestamp only", async () => {
    // verified: https://cloudinary.com/documentation/authentication_signatures
    expect(await apiSignature({ timestamp: 1315060510 }, "abcd")).toBe("a21ad0f63beb4de2e5575204b79ab90bffb02c10");
  });

  it("API signature: sorted params, file/api_key/resource_type left out", async () => {
    const params = {
      timestamp: 1315060510,
      public_id: "sample_image",
      eager: "w_400,h_300,c_pad|w_260,h_200,c_crop",
      api_key: "1234",
      resource_type: "video",
      file: "x",
    };
    expect(stringToSign(params)).toBe("eager=w_400,h_300,c_pad|w_260,h_200,c_crop&public_id=sample_image&timestamp=1315060510");
    expect(await apiSignature(params, "abcd")).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

});
