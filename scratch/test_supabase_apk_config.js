const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('===============================================================');
console.log('RUNNING STANDALONE APK SUPABASE CONFIGURATION VERIFICATION');
console.log('===============================================================');

const supabaseSrc = fs.readFileSync(path.join(__dirname, '../src/lib/supabase.ts'), 'utf8');
const easJsonSrc = fs.readFileSync(path.join(__dirname, '../eas.json'), 'utf8');
const appJsonSrc = fs.readFileSync(path.join(__dirname, '../app.json'), 'utf8');

const easJson = JSON.parse(easJsonSrc);
const appJson = JSON.parse(appJsonSrc);

let passed = 0;
let failed = 0;

function test(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passed++;
  } catch (e) {
    console.error(`  [FAIL] ${desc}`);
    console.error(`         ${e.message}`);
    failed++;
  }
}

// 1. Static process.env resolution for Metro Babel inlining
console.log('\n--- 1. Static Inlining & Multi-Layer Resolution ---');

test('supabase.ts accesses process.env.EXPO_PUBLIC_SUPABASE_URL statically (no dynamic indexing)', () => {
  assert(supabaseSrc.includes('process.env.EXPO_PUBLIC_SUPABASE_URL'), 'Must contain direct literal process.env.EXPO_PUBLIC_SUPABASE_URL');
  assert(!supabaseSrc.includes('proc.env[key]'), 'Must NOT use dynamic proc.env[key]');
});

test('supabase.ts accesses process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY & PUBLISHABLE_KEY statically', () => {
  assert(supabaseSrc.includes('process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY'), 'Must contain direct literal process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY');
  assert(supabaseSrc.includes('process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), 'Must contain direct literal process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
});

test('supabase.ts extracts Constants.expoConfig?.extra values from app.json', () => {
  assert(supabaseSrc.includes('Constants?.expoConfig?.extra'), 'Must check Constants?.expoConfig?.extra');
  assert(supabaseSrc.includes('extra?.supabaseUrl'), 'Must check extra?.supabaseUrl');
  assert(supabaseSrc.includes('extra?.supabaseAnonKey'), 'Must check extra?.supabaseAnonKey');
});

test('supabase.ts defines production DEFAULT_SUPABASE_URL & DEFAULT_SUPABASE_ANON_KEY fallbacks', () => {
  assert(supabaseSrc.includes("DEFAULT_SUPABASE_URL = 'https://ruhifsmbgfhxoumfvoyl.supabase.co'"), 'Must have DEFAULT_SUPABASE_URL');
  assert(supabaseSrc.includes("DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_6DUz-G2y2Ggw103rtR83aQ_yhmWPDo_'"), 'Must have DEFAULT_SUPABASE_ANON_KEY');
});

// 2. EAS Build Configuration
console.log('\n--- 2. EAS Build Configuration (eas.json) ---');

test('eas.json preview profile sets android.buildType to apk', () => {
  assert(easJson.build?.preview?.android?.buildType === 'apk', 'preview must set buildType: apk');
});

test('eas.json production profile sets android.buildType to apk', () => {
  assert(easJson.build?.production?.android?.buildType === 'apk', 'production must set buildType: apk');
});

test('eas.json preview profile embeds Supabase env variables', () => {
  const env = easJson.build?.preview?.env;
  assert(env?.EXPO_PUBLIC_SUPABASE_URL === 'https://ruhifsmbgfhxoumfvoyl.supabase.co', 'preview env must contain URL');
  assert(env?.EXPO_PUBLIC_SUPABASE_ANON_KEY === 'sb_publishable_6DUz-G2y2Ggw103rtR83aQ_yhmWPDo_', 'preview env must contain ANON_KEY');
});

test('eas.json production profile embeds Supabase env variables', () => {
  const env = easJson.build?.production?.env;
  assert(env?.EXPO_PUBLIC_SUPABASE_URL === 'https://ruhifsmbgfhxoumfvoyl.supabase.co', 'production env must contain URL');
  assert(env?.EXPO_PUBLIC_SUPABASE_ANON_KEY === 'sb_publishable_6DUz-G2y2Ggw103rtR83aQ_yhmWPDo_', 'production env must contain ANON_KEY');
});

// 3. app.json manifest configuration
console.log('\n--- 3. app.json Manifest Configuration ---');

test('app.json extra contains supabaseUrl and supabaseAnonKey', () => {
  const extra = appJson.expo?.extra;
  assert(extra?.supabaseUrl === 'https://ruhifsmbgfhxoumfvoyl.supabase.co', 'extra.supabaseUrl must be configured');
  assert(extra?.supabaseAnonKey === 'sb_publishable_6DUz-G2y2Ggw103rtR83aQ_yhmWPDo_', 'extra.supabaseAnonKey must be configured');
});

// 4. Connection Testing & Status States
console.log('\n--- 4. Connection Status & Health Endpoint ---');

test('supabase.ts testSupabaseConnection checks /auth/v1/health with apikey', () => {
  assert(supabaseSrc.includes('/auth/v1/health'), 'Must check auth health endpoint');
  assert(supabaseSrc.includes('apikey: rawKey'), 'Must pass apikey header');
  assert(!supabaseSrc.includes('/rest/v1/'), 'Must NOT call /rest/v1/ which returns 401 without secret key');
});

const authScreenSrc = fs.readFileSync(path.join(__dirname, '../src/components/auth/AuthScreen.tsx'), 'utf8');

test('AuthScreen displays Connected, Connecting, and Connection Failed states', () => {
  assert(authScreenSrc.includes("connectionStatus === 'connected'"), 'Must handle connected');
  assert(authScreenSrc.includes("connectionStatus === 'checking'"), 'Must handle connecting (checking)');
  assert(authScreenSrc.includes("Connecting to Supabase..."), 'Must show connecting text');
  assert(authScreenSrc.includes("Supabase Connection Failed"), 'Must show connection failed text');
});

console.log('\n===============================================================');
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('===============================================================');

if (failed > 0) process.exit(1);
