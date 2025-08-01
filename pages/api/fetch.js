import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

  const htmlRaw = await fetch(url).then(r => r.text());
  const $ = cheerio.load(htmlRaw);
  const $marc = $('#marcacao');

  if (!$marc.length) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  // Captura o índice do HTML original
  const $indice = $('nav.indice, nav#indice, .indice, #indice').first().clone();

  // Cria contêiner limpo
  const $clean = cheerio.load('<div></div>')('div');

  // Insere o índice no topo, se encontrado
  if ($indice.length) {
    $clean.append($indice);
  }

  // Clona os filhos válidos da marcação
  const allowed = 'h1,h2,h3,p,ul,li,a,img,div,ol,span';
  $marc.children(allowed).each((i, el) => {
    $clean.append($(el).clone());
  });

  // Converte imagens para base64
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
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send($clean.html());
}
