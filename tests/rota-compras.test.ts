import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/loja/compra/route'
import { assinarCorpo } from '@/lib/crm/assinatura'

const SEGREDO = 'segredo-de-teste-0123456789abcdef-A'
const agoraS = () => Math.floor(Date.now() / 1000)

const entrada = (extra: Record<string, unknown> = {}) => ({
  versao: 1,
  evento: { tipo: 'pedido.criado', ref: 'order_01ABC', ocorrido_em: new Date().toISOString() },
  pedido: {
    ref: 'order_01ABC',
    subtotal_centavos: 10000,
    total_centavos: 12900,
    criado_em: new Date().toISOString(),
    itens: [{ linha_ref: 'ordli_1', produto_ref: 'prod_1', quantidade: 1, preco_unit_centavos: 10000 }],
  },
  comprador: { email: 'Cliente@Example.com', nome: 'Cliente', customer_id: 'cus_01' },
  ...extra,
})

async function pedido(corpo: unknown, assinar = true) {
  const cru = JSON.stringify(corpo)
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (assinar) headers['x-melfiore-assinatura'] = await assinarCorpo(cru, SEGREDO, agoraS())
  return new Request('https://melfiore.com/api/loja/compra', { method: 'POST', headers, body: cru })
}

const fetchMock = vi.fn()
beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async () =>
    Response.json({ ok: true, duplicada: false, compra_id: 'c1', contato_id: 'k1', estado: 'aberta', criada: true, avisos: [] }),
  )
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('COMPRAS_ASSINATURA_SEGREDO', SEGREDO)
  vi.stubEnv('SUPABASE_URL', 'https://ref.supabase.co')
  vi.stubEnv('SUPABASE_COMPRAS_JWT', 'jwt-de-teste')
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_teste')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('/api/loja/compra', () => {
  it('desligada (padrao): recusa mesmo com assinatura valida e nao toca o banco', async () => {
    vi.stubEnv('COMPRAS_ENTRADA', '')
    const r = await POST(await pedido(entrada()))
    expect(r.status).toBe(503)
    expect(await r.json()).toEqual({ ok: false, motivo: 'desligada' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('qualquer valor que nao seja exatamente ligado continua fechada', async () => {
    vi.stubEnv('COMPRAS_ENTRADA', 'Ligado')
    expect((await POST(await pedido(entrada()))).status).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ligada sem assinatura: 401 e nao toca o banco', async () => {
    vi.stubEnv('COMPRAS_ENTRADA', 'ligado')
    const r = await POST(await pedido(entrada(), false))
    expect(r.status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ligada com assinatura de outro segredo: 401', async () => {
    vi.stubEnv('COMPRAS_ENTRADA', 'ligado')
    const cru = JSON.stringify(entrada())
    const req = new Request('https://melfiore.com/api/loja/compra', {
      method: 'POST',
      headers: { 'x-melfiore-assinatura': await assinarCorpo(cru, 'outro-segredo-0123456789abcdef-ZZZ', agoraS()) },
      body: cru,
    })
    expect((await POST(req)).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ligada com assinatura valida: aceita e chama a RPC do Supabase (mock)', async () => {
    vi.stubEnv('COMPRAS_ENTRADA', 'ligado')
    const r = await POST(await pedido(entrada()))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ ok: true, duplicada: false, criada: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://ref.supabase.co/rest/v1/rpc/registrar_compra')
  })

  it.each([
    ['cartao', { comprador: { email: 'a@b.co', cartao: '4111' } }],
    ['senha', { comprador: { email: 'a@b.co', senha: 'x' } }],
    ['cvv', { pedido: { ...entrada().pedido, pagamento: { cvv: '123' } } }],
  ])('assinada com %s no corpo: 422 e nao grava', async (_nome, extra) => {
    vi.stubEnv('COMPRAS_ENTRADA', 'ligado')
    const r = await POST(await pedido(entrada(extra)))
    expect(r.status).toBe(422)
    expect(await r.json()).toEqual({ ok: false, motivo: 'campo_proibido' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  describe('central de dados: CPF e endereco', () => {
    const corpoDaRpc = () => JSON.parse(fetchMock.mock.calls[0][1].body as string).p

    it('compra com CPF, celular e endereco entra completa; so CPF em digitos e endereco normalizado seguem para o banco', async () => {
      vi.stubEnv('COMPRAS_ENTRADA', 'ligado')
      const e = entrada({
        comprador: { email: 'Cliente@Example.com', nome: 'Cliente', customer_id: 'cus_01', cpf: '529.982.247-25', whatsapp: '(11) 98765-4321' },
        pedido: {
          ...entrada().pedido,
          forma_pagamento: 'PIX',
          endereco_entrega: { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', complemento: 'apto 12', bairro: 'Bela Vista', cidade: 'Sao Paulo', uf: 'sp' },
        },
      })
      const r = await POST(await pedido(e))
      expect(r.status).toBe(200)
      const p = corpoDaRpc()
      expect(p.dados.cpf).toBe('52998224725')
      expect(p.dados.endereco).toMatchObject({ cep: '01310100', uf: 'SP', cidade: 'Sao Paulo' })
      expect(p.pedido.endereco_entrega.logradouro).toBe('Av. Paulista')
      expect(p.pedido.forma_pagamento).toBe('pix')
      expect(p.captura.whatsapp_e164).toBe('+5511987654321')
      expect(p.captura.email_norm).toBe('cliente@example.com')
      // CPF e endereco nunca entram no bloco de captura (identidade/consentimento) nem no evento
      expect(JSON.stringify(p.captura)).not.toMatch(/52998224725|Paulista/)
      expect(p.captura).not.toHaveProperty('consentimentos')
    })

    it('compra sem CPF e sem endereco nao quebra: dados vazios', async () => {
      vi.stubEnv('COMPRAS_ENTRADA', 'ligado')
      const r = await POST(await pedido(entrada()))
      expect(r.status).toBe(200)
      expect(corpoDaRpc().dados).toEqual({ cpf: null, endereco: null })
    })

    it('campos novos null (o Medusa manda null em campo vazio) passam sem erro', async () => {
      vi.stubEnv('COMPRAS_ENTRADA', 'ligado')
      const e = entrada({ comprador: { email: 'a@b.co', nome: null, whatsapp: null, cpf: null, endereco: null, customer_id: null } })
      const r = await POST(await pedido(e))
      expect(r.status).toBe(200)
    })

    it('CPF invalido: a venda entra sem o CPF e a resposta traz o aviso', async () => {
      vi.stubEnv('COMPRAS_ENTRADA', 'ligado')
      fetchMock.mockImplementation(async () =>
        Response.json({ ok: true, duplicada: false, compra_id: 'c1', contato_id: 'k1', estado: 'aberta', criada: true, avisos: [] }),
      )
      const r = await POST(await pedido(entrada({ comprador: { email: 'a@b.co', cpf: '111.111.111-11' } })))
      expect(r.status).toBe(200)
      expect(corpoDaRpc().dados.cpf).toBeNull()
      expect((await r.json()).avisos).toContain('cpf_invalido_ignorado')
    })

    it('nada vai para Brevo nem Meta: a unica chamada de rede e a RPC do Supabase', async () => {
      vi.stubEnv('COMPRAS_ENTRADA', 'ligado')
      await POST(await pedido(entrada({ comprador: { email: 'a@b.co', cpf: '529.982.247-25' } })))
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(String(fetchMock.mock.calls[0][0])).toMatch(/^https:\/\/ref\.supabase\.co\//)
    })
  })
})
