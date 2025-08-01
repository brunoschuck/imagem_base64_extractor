import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL é obrigatória' });

  const htmlRaw = await fetch(url).then(r => r.text());
  const $ = cheerio.load(htmlRaw);
  const $marc = $('#marcacao');
  if (!$marc.length) return res.status(404).json({ error: 'Conteúdo não encontrado' });

  // 1. Processa e converte as imagens para Base64 antes de limpar o HTML
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

  // 2. Cria uma cópia limpa do conteúdo, preservando a estrutura
  const $clean = $marc.clone();

  // 3. Remove todos os elementos que não são permitidos
  const allowed = 'h1,h2,h3,p,ul,li,a,img';
  $clean.find(':not(' + allowed.replace(/,/g, ', ') + ')').remove();
  
  // 4. Remove elementos vazios que podem ter sobrado
  $clean.find(':empty:not(img)').remove();

  // 5. Envia o HTML limpo e com as imagens convertidas
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send($clean.html());
}
