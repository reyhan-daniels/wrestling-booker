import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // A wrestler's portrait is submitted with the rest of the creation form,
      // and the default cap is 1MB. Photos are capped at 2MB, so this leaves
      // room for that plus the multipart boundaries and the other fields.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
