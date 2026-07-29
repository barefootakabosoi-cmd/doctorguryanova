// src/app/sitemap.ts
// Обновлённый sitemap с блогом

import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://doctorguryanova.ru";

  // Статические страницы
  const staticPages = [
    { url: `${baseUrl}/`, lastModified: new Date(), priority: 1.0 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), priority: 0.3 },
    { url: `${baseUrl}/requisites`, lastModified: new Date(), priority: 0.3 },
  ];

  // Страницы направлений
  const directionPages = [
    { url: `${baseUrl}/nevrologiya`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/refleksoterapiya`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/girudoterapiya`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/osteopatiya`, lastModified: new Date(), priority: 0.8 },
  ];

  // Статьи блога
  const posts = getAllPosts();
  const blogPages = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    priority: 0.7,
  }));

  return [...staticPages, ...directionPages, ...blogPages];
}
