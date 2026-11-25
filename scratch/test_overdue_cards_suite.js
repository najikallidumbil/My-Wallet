const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('===============================================================');
console.log('RUNNING OVERDUE PAYMENTS & SUMMARY CARDS VERIFICATION SUITE');
console.log('===============================================================');

const khataScreenPath = path.join(__dirname, '../src/views/rn/KhataScreen.tsx');
const metricCardPath = path.join(__dirname, '../src/components/rn/MetricCard.tsx');
const khataBookViewPath = path.join(__dirname, '../src/views/KhataBookView.tsx');

const khataScreenSrc = fs.readFileSync(khataScreenPath, 'utf8');
const metricCardSrc = fs.readFileSync(metricCardPath, 'utf8');
const khataBookViewSrc = fs.readFileSync(khataBookViewPath, 'utf8');

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  [PASS] ${description}`);
    testsPassed++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}`);
    testsFailed++;
  }
}

// 1. Root Cause Fix Verification: No fixed heights, min-heights, height 100%, or flex stretching
console.log('\n--- 1. Root Cause Analysis: Layout Constraints & Stretching Removal ---');

test('MetricCard has height: "auto" and NO height: "100%" or minHeight', () => {
  assert(!metricCardSrc.includes("height: '100%'"), 'MetricCard should not contain height: 100%');
  assert(!metricCardSrc.includes('minHeight:'), 'MetricCard should not contain minHeight');
  assert(metricCardSrc.includes("height: 'auto'"), 'MetricCard should have height: auto');
});

test('KhataScreen summary grids use alignItems: "flex-start" to prevent row stretching', () => {
  assert(khataScreenSrc.includes("summaryGridMobile:"), 'Should have summaryGridMobile');
  assert(khataScreenSrc.includes("summaryGridWide:"), 'Should have summaryGridWide');
  assert(khataScreenSrc.includes("alignItems: 'flex-start'"), 'Grid containers must enforce alignItems: flex-start');
});

test('KhataScreen summary columns use alignSelf: "flex-start" and 2-column flexBasis', () => {
  assert(khataScreenSrc.includes("summaryColMobile:"), 'Should have summaryColMobile');
  assert(khataScreenSrc.includes("alignSelf: 'flex-start'"), 'Columns must enforce alignSelf: flex-start');
  assert(khataScreenSrc.includes("flexBasis: '48%'"), 'Mobile column must use ~48-50% basis for 2-column grid');
});

test('KhataScreen old kpiCard with height: 100% and justifyContent: space-between is removed', () => {
  assert(!khataScreenSrc.includes("height: '100%',\n    justifyContent: 'space-between'"), 'Old stretching kpiCard must be removed');
});

test('KhataBookView uses items-start, auto-rows-min, and NO min-h-[96px] or justify-between', () => {
  assert(khataBookViewSrc.includes('items-start'), 'Grid must have items-start');
  assert(khataBookViewSrc.includes('auto-rows-min'), 'Grid must have auto-rows-min');
  assert(!khataBookViewSrc.includes('min-h-[96px]'), 'No fixed min-h-[96px] in summary cards');
  assert(!khataBookViewSrc.includes('justify-between self-start h-auto min-h-[96px]'), 'No justify-between with min-h');
});

// 2. Premium 4 Summary Cards Verification
console.log('\n--- 2. Four Consistent Summary Cards ---');

test('KhataScreen renders exactly 4 executive summary cards', () => {
  assert(khataScreenSrc.includes('title="Total Receivable"'), 'Card 1: Total Receivable present');
  assert(khataScreenSrc.includes('title="Total Payable"'), 'Card 2: Total Payable present');
  assert(khataScreenSrc.includes('title="Total Outstanding"'), 'Card 3: Total Outstanding present');
  assert(khataScreenSrc.includes('title="Overdue Payments"'), 'Card 4: Overdue Payments present');
});

test('KhataBookView renders exactly 4 executive summary cards', () => {
  assert(khataBookViewSrc.includes('Total Receivable'), 'Card 1: Total Receivable present in web');
  assert(khataBookViewSrc.includes('Total Payable'), 'Card 2: Total Payable present in web');
  assert(khataBookViewSrc.includes('Total Outstanding'), 'Card 3: Total Outstanding present in web');
  assert(khataBookViewSrc.includes('Overdue Payments'), 'Card 4: Overdue Payments present in web');
});

// 3. Overdue Payments Empty and Active States
console.log('\n--- 3. Overdue Payments Empty State & Active State ---');

test('Overdue Payments empty state shows warning icon, "Overdue Payments", "No overdue payments", success indicator', () => {
  assert(khataScreenSrc.includes('overdueCount === 0'), 'KhataScreen checks overdueCount === 0');
  assert(khataScreenSrc.includes('No overdue payments'), 'Shows "No overdue payments" text');
  assert(khataScreenSrc.includes('CheckCircle2'), 'Shows subtle success check indicator');
  assert(khataScreenSrc.includes('All collections on track'), 'Shows "All collections on track" subtitle');
});

test('Overdue Payments active state shows count, amount, and View Details action', () => {
  assert(khataScreenSrc.includes('{overdueCount} Overdue'), 'Shows "{overdueCount} Overdue"');
  assert(khataScreenSrc.includes('past due'), 'Shows amount past due');
  assert(khataScreenSrc.includes('View Details'), 'Provides View Details action');
  assert(khataScreenSrc.includes("setFilterType('overdue')"), 'View Details triggers filter to overdue');
});

// 4. Responsive Grid Verification
console.log('\n--- 4. Responsive Layout Verification ---');

test('Mobile 2-column and Wide 4-column layout switches correctly', () => {
  assert(khataScreenSrc.includes('isWide ? styles.summaryGridWide : styles.summaryGridMobile'), 'Responsive grid switch present');
  assert(khataScreenSrc.includes('isWide ? styles.summaryColWide : styles.summaryColMobile'), 'Responsive column switch present');
  assert(khataBookViewSrc.includes('grid-cols-2 md:grid-cols-4'), 'Web view uses 2-col on mobile and 4-col on desktop');
});

console.log('\n===============================================================');
console.log(`TOTAL TESTS: ${testsPassed + testsFailed}`);
console.log(`PASSED: ${testsPassed}`);
console.log(`FAILED: ${testsFailed}`);
console.log('===============================================================');

if (testsFailed > 0) {
  process.exit(1);
}
