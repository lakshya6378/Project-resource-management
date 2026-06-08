const chalk = require('chalk');

/**
 * UI Helpers — Formatting and display utilities for the console app.
 *
 * Provides consistent styling for headers, tables, menus, and messages.
 */

const divider = () => console.log(chalk.gray('─'.repeat(60)));

const header = (title) => {
  console.log('');
  divider();
  console.log(chalk.bold.cyan(`  ${title}`));
  divider();
};

const success = (msg) => console.log(chalk.green(`  ✅ ${msg}`));
const error = (msg) => console.log(chalk.red(`  ❌ ${msg}`));
const info = (msg) => console.log(chalk.blue(`  ℹ️  ${msg}`));
const warn = (msg) => console.log(chalk.yellow(`  ⚠️  ${msg}`));

/**
 * Print a simple table from an array of objects.
 * Automatically sizes columns based on header + data width.
 *
 * @param {Object[]} data - Array of objects
 * @param {string[]} columns - Object keys to display
 * @param {Object} labels - Optional column header labels { key: 'Display Label' }
 */
const table = (data, columns, labels = {}) => {
  if (!data || data.length === 0) {
    info('No data to display');
    return;
  }

  // Calculate column widths
  const widths = {};
  for (const col of columns) {
    const label = labels[col] || col;
    widths[col] = label.length;
    for (const row of data) {
      const val = String(row[col] ?? '');
      if (val.length > widths[col]) widths[col] = val.length;
    }
    // Cap at 30 chars
    widths[col] = Math.min(widths[col], 30);
  }

  // Print header
  const headerRow = columns.map((col) => {
    const label = labels[col] || col;
    return chalk.bold(label.padEnd(widths[col]));
  }).join('  ');
  console.log(`  ${headerRow}`);
  console.log(`  ${columns.map((col) => '─'.repeat(widths[col])).join('  ')}`);

  // Print rows
  for (const row of data) {
    const line = columns.map((col) => {
      let val = String(row[col] ?? '');
      if (val.length > widths[col]) val = val.substring(0, widths[col] - 2) + '..';
      return val.padEnd(widths[col]);
    }).join('  ');
    console.log(`  ${line}`);
  }
  console.log('');
};

/**
 * Print key-value pairs for a detail view.
 */
const detail = (obj, fields) => {
  for (const { key, label } of fields) {
    const val = obj[key] ?? 'N/A';
    console.log(`  ${chalk.gray(label + ':')} ${val}`);
  }
};

module.exports = {
  divider,
  header,
  success,
  error,
  info,
  warn,
  table,
  detail,
};
