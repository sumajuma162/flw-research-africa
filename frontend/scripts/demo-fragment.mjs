// Turns the single-file demo build into an HTML fragment for hosts that supply their own <html>/<head>/<body>.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(process.argv[2], 'utf8');
const head = src.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>|<meta name="viewport"[^>]*>/g, '');
const body = src.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync(process.argv[3], `${head.trim()}\n${body.trim()}\n`);
console.log('fragment written', (readFileSync(process.argv[3]).length / 1e6).toFixed(2), 'MB');
