import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

  try {
    new URL(url);
    if (!/^https?:\/\//.test(url)) throw new Error();
  } catch {
    return res.status(400).json({ error: 'URL inválida' });
  }

  const htmlRaw = await fetch(url).then(r => r.text());
  const $ = cheerio.load(htmlRaw);

  // Metadados
  const titulo = $('title').first().text().trim();
  const descricao = $('meta[name="description"]').attr('content') || '';
  const palavraChave = $('meta[property="article:tag"]').attr('content') || '';

  // Slug final
  const { pathname } = new URL(url);
  const slug = pathname.replace(/^\/+|\/+$/g, '').split('/').pop();

  // Imagem destacada
  let imagemDestacada = $('.elementor-widget-theme-post-featured-image img').attr('src') || '';
  let imagemDestacadaBase64 = '';

  if (imagemDestacada) {
    const fullSrc = new URL(imagemDestacada, url).href;
    const respImg = await fetch(fullSrc);
    const contentType = respImg.headers.get('content-type') || 'image/jpeg';
    const buffer = await respImg.buffer();
    imagemDestacadaBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
    imagemDestacada = fullSrc;
  }

  // Extrai conteúdo
  const $marc = $('#marcacao');
  if (!$marc.length) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  const $indice = $('nav.indice, nav#indice, .indice, #indice').first().clone();
  const $clean = cheerio.load('<div></div>')('div');

  if ($indice.length) $clean.append($indice);

  const allowed = 'h1,h2,h3,p,ul,li,a,img,div,ol,span,iframe';
  $marc.children(allowed).each((i, el) => {
    const clone = $(el).clone();
    if (clone.is('iframe')) {
      const src = clone.attr('src');
      if (src) {
        const cleanSrc = src.split('?')[0];
        clone.attr('src', cleanSrc);
      }
    }
    $clean.append(clone);
  });

  res.status(200).json({
    titulo,
    descricao,
    palavraChave,
    slug,
    imagemDestacada,
    imagemDestacadaBase64,
    html: $clean.html()
  });
}
