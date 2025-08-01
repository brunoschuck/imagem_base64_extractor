import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

  const htmlRaw = await fetch(url).then(r => r.text());
  const $ = cheerio.load(htmlRaw);
  const $marc = $('#marcacao');
  if (!$marc.length) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  // 1. Processa e converte as imagens para Base64 antes de limpar o HTML.
  //    Essa parte é a mesma, já que funciona bem.
  const imgPromises = [];
  $marc.find('img').each((i, img) => {
    const src = $(img).attr('src');
    if (!src) return;

    const imageUrl = new URL(src, url).href;

    const p = fetch(imageUrl)
      .then(r => {
        const contentType = r.headers.get('content-type') || 'image/jpeg';
        return r.buffer().then(buf => {
          const base64 = buf.toString('base64');
          $(img).attr('src', `data:${contentType};base64,${base64}`);
        });
      })
      .catch(() => {
        $(img).remove();
      });
    imgPromises.push(p);
  });

  await Promise.all(imgPromises);

  // 2. Agora, a lógica de limpeza foi alterada para evitar duplicação.
  //    Vamos selecionar apenas os "filhos diretos" de #marcacao que são permitidos.
  const allowed = 'h1,h2,h3,p,ul,li,a,img';
  const $clean = cheerio.load('<div></div>')('div');

  // Seleciona os filhos diretos de #marcacao que estão na lista de permitidos
  $marc.children(allowed).each((i, el) => {
    // Clona o elemento e todos os seus filhos de uma vez
    $clean.append($(el).clone());
  });

  // 3. Remove os "a" que são apenas links de índice, para não duplicar o texto do índice
  $clean.find('ul a').each((i, el) => {
    $(el).attr('href', '#');
  });

  // 4. Envia o HTML limpo e com as imagens convertidas
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send($clean.html());
}
