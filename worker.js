/**
 * ==================================================================================================
 *
 *    ###   Lyzr AI 旗舰智能枢纽 (Flagship Intelligent Hub) Cloudflare Worker v3.0.1   ###
 *
 *   由世界级的 Serverless 架构师与全栈开发专家为您精心打造的艺术品级应用。
 *   此版本已从“多 Agent 智能网关”升格为“旗舰智能枢纽”，不仅具备动态 Agent 路由、
 *   伪流式代理等核心功能，更集成了巅峰级交互面板、第三方客户端适配指南和企业级健壮性。
 *
 * ==================================================================================================
 *
 *   ### v3.0.1 升级 (Changelog) ###
 *
 *   1.  **[关键修复] 前端语法健壮性提升**:
 *       - 彻底解决了 v3.0 中因模板字符串嵌套导致的 'Uncaught SyntaxError' 问题。
 *       - 将前端脚本中的字符串拼接逻辑全部重构为使用 '+' 操作符，消除了所有解析歧义，确保在任何环境下都能稳定运行。
 *
 *   2.  **UI/UX 巅峰重塑 (继承自 v3.0)**:
 *       - 优雅的 Toast 通知、增强型 API 测试器（含动态加载、清空功能）、完美保留格式的 AI 回答区。
 *
 *   3.  **杀手级特性: 第三方客户端适配指南 (继承自 v3.0)**:
 *       - 详尽指导如何在 ChatBox, LobeChat 等主流客户端中配置使用。
 *
 *   4.  **企业级健壮性 (继承自 v3.0)**:
 *       - 全局错误捕获机制，确保服务永不崩溃。
 *
 * ==================================================================================================
 *   版本: 3.0.1 (Stability Patch)
 *   架构师: [您的专属架构师]
 * ==================================================================================================
 */


// =================================================================================
// ⚙️ 1. 全局配置中心 (Global Configuration Center)
// =================================================================================

// --- 全局元信息配置 ---
const GLOBAL_CONFIG = {
  WORKER_NAME: 'Lyzr AI 旗舰智能枢纽',
  WORKER_VERSION: '3.0.1',
  // 这是您暴露给客户端的 API 密钥，请务必修改为一个难以猜测的强密码
  GATEWAY_API_KEY: '1',
};

// --- 上游与 Agent 映射配置 ---
const AGENT_MAPPING_CONFIG = {
  // --- 上游 API 地址 ---
  UPSTREAM_API_URL: 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/',

  // --- 多 Agent 配置中心 ---
  // 在这里，我们将客户端看到的“模型名称”映射到上游所需的 agent_id 和 upstream_api_key
  // 键 (e.g., 'Claude Sonnet 3.7') 是暴露给客户端的模型名称
  // 值是一个包含 agent_id 和 upstream_api_key 的对象
  AGENTS: {
    'Claude Sonnet 3.7': {
      agent_id: '68a432d16e1baa11945cbcb3',
      upstream_api_key: 'sk-default-qXBq2tAincHBVJD4T3ttQkA9S20dETVb',
      description: '强大的 Claude Sonnet 3.7 模型，综合性能优秀。'
    },
    'Sonar Pro': {
      agent_id: '68a431a658203a80ebac7ef4',
      upstream_api_key: 'sk-default-CBCEYhA1c48yohThVSpvcaIJCn49zlWf',
      description: '高效的 Sonar Pro 模型，响应速度快。'
    },
    // 您可以在此添加更多 Agent, 例如:
    // 'Your-Custom-Agent-Name': {
    //   agent_id: 'your-agent-id',
    //   upstream_api_key: 'your-upstream-api-key',
    //   description: '这是一个自定义的 Agent。'
    // }
  },

  // --- API 默认值 ---
  DEFAULT_MODEL_NAME: 'Claude Sonnet 3.7', // 当客户端未指定模型时，使用此模型
  DEFAULT_USER_ID: 'user-from-cloudflare-worker@example.com',
  DEFAULT_SESSION_ID: () => `session-${crypto.randomUUID()}`,

  // --- 伪流式传输配置 ---
  PSEUDO_STREAM_CHUNK_SIZE: 3, // 每次发送的字符数，可调整以获得不同体验
  PSEUDO_STREAM_DELAY_MS: 5,   // 每个字符块之间的延迟（毫秒），模拟打字机效果
};


// =================================================================================
// 🚀 2. Worker 主入口 (Worker Entrypoint)
// =================================================================================

export default {
  /**
   * Worker 的主 fetch 处理函数
   * @param {Request} request - 传入的请求对象
   * @param {object} env - Cloudflare 环境变量
   * @param {object} ctx - 执行上下文
   * @returns {Promise<Response>} - 返回的响应对象
   */
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // 根路径 GET 请求，返回旗舰交互面板
      if (url.pathname === '/' && request.method === 'GET') {
        return handleGuiRequest(request);
      }
      // /v1/ 路径下的所有 API 请求
      if (url.pathname.startsWith('/v1/')) {
        return await handleApiRequest(request);
      }
      // 其他所有路径返回 404
      return new Response('🚫 404 Not Found. 请访问根路径 `/` 以打开旗舰交互面板。', { status: 404 });
    } catch (error) {
      // 全局顶级错误捕获，确保任何意外都不会导致 Worker 崩溃
      console.error('全局捕获到未处理的异常 (Global Unhandled Exception):', error);
      return new Response(JSON.stringify({
        error: {
          message: `服务器内部发生意外错误: ${error.message}`,
          type: 'internal_server_error',
          code: 'unhandled_exception'
        }
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }
  }
};


// =================================================================================
// 🔌 3. API 请求处理器 (API Request Handler)
// =================================================================================

/**
 * 处理所有 /v1/ 路径下的 API 请求
 * @param {Request} request - 传入的请求对象
 * @returns {Promise<Response>}
 */
async function handleApiRequest(request) {
  const url = new URL(request.url);

  // 预检请求（CORS Preflight）
  if (request.method === 'OPTIONS') {
    return handleCors();
  }

  // 身份认证
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || authHeader !== `Bearer ${GLOBAL_CONFIG.GATEWAY_API_KEY}`) {
    return new Response(JSON.stringify({ error: { message: '无效的 API 密钥。请检查您的 Authorization 请求头。', type: 'auth_error' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }

  // API 内部路由
  if (url.pathname === '/v1/models' && request.method === 'GET') {
    return handleModelsRequest();
  }
  if (url.pathname === '/v1/chat/completions' && request.method === 'POST') {
    return await handleChatCompletions(request);
  }

  // 未找到匹配的 API 路由
  return new Response(JSON.stringify({ error: { message: 'API 端点未找到。有效端点为 /v1/models 和 /v1/chat/completions。' } }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

/**
 * 处理 /v1/models 请求，动态生成并返回模型列表
 * @returns {Response}
 */
function handleModelsRequest() {
  const models = Object.keys(AGENT_MAPPING_CONFIG.AGENTS).map(modelId => ({
    id: modelId,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'lyzr-ai-gateway'
  }));

  return new Response(JSON.stringify({ object: 'list', data: models }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

/**
 * 核心逻辑：处理聊天补全请求，动态选择 Agent 并与上游 API 通信
 * @param {Request} request - 传入的 POST 请求
 * @returns {Promise<Response>}
 */
async function handleChatCompletions(request) {
  let requestBody;
  try {
    requestBody = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: '请求体不是有效的 JSON 格式。' } }), { status: 400, headers: corsHeaders() });
  }

  const modelName = requestBody.model || AGENT_MAPPING_CONFIG.DEFAULT_MODEL_NAME;
  const agentConfig = AGENT_MAPPING_CONFIG.AGENTS[modelName];

  if (!agentConfig) {
    return new Response(JSON.stringify({ error: { message: `模型 '${modelName}' 未在配置中找到。请通过 /v1/models 接口查询可用模型。`, type: 'invalid_request_error' } }), { status: 404, headers: corsHeaders() });
  }

  const userMessage = requestBody.messages?.find(m => m.role === 'user')?.content;
  if (!userMessage) {
    return new Response(JSON.stringify({ error: { message: "请求体 'messages' 数组中未找到 'role' 为 'user' 的消息。" } }), { status: 400, headers: corsHeaders() });
  }

  const upstreamPayload = {
    user_id: AGENT_MAPPING_CONFIG.DEFAULT_USER_ID,
    agent_id: agentConfig.agent_id, // <-- 动态使用 Agent ID
    session_id: AGENT_MAPPING_CONFIG.DEFAULT_SESSION_ID(),
    message: userMessage,
  };

  const upstreamHeaders = {
    'Content-Type': 'application/json',
    'x-api-key': agentConfig.upstream_api_key, // <-- 动态使用上游 API Key
    'Origin': 'https://www.needitbuildit.site',
    'Referer': 'https://www.needitbuildit.site/',
    'User-Agent': `Cloudflare-Worker-${GLOBAL_CONFIG.WORKER_NAME}/${GLOBAL_CONFIG.WORKER_VERSION}`,
  };

  try {
    const upstreamResponse = await fetch(AGENT_MAPPING_CONFIG.UPSTREAM_API_URL, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(upstreamPayload),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error(`上游 API 错误 (${upstreamResponse.status}):`, errorText);
      throw new Error(`上游 API 返回错误: 状态码 ${upstreamResponse.status}`);
    }

    const upstreamData = await upstreamResponse.json();
    const answer = upstreamData.response;

    if (typeof answer !== 'string') {
      throw new Error("上游响应格式不正确，未找到 'response' 字符串字段。");
    }

    // 根据客户端请求决定返回流式响应还是单次响应
    if (requestBody.stream) {
      const stream = createPseudoStream(answer, modelName);
      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', ...corsHeaders() }
      });
    } else {
      const completionData = {
        id: `chatcmpl-${crypto.randomUUID()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: modelName,
        choices: [{ index: 0, message: { role: "assistant", content: answer }, finish_reason: "stop" }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, // Lyzr 不提供 token 计数，用 0 填充以兼容
      };
      return new Response(JSON.stringify(completionData), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }

  } catch (error) {
    console.error('处理聊天补全请求时出错 (Error in handleChatCompletions):', error);
    return new Response(JSON.stringify({ error: { message: error.message, type: 'api_error' } }), {
      status: 502, // 502 Bad Gateway 更适合表示上游问题
      headers: { 'Content-Type': 'application/json', ...corsHeaders() }
    });
  }
}

/**
 * 创建一个伪 SSE (Server-Sent Events) 流，将一次性文本响应模拟成流式输出
 * @param {string} fullText - 完整的 AI 回答文本
 * @param {string} modelName - 使用的模型名称
 * @returns {ReadableStream} - 一个符合 OpenAI 流式格式的 ReadableStream
 */
function createPseudoStream(fullText, modelName) {
  const encoder = new TextEncoder();
  const requestId = `chatcmpl-${crypto.randomUUID()}`;
  const { PSEUDO_STREAM_CHUNK_SIZE, PSEUDO_STREAM_DELAY_MS } = AGENT_MAPPING_CONFIG;

  return new ReadableStream({
    async start(controller) {
      try {
        // 逐块发送内容
        for (let i = 0; i < fullText.length; i += PSEUDO_STREAM_CHUNK_SIZE) {
          const chunkContent = fullText.substring(i, i + PSEUDO_STREAM_CHUNK_SIZE);
          const chunk = {
            id: requestId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model: modelName,
            choices: [{ index: 0, delta: { content: chunkContent }, finish_reason: null }]
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          if (PSEUDO_STREAM_DELAY_MS > 0) {
            await new Promise(resolve => setTimeout(resolve, PSEUDO_STREAM_DELAY_MS));
          }
        }
        // 发送结束标志
        const finalChunk = {
          id: requestId,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: modelName,
          choices: [{ index: 0, delta: {}, finish_reason: "stop" }]
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (e) {
        console.error('伪流式传输中发生错误 (Error in pseudo-stream):', e);
        const errorChunk = { error: { message: `流式传输中断: ${e.message}` } };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorChunk)}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } finally {
        controller.close();
      }
    }
  });
}

/**
 * 返回标准的 CORS 跨域请求头
 * @returns {object}
 */
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

/**
 * 处理 CORS 预检请求
 * @returns {Response}
 */
function handleCors() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}


// =================================================================================
// 🎨 4. 旗舰级交互式 UI (Flagship Interactive UI)
// =================================================================================

/**
 * 生成并返回旗舰版交互式 HTML 面板
 * @param {Request} request - 传入的请求对象
 * @returns {Response}
 */
function handleGuiRequest(request) {
  const workerUrl = new URL(request.url).origin;

  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>✨ ${GLOBAL_CONFIG.WORKER_NAME} v${GLOBAL_CONFIG.WORKER_VERSION} ✨</title>
    <style>
        :root {
            --bg-color: #1a1b26; --text-color: #c0caf5; --primary-color: #7aa2f7;
            --secondary-color: #24283b; --border-color: #414868; --pre-bg: #1f2335;
            --code-color: #a9b1d6; --success-color: #9ece6a; --error-color: #f7768e;
            --warning-color: #e0af68; --toast-bg: #3b4261;
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: var(--bg-color); color: var(--text-color); margin: 0; padding: 2rem; line-height: 1.7; font-size: 16px; }
        .container { max-width: 900px; margin: 0 auto; }
        header { text-align: center; margin-bottom: 3rem; }
        h1 { color: var(--primary-color); font-size: 2.5rem; margin: 0; letter-spacing: -1px; }
        h1 span { font-weight: 300; }
        h2 { color: var(--primary-color); border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; margin-top: 2.5rem; font-size: 1.5rem; }
        section { background-color: var(--secondary-color); border-radius: 10px; padding: 1.5rem; margin-bottom: 2rem; box-shadow: 0 8px 16px rgba(0,0,0,0.2); }
        pre { background-color: var(--pre-bg); color: var(--code-color); padding: 1rem; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; position: relative; border: 1px solid var(--border-color); }
        .copyable pre { cursor: copy; }
        code { font-family: 'Fira Code', 'JetBrains Mono', 'Courier New', monospace; background-color: var(--pre-bg); padding: 0.2em 0.4em; border-radius: 4px; }
        .api-tester textarea, .api-tester select { width: 100%; box-sizing: border-box; background-color: var(--pre-bg); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.8rem; margin-bottom: 1rem; font-size: 1rem; resize: vertical; }
        .button-group { display: flex; gap: 1rem; }
        .api-tester button { background-color: var(--primary-color); color: #1a1b26; border: none; padding: 0.8rem 1.5rem; border-radius: 6px; cursor: pointer; font-size: 1rem; font-weight: bold; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .api-tester button.secondary { background-color: var(--border-color); }
        .api-tester button:disabled { background-color: #565f89; color: #a9b1d6; cursor: not-allowed; }
        .api-tester button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(122, 162, 247, 0.3); }
        #result-area { min-height: 150px; margin-top: 1rem; background-color: var(--pre-bg); border: 1px solid var(--border-color); padding: 1rem; border-radius: 6px; }
        .loading-text { color: var(--warning-color); animation: blink 1.5s infinite ease-in-out; }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        footer { text-align: center; margin-top: 4rem; color: #565f89; font-size: 0.9em; }
        .endpoint-method { display: inline-block; padding: 0.2em 0.6em; border-radius: 4px; font-weight: bold; color: #1a1b26; margin-right: 0.8rem; font-size: 0.9em; }
        .post { background-color: var(--success-color); }
        .get { background-color: var(--primary-color); }
        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        #toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; }
        .toast { background-color: var(--toast-bg); color: var(--text-color); padding: 12px 20px; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); margin-bottom: 10px; opacity: 0; transform: translateX(100%); animation: slideIn 0.5s forwards; }
        @keyframes slideIn { to { opacity: 1; transform: translateX(0); } }
    </style>
</head>
<body>
    <div id="toast-container"></div>
    <div class="container">
        <header>
            <h1>✨ ${GLOBAL_CONFIG.WORKER_NAME} <span>v${GLOBAL_CONFIG.WORKER_VERSION}</span> ✨</h1>
            <p>一个支持多 Agent、兼容 OpenAI、具备伪流式能力的旗舰级智能枢纽</p>
        </header>

        <main>
            <section>
                <h2>🚀 快速开始 (Quick Start)</h2>
                <p>将以下信息填入任何兼容 OpenAI API 的第三方客户端即可开始使用。</p>
                <div class="copyable">
                    <strong>API 地址 (Base URL):</strong>
                    <pre><code>${workerUrl}/v1</code></pre>
                </div>
                <div class="copyable">
                    <strong>API 密钥 (API Key):</strong>
                    <pre><code>${GLOBAL_CONFIG.GATEWAY_API_KEY}</code></pre>
                </div>
                <strong>可用模型 (Available Models):</strong>
                <p>您可以使用默认模型 <code>${AGENT_MAPPING_CONFIG.DEFAULT_MODEL_NAME}</code>，或从下方模型列表中选择，并在客户端中指定。</p>
            </section>

            <section>
                <h2>🧩 第三方客户端适配指南 (3rd-Party Client Guide)</h2>
                <p>本网关可与 <strong>ChatBox, LobeChat, OpenWebUI, NextChat</strong> 等所有支持 OpenAI API 规范的客户端无缝集成。</p>
                <p>配置方法如下:</p>
                <ol>
                    <li>打开客户端的设置界面，找到 API 相关配置。</li>
                    <li>将 <strong>API 地址</strong> (或称 'API Host', 'Base URL') 设置为上面的 <code>${workerUrl}/v1</code>。</li>
                    <li>将 <strong>API 密钥</strong> (或称 'API Key') 设置为上面的 <code>${GLOBAL_CONFIG.GATEWAY_API_KEY}</code>。</li>
                    <li>在模型选择列表中，手动输入或选择您想使用的模型名称，例如 <code>${Object.keys(AGENT_MAPPING_CONFIG.AGENTS)[0]}</code>。</li>
                    <li>保存设置，即可开始对话！</li>
                </ol>
            </section>

            <section class="api-tester">
                <h2>🛠️ 在线 API 测试 (Live API Tester)</h2>
                <p>直接在此页面测试 <code>/v1/chat/completions</code> 流式接口。</p>
                
                <label for="model-select"><strong>1. 选择一个 Agent (模型):</strong></label>
                <select id="model-select"><option>正在加载模型...</option></select>

                <label for="prompt-input"><strong>2. 输入您的问题:</strong></label>
                <textarea id="prompt-input" rows="4" placeholder="例如：你好，请介绍一下你自己。"></textarea>
                
                <div class="button-group">
                    <button id="send-button">
                        <svg id="send-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        <svg id="spinner-icon" class="spinner" style="display:none;" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                        <span id="send-button-text">发送</span>
                    </button>
                    <button id="clear-button" class="secondary">清空结果</button>
                </div>
              
                <strong>AI 回答 (实时流式渲染):</strong>
                <pre id="result-area">... 等待您的指令 ...</pre>
            </section>
        </main>

        <footer>
            <p>由世界级的 Serverless 架构师为您倾力打造</p>
        </footer>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const modelSelect = document.getElementById('model-select');
            const sendButton = document.getElementById('send-button');
            const clearButton = document.getElementById('clear-button');
            const promptInput = document.getElementById('prompt-input');
            const resultArea = document.getElementById('result-area');
            const sendButtonText = document.getElementById('send-button-text');
            const sendIcon = document.getElementById('send-icon');
            const spinnerIcon = document.getElementById('spinner-icon');
            const apiKey = '${GLOBAL_CONFIG.GATEWAY_API_KEY}';

            // --- UI 辅助函数 ---
            function showToast(message) {
                const container = document.getElementById('toast-container');
                const toast = document.createElement('div');
                toast.className = 'toast';
                toast.textContent = message;
                container.appendChild(toast);
                setTimeout(() => {
                    toast.style.animation = 'slideOut 0.5s forwards';
                    setTimeout(() => toast.remove(), 500);
                }, 3000);
            }
            
            function setLoadingState(isLoading) {
                if (isLoading) {
                    sendButton.disabled = true;
                    promptInput.disabled = true;
                    sendButtonText.textContent = '正在思考...';
                    sendIcon.style.display = 'none';
                    spinnerIcon.style.display = 'inline-block';
                } else {
                    sendButton.disabled = false;
                    promptInput.disabled = false;
                    sendButtonText.textContent = '发送';
                    sendIcon.style.display = 'inline-block';
                    spinnerIcon.style.display = 'none';
                }
            }

            // --- 核心功能 ---
            async function loadModels() {
                try {
                    const response = await fetch('/v1/models', {
                        headers: { 'Authorization': 'Bearer ' + apiKey }
                    });
                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.error.message || '无法加载模型列表');
                    }
                    
                    const data = await response.json();
                    modelSelect.innerHTML = ''; // 清空
                    data.data.forEach(model => {
                        const option = document.createElement('option');
                        option.value = model.id;
                        option.textContent = model.id;
                        modelSelect.appendChild(option);
                    });
                } catch (error) {
                    // [v3.0.1 修复] 使用 '+' 拼接字符串，避免模板字符串嵌套问题
                    modelSelect.innerHTML = '<option>' + error.message + '</option>';
                    modelSelect.disabled = true;
                }
            }
            
            loadModels();

            // 复制功能
            document.querySelectorAll('.copyable pre').forEach(pre => {
                pre.addEventListener('click', () => {
                    navigator.clipboard.writeText(pre.querySelector('code').innerText)
                        .then(() => showToast('✅ 已复制成功!'))
                        .catch(() => showToast('❌ 复制失败'));
                });
            });

            // 清空按钮
            clearButton.addEventListener('click', () => {
                resultArea.textContent = '... 等待您的指令 ...';
                promptInput.value = '';
                showToast('🗑️ 已清空');
            });

            // 发送按钮点击事件
            sendButton.addEventListener('click', async () => {
                const prompt = promptInput.value.trim();
                const modelName = modelSelect.value;

                if (!prompt || !modelName || modelSelect.disabled) {
                    showToast('⚠️ 请选择模型并输入问题！');
                    return;
                }

                setLoadingState(true);
                resultArea.innerHTML = '<span class="loading-text">🧠 正在连接智能枢纽...</span>';
                let fullContent = '';

                try {
                    const response = await fetch('/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + apiKey // [v3.0.1 修复] 使用 '+' 拼接
                        },
                        body: JSON.stringify({
                            model: modelName,
                            messages: [{ role: 'user', content: prompt }],
                            stream: true
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        // [v3.0.1 修复] 使用 '+' 拼接字符串，避免模板字符串嵌套问题
                        throw new Error('API 错误 (' + response.status + '): ' + (errorData.error.message || '未知错误'));
                    }

                    resultArea.textContent = '';
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder('utf-8');
                  
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\\n\\n').filter(line => line.trim().startsWith('data: '));

                        for (const line of lines) {
                            const dataStr = line.substring(6).trim();
                            if (dataStr === '[DONE]') break;
                            try {
                                const data = JSON.parse(dataStr);
                                if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                    fullContent += data.choices[0].delta.content;
                                    resultArea.textContent = fullContent;
                                    resultArea.scrollTop = resultArea.scrollHeight;
                                }
                            } catch (e) { 
                                console.error('解析 SSE 数据块失败:', dataStr, e);
                            }
                        }
                    }

                } catch (error) {
                    // [v3.0.1 修复] 使用 '+' 拼接字符串，避免模板字符串嵌套问题
                    resultArea.innerHTML = '<span style="color: var(--error-color);">请求失败: ' + error.message + '</span>';
                } finally {
                    setLoadingState(false);
                }
            });
        });
    </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
