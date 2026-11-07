// Fecha por padrao: so "development" e "test" contam como fora de producao.
// NODE_ENV chega ao Worker fixo em "production": o `next build` e o define do OpenNext
// (bundle-server.js) trocam `process.env.NODE_ENV` pela string no codigo. Se um dia vier
// ausente ou estranho, cai em producao (500), nunca em "cadastro confirmado" sem gravar.
export function foraDeProducao(): boolean {
  const e = process.env.NODE_ENV
  return e === 'development' || e === 'test'
}
