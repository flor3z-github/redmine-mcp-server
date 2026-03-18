interface AuthPageOptions {
  redmineUrl: string;
  authSessionToken: string;
  error?: string;
}

export function renderAuthPage(options: AuthPageOptions): string {
  const { redmineUrl, authSessionToken, error } = options;

  const errorHtml = error
    ? `<div class="error">${escapeHtml(error)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redmine MCP Server 인증</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 16px rgba(0,0,0,0.1);
      padding: 40px;
      max-width: 440px;
      width: 100%;
    }
    h1 {
      font-size: 1.4rem;
      color: #333;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 24px;
    }
    .redmine-url {
      background: #f0f0f0;
      border-radius: 6px;
      padding: 8px 12px;
      font-family: monospace;
      font-size: 0.85rem;
      color: #555;
      margin-bottom: 24px;
      word-break: break-all;
    }
    label {
      display: block;
      font-weight: 600;
      color: #444;
      margin-bottom: 6px;
      font-size: 0.9rem;
    }
    input[type="password"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="password"]:focus {
      border-color: #4a90d9;
      box-shadow: 0 0 0 3px rgba(74,144,217,0.15);
    }
    button {
      width: 100%;
      padding: 12px;
      background: #4a90d9;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      transition: background 0.2s;
    }
    button:hover { background: #3a7bc8; }
    button:active { background: #2d6ab0; }
    .error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 0.9rem;
      margin-bottom: 16px;
    }
    .help {
      margin-top: 20px;
      font-size: 0.8rem;
      color: #999;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Redmine MCP Server 인증</h1>
    <p class="subtitle">MCP 클라이언트 연결을 위해 Redmine API Key를 입력하세요.</p>
    <div class="redmine-url">${escapeHtml(redmineUrl)}</div>
    ${errorHtml}
    <form method="POST" action="/authorize/callback">
      <input type="hidden" name="authSessionToken" value="${escapeHtml(authSessionToken)}" />
      <label for="apiKey">Redmine API Key</label>
      <input type="password" id="apiKey" name="apiKey" required placeholder="API Key를 입력하세요" autocomplete="off" />
      <button type="submit">인증</button>
    </form>
    <p class="help">API Key는 Redmine &gt; 내 계정 &gt; API 액세스 키에서 확인할 수 있습니다.</p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
