import { requireAgent } from "../lib/auth.js";
import { setDefaultBoard } from "../lib/config.js";
import { generateTID, BOARD_COLLECTION } from "../lib/tid.js";
import { shortRkey } from "../lib/display.js";
import type { Column, BoardRecord } from "../lib/types.js";
import chalk from "chalk";

export async function makeCommand(
  name: string,
  opts: {
    description?: string;
    column?: string[];
    open?: boolean;
    noDefault?: boolean;
    json?: boolean;
  },
): Promise<void> {
  const { agent, did } = await requireAgent();

  const rkey = generateTID();
  const now = new Date().toISOString();

  const columnNames =
    opts.column && opts.column.length > 0
      ? opts.column
      : ["To Do", "In Progress", "Done"];

  const columns: Column[] = columnNames.map((colName, i) => ({
    id: generateTID(),
    name: colName,
    order: i,
  }));

  const record: BoardRecord = {
    $type: "dev.skyboard.board",
    name,
    ...(opts.description ? { description: opts.description } : {}),
    columns,
    ...(opts.open ? { open: true } : {}),
    createdAt: now,
  };

  await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: BOARD_COLLECTION,
    rkey,
    record,
    validate: false,
  });

  if (!opts.noDefault) {
    setDefaultBoard({ did, rkey, name });
  }

  if (opts.json) {
    console.log(
      JSON.stringify(
        {
          rkey,
          name,
          columns: columns.map((c) => c.name),
          open: opts.open ?? false,
          createdAt: now,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(chalk.green(`Created board: ${name}`));
    console.log(
      `  Columns: ${columns.map((c) => c.name).join(" → ")}`,
    );
    console.log(`  rkey: ${shortRkey(rkey)}`);
    if (opts.open) console.log(`  open: true`);
    if (opts.noDefault) {
      console.log(
        chalk.dim(
          `  Run ${chalk.cyan(`sb use ${shortRkey(rkey)}`)} to set as default.`,
        ),
      );
    } else {
      console.log(chalk.dim(`  Set as default board.`));
    }
  }
}
