import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Caminho relativo: funciona na raiz do dominio e tambem numa subpasta,
  // que e como a Hostinger costuma servir um segundo site.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    /* Tudo num nivel so, sem pasta "assets".
     *
     * Isto nao e gosto: o site foi subido com a pasta assets dentro do zip, o
     * gerenciador de arquivos da Hostinger extraiu tudo PLANO, e os arquivos
     * dela ficaram soltos na raiz. O index.html continuou procurando em
     * "assets/..." e a loja abriu branca, sem uma palavra de explicacao.
     *
     * Um site plano nao tem esse jeito de quebrar: se todos os arquivos estao
     * no mesmo lugar, nao existe pasta para se perder no caminho. */
    assetsDir: ''
  }
});
