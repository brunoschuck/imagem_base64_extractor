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

  // 📌 Captura os metadados
  const titulo = $('title').first().text().trim();
  const descricao = $('meta[name="description"]').attr('content') || '';
  const palavraChave = $('meta[property="article:tag"]').attr('content') || '';

  // 📌 Captura apenas o último segmento da URL (slug final)
  const { pathname } = new URL(url);
  const slug = pathname.replace(/^\/+|\/+$/g, '').split('/').pop();

  // 📌 Extrai conteúdo principal
  const $marc = $('#marcacao');
  if (!$marc.length) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  const $indice = $('nav.indice, nav#indice, .indice, #indice').first().clone();
  const $clean = cheerio.load('<div></div>')('div');

  if ($indice.length) $clean.append($indice);

  const allowed = 'h1,h2,h3,p,ul,li,a,img,div,ol,span,figure,iframe';
  $marc.children(allowed).each((i, el) => {
    $clean.append($(el).clone());
  });

  // 📌 Converte iframes do YouTube em URL limpa
  $clean.find('iframe').each((i, el) => {
    const src = $(el).attr('src');
    if (src) {
      const cleanUrl = src.split('?')[0]; // remove query string
      $(el).replaceWith(cleanUrl);
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
    html: $clean.html()
  });
}
