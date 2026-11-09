// Comprueba un despliegue de NEXO: la imagen local o la URL pública de Cloud Run.
// Uso: npm run check:deploy -- http://localhost:8080
// Node 26 ejecuta TypeScript directamente, así que no hace falta compilar este archivo.
import {
  checkRedirect,
  checkResponse,
  deployExpectations,
  findScriptAsset,
  type ResponseSummary,
} from './deploy-checks.ts';

interface FetchedPage {
  summary: ResponseSummary;
  body: string;
}

/** Sin seguir redirecciones: así se ve qué responde el servidor y adónde manda. */
async function request(base: string, path: string): Promise<FetchedPage> {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  return {
    summary: { status: response.status, headers: Object.fromEntries(response.headers) },
    body: await response.text(),
  };
}

async function main(base: string): Promise<number> {
  let failures = 0;
  const report = (label: string, problems: readonly string[]): void => {
    if (problems.length === 0) {
      console.log(`OK  ${label}`);
      return;
    }
    failures += problems.length;
    for (const problem of problems) console.log(`MAL ${label}: ${problem}`);
  };

  const index = await request(base, '/');
  const scriptAsset = findScriptAsset(index.body);
  if (scriptAsset === null) {
    report('index.html', ['No carga ningún JS de /assets/.']);
    return failures;
  }

  for (const expectation of deployExpectations(scriptAsset)) {
    const { summary } = await request(base, expectation.path);
    report(expectation.label, checkResponse(expectation, summary));
  }

  // Sin redirección no hay nada que comprobar: se informa, pero no suma un OK.
  const redirect = checkRedirect((await request(base, '/assets')).summary);
  if (redirect.kind === 'info') console.log(`INFO ${redirect.message}`);
  else report('Redirecciones relativas', redirect.kind === 'ok' ? [] : [redirect.message]);

  return failures;
}

const base = process.argv[2];
if (base === undefined) {
  console.error('Uso: npm run check:deploy -- <url>, por ejemplo http://localhost:8080');
  process.exitCode = 2;
} else {
  try {
    const failures = await main(base);
    console.log(failures === 0 ? '\nTodo en orden.' : `\n${failures} problema(s).`);
    process.exitCode = failures === 0 ? 0 : 1;
  } catch (error) {
    console.error(
      `No se pudo comprobar ${base}: ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 1;
  }
}
