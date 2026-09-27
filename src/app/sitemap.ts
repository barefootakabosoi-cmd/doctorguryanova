// src/app/sitemap.ts
import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog-data";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://doctorguryanova.ru";

  const staticPages = [
    { url: `${baseUrl}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${baseUrl}/requisites`, lastModified: new Date(), priority: 0.3 },
  ];

  const directionPages = [
    { url: `${baseUrl}/nevrologiya`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/refleksoterapiya`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/girudoterapiya`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/osteopatiya`, lastModified: new Date(), priority: 0.8 },
  ];

  const posts = await getAllPosts();
  const blogPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    priority: 0.7,
  }));

  return [...staticPages, ...directionPages, ...blogPages];
}
