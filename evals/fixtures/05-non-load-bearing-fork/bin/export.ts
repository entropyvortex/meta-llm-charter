#!/usr/bin/env node
import { buildPayload, serialize, Format, Section } from '../src/exporter.js';

interface ParsedArgs {
  format: Format;
  include?: Section[];
  help?: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { format: 'json' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--format') {
      args.format = argv[++i] as Format;
    } else if (a === '--include') {
      args.include = argv[++i].split(',') as Section[];
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    } else {
      throw new Error(`unknown arg: ${a}`);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`Usage: export [options]

Options:
  --format <json|yaml>          Output format (default: json)
  --include <orders,customers>  Comma-separated sections to include
  -h, --help                    Show this help
`);
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const payload = buildPayload({ include: args.include });
  const out = serialize(payload, args.format);
  process.stdout.write(out + '\n');
}

main();
