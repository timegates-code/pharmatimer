// PharmaTimer -- config vitest SENZA pin del fuso.
//
// Usata SOLO da `make controllo-dst` (scripts/audit/controllo_dst.py), che la
// lancia con TZ=Etc/UTC nello ambiente. La config di suite, vitest.config.js,
// pinna process.env.TZ a Europe/Rome prima di defineConfig, e il pin vince su
// qualunque TZ passato dallo ambiente (misurato al commit 8d37ab7): per far
// girare i test *.dst.test.js in un fuso senza ora legale serve quindi una
// config che il pin NON contenga. E questa, e non porta altro: ambiente node,
// nessun plugin, nessun alias, solo i file il cui nome dichiara che misurano
// lo ora legale.
//
// Non e un secondo modo di lanciare la suite: include SOLO i file *.dst.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.dst.test.{js,jsx}'],
  },
});
