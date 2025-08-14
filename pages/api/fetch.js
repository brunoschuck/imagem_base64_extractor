import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

  // Validação simples de URL
  try {
    new URL(url);
    if (!/^https?:\/\//.test(url)) throw new Error();
  } catch {
    return res.status(400).json({ error: 'URL inválida' });
  }

  const htmlRaw = await fetch(url).then(r => r.text());
  const $ = cheerio.load(htmlRaw);

  // 📌 Metadados
  const titulo = $('title').first().text().trim();
  const descricao = $('meta[name="description"]').attr('content') || '';
  const palavraChave = $('meta[property="article:tag"]').attr('content') || '';

  // 📌 Slug final (última parte da URL sem /)
  const { pathname } = new URL(url);
  const slug = pathname.replace(/^\/+|\/+$/g, '').split('/').pop();

  // 📌 Imagem de destaque (classe elementor-widget-theme-post-featured-image)
  let imagemDestacadaBase64 = null;
  const imagemDestacadaEl = $('.elementor-widget-theme-post-featured-image img').first();
  if (imagemDestacadaEl.length) {
    const imgUrl = new URL(imagemDestacadaEl.attr('src'), url).href;
    try {
      const imgRes = await fetch(imgUrl);
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const buffer = await imgRes.buffer();
      imagemDestacadaBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch {
      imagemDestacadaBase64 = null;
    }
  }

  // 📌 Extrai conteúdo principal
  const $marc = $('#marcacao');
  if (!$marc.length) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  const $indice = $('nav.indice, nav#indice, .indice, #indice').first().clone();
  const $clean = cheerio.load('<div></div>')('div');

  if ($indice.length) $clean.append($indice);

  const allowed = 'h1,h2,h3,p,ul,li,a,img,div,ol,span,iframe';
  $marc.children(allowed).each((i, el) => {
    $clean.append($(el).clone());
  });

  // 📌 Remove embed e deixa apenas link do YouTube
  $clean.find('iframe').each((i, el) => {
    const src = $(el).attr('src');
    if (src && src.includes('youtube.com')) {
      $(el).replaceWith(src.split('?')[0]);
    } else {
      $(el).remove();
    }
  });

  // 📌 Converte imagens para base64
  const seenImages = new Set();
  const imgPromises = [];
  $clean.find('img').each((i, img) => {
    const srcRaw = $(img).attr('src');
    if (!srcRaw) return;
    const fullSrc = new URL(srcRaw, url).href;
    if (seenImages.has(fullSrc)) {
      $(img).remove();
      return;
    }
    seenImages.add(fullSrc);

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

  res.status(200).json({
    titulo,
    descricao,
    palavraChave,
    slug,
    imagemDestacadaBase64,
    html: $clean.html()
  });
}
