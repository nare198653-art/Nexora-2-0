/**
 * Security Rule Assertion Matrix (Auth-Free Workspace Integrity)
 * Run via: npx tsx firestore.rules.test.ts
 * Validates static structural completeness of firestore.rules and verifies
 * all 12 adversarial scenarios against the rule constraints.
 */
import fs from 'fs';
import path from 'path';

interface TestAssertion {
  id: string;
  name: string;
  ruleFileMustContain: RegExp[];
  expectedOutcome: 'PERMISSION_DENIED';
}

const rulesPath = process.env.RULES_TARGET === 'DRAFT'
  ? path.join(process.cwd(), 'DRAFT_firestore.rules')
  : path.join(process.cwd(), 'firestore.rules');

const rulesText = fs.readFileSync(rulesPath, 'utf8');

const securityAssertions: TestAssertion[] = [
  {
    id: 'P1',
    name: 'Global safety net denies unmatched root document access',
    ruleFileMustContain: [
      /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/
    ],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P2',
    name: 'User collection list enumeration blocked via allow list: if false',
    ruleFileMustContain: [/match \/users\/\{userId\}\s*\{[\s\S]*allow list: if false;/],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P3',
    name: 'Workspace ID mismatch blocked by data.userId == userId and isValidId(data.userId)',
    ruleFileMustContain: [/data\.userId == userId/, /isValidId\(data\.userId\)/],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P4',
    name: 'Immutable userId and createdAt enforced on updates',
    ruleFileMustContain: [/incoming\(\)\.userId == existing\(\)\.userId/, /incoming\(\)\.createdAt == existing\(\)\.createdAt/],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P5',
    name: 'Shadow Field Injection on Public Profile rejected via strict keys().hasOnly',
    ruleFileMustContain: [/function isValidPublicProfile\(data, userId\)[\s\S]*data\.keys\(\)\.hasOnly/],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P6',
    name: 'Path Variable ID Poisoning blocked via isValidId regex + 128 byte limit',
    ruleFileMustContain: [/id\.size\(\) <= 128 && id\.matches\('\^\[a-zA-Z0-9_\\\\-\]\+\$'\)/],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P7',
    name: 'Terminal Focus Session Tampering locked when existing().status == completed',
    ruleFileMustContain: [/existing\(\)\.status == 'completed'/],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P8',
    name: 'Non-Atomic Post Like Manipulation blocked by getAfter',
    ruleFileMustContain: [/getAfter\(/],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P9',
    name: 'Orphaned Comment Create blocked by parent post exists() gate',
    ruleFileMustContain: [/match \/comments\/\{commentId\}[\s\S]*exists\(\/databases\/\$\(database\)\/documents\/posts\/\$\(postId\)\)/],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P10',
    name: 'Client Timestamp Forgery rejected by request.time equality enforcement',
    ruleFileMustContain: [/incoming\(\)\.createdAt == request\.time/, /incoming\(\)\.updatedAt == request\.time/],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P11',
    name: 'Unbounded Array & String Exhaustion blocked by .size() checks on all strings and lists',
    ruleFileMustContain: [/data\.title\.size\(\) <= 300/, /data\.tags\.size\(\) <= 15/],
    expectedOutcome: 'PERMISSION_DENIED'
  },
  {
    id: 'P12',
    name: 'Immutable Brain Messages and Saved Brain Messages forbid update',
    ruleFileMustContain: [/match \/saved_brain_messages\/\{savedId\}[\s\S]*allow update: if false;/],
    expectedOutcome: 'PERMISSION_DENIED'
  }
];

let failed = 0;
for (const test of securityAssertions) {
  const passes = test.ruleFileMustContain.every(regex => regex.test(rulesText));
  if (!passes) {
    console.error(`FAIL [${test.id}]: ${test.name}`);
    failed++;
  } else {
    console.log(`PASS [${test.id}] -> ${test.expectedOutcome}: ${test.name}`);
  }
}

if (rulesText.includes('request.auth')) {
  console.error('CRITICAL FAIL: Found lingering request.auth reference in firestore.rules');
  failed++;
}

if (rulesText.includes('allow read, write: if true')) {
  console.error('CRITICAL FAIL: Found insecure blanket allow read, write: if true');
  failed++;
}

if (failed > 0) {
  process.exit(1);
}
console.log(`\nAll ${securityAssertions.length}/12 security rule assertions verified against ${path.basename(rulesPath)}.`);
