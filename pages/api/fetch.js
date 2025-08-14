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

  // 📌 Slug final (somente última parte do caminho)
  const { pathname } = new URL(url);
  const slug = pathname.replace(/^\/+|\/+$/g, '').split('/').pop();

  // 📌 Imagem destacada
  let imagemDestacada = '';
  const imgEl = $('.elementor-widget-theme-post-featured-image img').first();
  if (imgEl.length) {
    const srcRaw = imgEl.attr('src');
    if (srcRaw) imagemDestacada = new URL(srcRaw, url).href;
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

  // 📌 Ajuste para iframes do YouTube (pegar só a URL)
  $clean.find('iframe').each((i, iframe) => {
    const src = $(iframe).attr('src') || '';
    if (src.includes('youtube.com/embed')) {
      $(iframe).replaceWith(src.split('?')[0]); // mantém só a URL pura
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
      .catch(() => $(img).remove());

    imgPromises.push(p);
  });

  await Promise.all(imgPromises);

  res.status(200).json({
    titulo,
    descricao,
    palavraChave,
    slug,
    imagemDestacada,
    html: $clean.html()
  });
}
