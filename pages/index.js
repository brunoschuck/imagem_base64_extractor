import React, { useState } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [html, setHtml] = useState('');

  const handle = async () => {
    const res = await fetch(`/api/fetch?url=${encodeURIComponent(url)}`);
    const data = await res.text();
    console.log('HTML retornado:', data); // 🔍 DEBUG
    setHtml(data);
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: 'auto' }}>
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
      <button onClick={handle} style={{ padding: '10px 20px' }}>
        Gerar HTML
      </button>

      {html && (
        <div style={{ marginTop: 30 }}>
          <h2>HTML gerado:</h2>
          <textarea
            rows="12"
            style={{ width: '100%', padding: 10, fontFamily: 'monospace' }}
            value={html}
            readOnly
          />
          <h2>Preview:</h2>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      )}
    </div>
  );
}
