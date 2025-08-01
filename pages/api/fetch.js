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

  // A ÚNICA MUDANÇA ESTÁ AQUI:
  // Usa `.children()` para selecionar apenas os elementos de nível superior.
  // Assim, a estrutura interna (como <li> dentro de <ul>) é clonada junto, uma única vez.
  $marc.children().each((i, el) => {
    // Verifica se o elemento filho direto está na lista de permitidos
    if ($(el).is(allowed)) {
      $clean.append($(el).clone());
    }
  });

  const imgPromises = [];
  $clean.find('img').each((i, img) => {
    const src = $(img).attr('src');
    const alt = $(img).attr('alt') || '';
    
    // É importante garantir que a URL seja absoluta, especialmente se a imagem for relativa
    if (!src || src.startsWith('data:')) {
        return;
    }
    const imageUrl = new URL(src, url).href;
    
    const p = fetch(imageUrl)
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
