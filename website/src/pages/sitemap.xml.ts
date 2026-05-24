import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const base = import.meta.env.BASE_URL;
  const pages = [""];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${new URL(base + page, site).href}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
};
