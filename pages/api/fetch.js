import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

  const htmlRaw = await fetch(url).then(r => r.text());
  const $ = cheerio.load(htmlRaw);
  const $marc = $('#marcacao');

  if (!$marc.length) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  const allowed = 'h1,h2,h3,p,ul,li,a,img';
  const $clean = cheerio.load('<div></div>')('div');

  $marc.find(allowed).each((i, el) => {
    $clean.append($(el).clone());
  });

  const seen = new Set();
  const imgPromises = [];

  $clean.find('img').each((i, img) => {
    const srcRaw = $(img).attr('src');
    if (!srcRaw) return;

    const fullSrc = new URL(srcRaw, url).href;

    // Se já vimos essa imagem, remove ela
    if (seen.has(fullSrc)) {
      $(img).remove();
      return;
    }
    seen.add(fullSrc);

    const alt = $(img).attr('alt') || '';

    const p = fetch(fullSrc)
      .then(r => {
        const contentType = r.headers.get('content-type') || 'image/jpeg';
        return r.buffer().then(buf => {
          const base64 = buf.toString('base64');
          $(img).attr('src', `data:${contentType};base64,${base64}`);
          $(img).attr('alt', alt);
        });
      })
      .catch(() => {
        $(img).remove();
      });

    imgPromises.push(p);
  });

  await Promise.all(imgPromises);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send($clean.html());
}
