import React, { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [data, setData] = useState(null);

  const handle = async () => {
    try {
      const res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      console.log('Retorno da API:', json);
      setData(json);
    } catch (err) {
      console.error('Erro ao buscar:', err);
    }
  };

  const baixarImagem = () => {
    if (!data?.imagemDestacadaBase64) return;
    const a = document.createElement('a');
    a.href = data.imagemDestacadaBase64;
    a.download = `${data.titulo}.jpg`; // Nome igual ao título original
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: 'auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Extrair artigo e converter imagens para Base64
      </h1>

      <input
        type="text"
        placeholder="Cole a URL do artigo"
        style={{ width: '100%', padding: 10, marginBottom: 10 }}
        value={url}
        onChange={e => setUrl(e.target.value)}
      />

      <button
        onClick={handle}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0070f3',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 4
        }}
      >
        Gerar HTML
      </button>

      {data && (
        <div style={{ marginTop: 30 }}>
          <h2>Informações do Artigo</h2>
          <p><strong>Título:</strong> {data.titulo}</p>
          <p><strong>Descrição:</strong> {data.descricao}</p>
          <p><strong>Palavra-chave:</strong> {data.palavraChave}</p>
          <p><strong>Slug:</strong> {data.slug}</p>

          {data.imagemDestacadaBase64 && (
            <div style={{ marginBottom: 20 }}>
              <h3>Imagem de Destaque</h3>
              <img
                src={data.imagemDestacadaBase64}
                alt="Imagem de destaque"
                style={{ maxWidth: '200px', display: 'block', marginBottom: 10 }}
              />
              <button
                onClick={baixarImagem}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              >
                Baixar Imagem
              </button>
            </div>
          )}

          <h2>HTML Gerado</h2>
          <textarea
            rows="12"
            style={{ width: '100%', padding: 10, fontFamily: 'monospace', resize: 'vertical' }}
            value={data.html}
            readOnly
          />

          <h2>Preview</h2>
          <div
            style={{
              padding: 15,
              border: '1px solid #ddd',
              backgroundColor: '#fafafa',
              borderRadius: 4
            }}
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
        </div>
      )}
    </div>
  );
}
