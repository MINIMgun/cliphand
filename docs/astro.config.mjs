// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://minimgun.github.io",
  base: "/cliphand",
  integrations: [
    starlight({
      title: "cliphand",
      description:
        "Headless media ingest: detect a recording card, copy and verify its clips, rename them by metadata, and clean the card.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/MINIMgun/cliphand",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/MINIMgun/cliphand/edit/main/docs/",
      },
      lastUpdated: true,
      sidebar: [
        {
          label: "Getting started",
          items: [
            { label: "Introduction", slug: "getting-started/introduction" },
            { label: "Feature plan", slug: "getting-started/feature-plan" },
          ],
        },
        {
          label: "Architecture",
          items: [{ label: "Overview", slug: "architecture/overview" }],
        },
      ],
      customCss: ["./src/styles/global.css"],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
