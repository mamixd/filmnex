// src/modules/seo/seo.controller.ts
import { Controller, Get, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('v1')
export class SeoController {
  private readonly siteUrl: string;

  constructor(
    @InjectModel('Movie') private movieModel: Model<any>,
    @InjectModel('Series') private seriesModel: Model<any>,
    private configService: ConfigService,
  ) {
    this.siteUrl = this.configService.get('app.frontendUrl', 'https://cinemax.com');
  }

  @Get('sitemap')
  async getSitemap(@Res() res: Response) {
    const [movies, series] = await Promise.all([
      this.movieModel.find({ isPublished: true }).select('slug updatedAt').lean(),
      this.seriesModel.find({ isPublished: true }).select('slug updatedAt').lean(),
    ]);

    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/filmler', priority: '0.9', changefreq: 'daily' },
      { url: '/diziler', priority: '0.9', changefreq: 'daily' },
    ];

    const urls = [
      ...staticPages.map(
        (p) => `  <url>
    <loc>${this.siteUrl}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
      ),
      ...movies.map(
        (m) => `  <url>
    <loc>${this.siteUrl}/film/${m.slug}-izle</loc>
    <lastmod>${new Date(m.updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      ),
      ...series.map(
        (s) => `  <url>
    <loc>${this.siteUrl}/dizi/${s.slug}</loc>
    <lastmod>${new Date(s.updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
    res.send(xml);
  }

  @Get('robots.txt')
  getRobots(@Res() res: Response) {
    const content = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Sitemap: ${this.siteUrl}/sitemap.xml`;

    res.setHeader('Content-Type', 'text/plain');
    res.send(content);
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
