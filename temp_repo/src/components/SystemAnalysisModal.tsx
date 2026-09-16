import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Database,
  Server,
  Code2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  RefreshCw,
  Sparkles,
  CreditCard,
  MessageCircle,
  Layers,
  ChevronRight,
  Terminal,
  Cpu,
  HelpCircle,
  X,
  Lock,
  Globe,
} from 'lucide-react';
import { dataStore } from '../lib/supabase';

interface SystemAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdmin?: () => void;
}

export const SystemAnalysisModal: React.FC<SystemAnalysisModalProps> = ({
  isOpen,
  onClose,
  onOpenAdmin,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'apis' | 'database' | 'future'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [serverHealth, setServerHealth] = useState<{
    loading: boolean;
    status: 'idle' | 'ok' | 'error';
    data: any;
  }>({ loading: false, status: 'idle', data: null });

  const [supabaseStatus, setSupabaseStatus] = useState<{
    loading: boolean;
    connected: boolean;
    tested: boolean;
    message: string;
  }>({ loading: false, connected: false, tested: false, message: '' });

  // Check health on mount or tab change
  useEffect(() => {
    if (isOpen) {
      checkServer();
      checkSupabase();
    }
  }, [isOpen]);

  const checkServer = async () => {
    setServerHealth({ loading: true, status: 'idle', data: null });
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const json = await res.json();
        setServerHealth({ loading: false, status: 'ok', data: json });
      } else {
        setServerHealth({ loading: false, status: 'error', data: { error: `HTTP ${res.status}` } });
      }
    } catch (err: any) {
      setServerHealth({ loading: false, status: 'error', data: { error: err.message } });
    }
  };

  const checkSupabase = async () => {
    setSupabaseStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await dataStore.testSupabaseConnection();
      setSupabaseStatus({
        loading: false,
        connected: res.connected,
        tested: true,
        message: res.message,
      });
    } catch (err: any) {
      setSupabaseStatus({
        loading: false,
        connected: false,
        tested: true,
        message: err.message || 'Erro ao consultar Supabase',
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-[#FAF7F0] border border-[#3A2E1F]/20 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#3A2E1F] text-[#F3ECDD] px-6 py-4 flex items-center justify-between border-b border-[#3A2E1F]/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#B8623F] flex items-center justify-center text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg tracking-tight text-[#FAF7F0]">
                  Diagnóstico & Análise do Sistema
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#B7A05E]/30 text-[#EADBBA]">
                  Affeto Pães
                </span>
              </div>
              <p className="text-xs text-[#EADBBA]/80">
                Repositório: github.com/elienayh/affeto • Arquitetura & Chaves API
              </p>
            </div>
          </div>
          <button
            id="btn-close-analysis-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-[#EADBBA] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="bg-[#F3ECDD] px-6 py-2.5 border-b border-[#3A2E1F]/10 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[#7E6C58]">Express Backend:</span>
              {serverHealth.loading ? (
                <span className="text-[#B7A05E] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Verificando...
                </span>
              ) : serverHealth.status === 'ok' ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ativo (Porta 3000)
                </span>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Local/Fallback
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#7E6C58]">Supabase:</span>
              {supabaseStatus.loading ? (
                <span className="text-[#B7A05E] flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Verificando...
                </span>
              ) : supabaseStatus.connected ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Conectado (Nuvem)
                </span>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-1" title="Emulando localmente via localStorage & mockData">
                  <AlertCircle className="w-3.5 h-3.5" /> Fallback Local Ativo
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                checkServer();
                checkSupabase();
              }}
              className="text-xs text-[#3A2E1F] hover:text-[#B8623F] font-medium flex items-center gap-1 bg-white/70 px-2.5 py-1 rounded-md border border-[#3A2E1F]/10 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reverificar
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#3A2E1F]/10 bg-[#FFFFFF] px-6 gap-2 shrink-0">
          <button
            id="tab-analise-overview"
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'border-[#B8623F] text-[#B8623F]'
                : 'border-transparent text-[#7E6C58] hover:text-[#3A2E1F]'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Visão Arquitetural</span>
          </button>
          <button
            id="tab-analise-apis"
            onClick={() => setActiveTab('apis')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'apis'
                ? 'border-[#B8623F] text-[#B8623F]'
                : 'border-transparent text-[#7E6C58] hover:text-[#3A2E1F]'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Chaves de API Necessárias</span>
          </button>
          <button
            id="tab-analise-database"
            onClick={() => setActiveTab('database')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'database'
                ? 'border-[#B8623F] text-[#B8623F]'
                : 'border-transparent text-[#7E6C58] hover:text-[#3A2E1F]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Banco & Supabase</span>
          </button>
          <button
            id="tab-analise-future"
            onClick={() => setActiveTab('future')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'future'
                ? 'border-[#B8623F] text-[#B8623F]'
                : 'border-transparent text-[#7E6C58] hover:text-[#3A2E1F]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Configurações Futuras</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-[#3A2E1F]">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#3A2E1F] mb-1">
                  Visão Geral do Sistema: Affeto Pães
                </h3>
                <p className="text-xs text-[#7E6C58] leading-relaxed">
                  O repositório <code className="text-[#B8623F] font-mono font-semibold">elienayh/affeto</code> é um sistema e-commerce especializado para padaria artesanal e confeitaria com foco em fermentação natural (Sourdough), operação por lotes/fornadas agendadas, cálculo de frete por CEP/região e painel administrativo completo.
                </p>
              </div>

              {/* Grid of architectural components */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#3A2E1F]/10 space-y-2">
                  <div className="flex items-center gap-2 text-[#B8623F] font-semibold text-xs uppercase tracking-wider">
                    <Code2 className="w-4 h-4" />
                    <span>Frontend & Experiência Mobile-First</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-[#554432]">
                    <li>• <strong>React 19 & TypeScript:</strong> Tipagem estrita de pedidos, produtos, variações e cupons.</li>
                    <li>• <strong>Tailwind CSS v4:</strong> Paleta artesanal com tons quentes (Creme, Ouro, Terracota, Marrom).</li>
                    <li>• <strong>Motion:</strong> Animações suaves de drawer de carrinho, modais e transições de checkout.</li>
                    <li>• <strong>Catálogo & Customização:</strong> Opções de fatiamento de pães, adicionais, observações e favoritos.</li>
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#3A2E1F]/10 space-y-2">
                  <div className="flex items-center gap-2 text-[#B8623F] font-semibold text-xs uppercase tracking-wider">
                    <Server className="w-4 h-4" />
                    <span>Backend Server-Side (Express + Vite)</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-[#554432]">
                    <li>• <strong>Pricing Engine Server-Side:</strong> Endpoint <code>/api/pricing/calculate</code> garante que preços, taxas e cupons nunca sejam forjados pelo cliente.</li>
                    <li>• <strong>Mercado Pago Webhook:</strong> Endpoint <code>/api/webhooks/mercadopago</code> para receber confirmação de pagamentos PIX/Cartão com idempotência.</li>
                    <li>• <strong>Health Check:</strong> <code>/api/health</code> validando integridade do serviço.</li>
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#3A2E1F]/10 space-y-2">
                  <div className="flex items-center gap-2 text-[#B8623F] font-semibold text-xs uppercase tracking-wider">
                    <Database className="w-4 h-4" />
                    <span>Banco de Dados & Persistência Híbrida</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-[#554432]">
                    <li>• <strong>Supabase (PostgreSQL):</strong> 28 tabelas modeladas com RLS, triggers de atualização e índices.</li>
                    <li>• <strong>Camada Dual Resiliente:</strong> Conecta ao Supabase na nuvem quando as credenciais são fornecidas, e comuta de forma transparente para armazenamento local/in-memory sem quebrar a navegação caso o banco esteja offline.</li>
                  </ul>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#3A2E1F]/10 space-y-2">
                  <div className="flex items-center gap-2 text-[#B8623F] font-semibold text-xs uppercase tracking-wider">
                    <Shield className="w-4 h-4" />
                    <span>Painel de Gestão & Operação</span>
                  </div>
                  <ul className="text-xs space-y-1.5 text-[#554432]">
                    <li>• <strong>Kanban de Pedidos:</strong> Acompanhamento de 8 etapas do pedido (Aguardando Pagamento, Confirmado, Produção, Pronto, Entrega, Finalizado).</li>
                    <li>• <strong>Gestão de Cardápio:</strong> Cadastro completo de pães, variações, lotes e fotos.</li>
                    <li>• <strong>Zonas de Entrega & CEPs:</strong> Configuração de taxas por bairro e raio de atendimento.</li>
                  </ul>
                </div>
              </div>

              {/* Business Rules highlights */}
              <div className="bg-[#F3ECDD]/60 p-4 rounded-xl border border-[#3A2E1F]/10 space-y-2">
                <h4 className="font-semibold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Regras de Negócio Críticas Implementadas (Prompt v2)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#554432]">
                  <div className="p-2.5 bg-white/80 rounded-lg">
                    <strong>Fonte Única de Preço:</strong> Subtotal, desconto de cupom, taxa de entrega e total são recalculados no servidor. Preço enviado pelo cliente é sempre desconsiderado.
                  </div>
                  <div className="p-2.5 bg-white/80 rounded-lg">
                    <strong>Desacoplamento de Status:</strong> O status do pedido (<code>order_status</code>) opera de forma independente do status do pagamento (<code>payment_status</code>), cada um com seu histórico.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: APIS */}
          {activeTab === 'apis' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#3A2E1F] mb-1">
                  Chaves de API & Variáveis de Ambiente
                </h3>
                <p className="text-xs text-[#7E6C58]">
                  Para conectar o sistema a serviços externos em produção, estas são as credenciais necessárias. O sistema já opera com dados de demonstração (fallback) enquanto você prepara suas chaves.
                </p>
              </div>

              {/* API Keys Table */}
              <div className="space-y-4">
                {/* Supabase Anon Key */}
                <div className="p-4 bg-white rounded-xl border border-[#3A2E1F]/15 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#3A2E1F] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#3A2E1F]/10">
                          VITE_SUPABASE_ANON_KEY
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Necessária para o Banco Real
                        </span>
                      </div>
                      <p className="text-xs text-[#554432] mt-1">
                        Chave pública anon do seu projeto Supabase. Permite que o catálogo e os pedidos sejam persistidos diretamente no PostgreSQL sob as regras de Row Level Security (RLS).
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#FAF7F0] p-2.5 rounded-lg text-xs space-y-1 border border-black/5">
                    <p className="text-[#7E6C58]">
                      <strong>Onde obter:</strong> Acesse seu painel no Supabase (<a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-[#B8623F] underline">supabase.com</a>) &gt; Selecione o Projeto &gt; <em>Project Settings</em> &gt; <em>API</em> &gt; Copie <strong>Project URL</strong> e <strong>anon public key</strong>.
                    </p>
                    <p className="text-[#7E6C58]">
                      <strong>URL do projeto configurada no código:</strong> <code className="font-mono text-[#3A2E1F]">https://ropgdbgkjghwdxdglchz.supabase.co</code>
                    </p>
                  </div>
                </div>

                {/* Mercado Pago Access Token */}
                <div className="p-4 bg-white rounded-xl border border-[#3A2E1F]/15 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#3A2E1F] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#3A2E1F]/10">
                          MERCADOPAGO_ACCESS_TOKEN
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Necessária para Pagamentos Reais
                        </span>
                      </div>
                      <p className="text-xs text-[#554432] mt-1">
                        Token de autorização do Mercado Pago para gerar cobranças PIX, boleto e cartão de crédito. Fica exclusivamente no servidor (nunca vai para o navegador).
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#FAF7F0] p-2.5 rounded-lg text-xs space-y-1 border border-black/5">
                    <p className="text-[#7E6C58]">
                      <strong>Onde obter:</strong> Acesse o portal Mercado Pago Developers (<a href="https://www.mercadopago.com.br/developers" target="_blank" rel="noreferrer" className="text-[#B8623F] underline">mercadopago.com.br/developers</a>) &gt; <em>Suas Aplicações</em> &gt; Crie ou selecione uma aplicação &gt; <em>Credenciais de teste</em> (Sandbox: <code>TEST-...</code>) ou <em>Credenciais de produção</em> (<code>APP_USR-...</code>).
                    </p>
                  </div>
                </div>

                {/* Mercado Pago Webhook Secret */}
                <div className="p-4 bg-white rounded-xl border border-[#3A2E1F]/15 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#3A2E1F] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#3A2E1F]/10">
                          MERCADOPAGO_WEBHOOK_SECRET
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          Segurança Webhook
                        </span>
                      </div>
                      <p className="text-xs text-[#554432] mt-1">
                        Chave de assinatura usada para validar o cabeçalho <code>x-signature</code> nas notificações enviadas pelo Mercado Pago quando um PIX é pago.
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#FAF7F0] p-2.5 rounded-lg text-xs text-[#7E6C58] border border-black/5">
                    <strong>URL do Webhook no seu servidor:</strong> <code className="font-mono text-[#3A2E1F]">/api/webhooks/mercadopago</code>
                  </div>
                </div>

                {/* Bakery WhatsApp Number */}
                <div className="p-4 bg-white rounded-xl border border-[#3A2E1F]/15 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#3A2E1F] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#3A2E1F]/10">
                          BAKERY_WHATSAPP_NUMBER
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Configurado
                        </span>
                      </div>
                      <p className="text-xs text-[#554432] mt-1">
                        Telefone de contato da padaria no padrão internacional (DDI + DDD + Número sem espaços ou traços). O cliente pode enviar o resumo formatado do pedido com um clique.
                      </p>
                    </div>
                  </div>
                  <div className="bg-[#FAF7F0] p-2.5 rounded-lg text-xs text-[#7E6C58] border border-black/5">
                    <strong>Valor padrão atual:</strong> <code className="font-mono text-[#3A2E1F]">5532984680513</code> (+55 32 98468-0513 - Espera Feliz, MG). Editável na aba de configurações da loja.
                  </div>
                </div>

                {/* Gemini AI Key */}
                <div className="p-4 bg-white rounded-xl border border-[#3A2E1F]/15 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#3A2E1F] bg-[#FAF7F0] px-2 py-0.5 rounded border border-[#3A2E1F]/10">
                          GEMINI_API_KEY
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          AI Studio Disponível
                        </span>
                      </div>
                      <p className="text-xs text-[#554432] mt-1">
                        Chave do Google Gemini para recursos inteligentes opcionais, como assistente culinário de harmonização de pães artesanais com vinhos/cafés e gerador automático de descrições e títulos para o cardápio.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Copy .env template box */}
              <div className="bg-[#3A2E1F] text-[#FAF7F0] p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#EADBBA]">
                    <Terminal className="w-4 h-4" />
                    <span>Modelo de Arquivo .env para Configuração</span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `# SUPABASE
VITE_SUPABASE_URL=https://ropgdbgkjghwdxdglchz.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key_aqui

# MERCADO PAGO
MERCADOPAGO_ACCESS_TOKEN=TEST-seu_token_aqui
MERCADOPAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui

# PADARIA WHATSAPP
VITE_BAKERY_WHATSAPP_NUMBER=5532984680513
`,
                        'env'
                      )
                    }
                    className="text-xs bg-[#B8623F] hover:bg-[#994E30] text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedKey === 'env' ? 'Copiado!' : 'Copiar Variáveis'}</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono bg-black/30 p-3 rounded-lg overflow-x-auto text-[#EADBBA] leading-relaxed">
{`VITE_SUPABASE_URL=https://ropgdbgkjghwdxdglchz.supabase.co
VITE_SUPABASE_ANON_KEY=seu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key_aqui
MERCADOPAGO_ACCESS_TOKEN=TEST-seu_access_token_aqui
MERCADOPAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui
VITE_BAKERY_WHATSAPP_NUMBER=5532984680513`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: DATABASE */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#3A2E1F] mb-1">
                  Estrutura do Banco de Dados (Supabase PostgreSQL)
                </h3>
                <p className="text-xs text-[#7E6C58]">
                  O projeto inclui o script DDL completo em <code className="font-mono text-[#B8623F]">supabase/schema.sql</code> com suporte a RLS (Row Level Security) e tabelas relacionais para o negócio.
                </p>
              </div>

              {/* Table entities list */}
              <div className="bg-white p-4 rounded-xl border border-[#3A2E1F]/15 space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#7E6C58] flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[#B8623F]" />
                  Entidades Modeladas no Schema (28 Tabelas)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs font-mono">
                  {[
                    'categories',
                    'products',
                    'product_images',
                    'product_options',
                    'orders',
                    'order_items',
                    'order_status_history',
                    'payments',
                    'payment_events',
                    'inventory',
                    'production_batches',
                    'delivery_zones',
                    'delivery_fees',
                    'coupons',
                    'coupon_usage',
                    'stores',
                    'business_hours',
                    'customers',
                    'profiles',
                    'favorites',
                    'loyalty_accounts',
                    'loyalty_transactions',
                    'cashback_accounts',
                    'referrals',
                    'notifications',
                  ].map((tbl) => (
                    <div
                      key={tbl}
                      className="px-2.5 py-1.5 bg-[#FAF7F0] border border-[#3A2E1F]/10 rounded-md text-[#3A2E1F] flex items-center gap-1.5"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B7A05E]"></span>
                      <span className="truncate">{tbl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions on how to run SQL */}
              <div className="bg-[#F3ECDD]/70 p-4 rounded-xl border border-[#3A2E1F]/15 space-y-2 text-xs">
                <h4 className="font-bold text-[#3A2E1F] flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-[#B8623F]" />
                  Como aplicar o Schema no Supabase:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-[#554432]">
                  <li>Acesse o dashboard do seu projeto Supabase.</li>
                  <li>Clique na barra lateral em <strong>SQL Editor</strong>.</li>
                  <li>Abra o arquivo <code className="font-mono text-[#B8623F]">supabase/schema.sql</code> existente neste projeto.</li>
                  <li>Cole o conteúdo no editor do Supabase e clique em <strong>Run</strong>.</li>
                  <li>Pronto! Todas as tabelas, índices e políticas de segurança RLS estarão criadas.</li>
                </ol>
              </div>

              {onOpenAdmin && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenAdmin();
                    }}
                    className="px-4 py-2 bg-[#B8623F] hover:bg-[#994E30] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Ir para aba Supabase no Painel Gestor</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FUTURE CONFIGURATIONS */}
          {activeTab === 'future' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif font-bold text-xl text-[#3A2E1F] mb-1">
                  Configurações Futuras & Roadmap (Pós-MVP)
                </h3>
                <p className="text-xs text-[#7E6C58]">
                  Você mencionou querer realizar algumas configurações no futuro. O sistema já foi estruturado com serviços desacoplados para que você possa ativar estes recursos progressivamente.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Programa de Fidelidade */}
                <div className="bg-white p-4 rounded-xl border border-[#3A2E1F]/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#B7A05E]" />
                      Programa de Fidelidade (Pontos)
                    </h4>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                      Serviço Pronto
                    </span>
                  </div>
                  <p className="text-xs text-[#554432]">
                    Localizado em <code className="font-mono text-[#B8623F]">src/services/loyaltyService.ts</code>. Permite pontuação a cada R$ gasto em compras e resgate de produtos especiais ou pães de brinde.
                  </p>
                  <div className="text-[11px] text-[#7E6C58] bg-[#FAF7F0] p-2 rounded">
                    <strong>Futura Configuração:</strong> Definir no painel o fator de conversão (ex: 1 ponto a cada R$ 5,00) e recompensas disponíveis.
                  </div>
                </div>

                {/* Cashback */}
                <div className="bg-white p-4 rounded-xl border border-[#3A2E1F]/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      Carteira de Cashback
                    </h4>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Serviço Pronto
                    </span>
                  </div>
                  <p className="text-xs text-[#554432]">
                    Localizado em <code className="font-mono text-[#B8623F]">src/services/cashbackService.ts</code>. Retorna uma porcentagem do valor gasto como saldo para compras futuras.
                  </p>
                  <div className="text-[11px] text-[#7E6C58] bg-[#FAF7F0] p-2 rounded">
                    <strong>Futura Configuração:</strong> Percentual de cashback por categoria (ex: 3% em pães sourdough, 5% em bolos).
                  </div>
                </div>

                {/* WhatsApp Cloud API */}
                <div className="bg-white p-4 rounded-xl border border-[#3A2E1F]/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      Notificações Automáticas WhatsApp
                    </h4>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                      Planejado
                    </span>
                  </div>
                  <p className="text-xs text-[#554432]">
                    Hoje o sistema gera o link para o cliente clicar. No futuro, pode disparar mensagens ativas quando o pão entrar no forno ("Seu sourdough acabou de sair quentinho!") e na entrega.
                  </p>
                  <div className="text-[11px] text-[#7E6C58] bg-[#FAF7F0] p-2 rounded">
                    <strong>Futura Configuração:</strong> WhatsApp Business Cloud API ou Z-API / Evolution API.
                  </div>
                </div>

                {/* Programa de Indicação */}
                <div className="bg-white p-4 rounded-xl border border-[#3A2E1F]/15 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-[#3A2E1F] flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-[#B8623F]" />
                      Indique e Ganhe
                    </h4>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                      Serviço Pronto
                    </span>
                  </div>
                  <p className="text-xs text-[#554432]">
                    Localizado em <code className="font-mono text-[#B8623F]">src/services/referralService.ts</code>. Cada cliente tem seu link de indicação; quando o amigo compra, ambos ganham crédito.
                  </p>
                  <div className="text-[11px] text-[#7E6C58] bg-[#FAF7F0] p-2 rounded">
                    <strong>Futura Configuração:</strong> Valor do cupom de boas-vindas do amigo e bônus do indicador.
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#F3ECDD] rounded-xl border border-[#3A2E1F]/10 text-xs text-[#3A2E1F] space-y-2">
                <h4 className="font-bold flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#B8623F]" />
                  Próximos passos para configurar quando você desejar:
                </h4>
                <p>
                  1. Me informe as chaves que você já tiver (ex: o token do Mercado Pago ou a Anon Key do Supabase), ou se prefere que criemos um novo projeto no Supabase ou no Cloud SQL.
                </p>
                <p>
                  2. Você pode solicitar ajustes no cardápio de produtos, novos bairros para entrega, ou personalização dos horários de fornada da padaria a qualquer momento.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#FAF7F0] px-6 py-3 border-t border-[#3A2E1F]/10 flex items-center justify-between shrink-0">
          <span className="text-xs text-[#7E6C58]">
            Affeto Pães Artesanais • v2.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#3A2E1F] text-[#F3ECDD] hover:bg-[#554432] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Fechar Diagnóstico
          </button>
        </div>
      </div>
    </div>
  );
};
