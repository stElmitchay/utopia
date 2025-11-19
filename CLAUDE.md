# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Utopia is a no-code, decentralized voting platform built on Solana blockchain. It enables universities, organizations, and event managers to create transparent, tamper-proof elections with features like self-serve poll creation, configurable voting rules, and real-time on-chain results.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, DaisyUI
- **Blockchain**: Solana (devnet), Anchor Framework v0.30.1
- **State Management**: TanStack React Query (v5), Jotai
- **Wallet Integration**: Solana Wallet Adapter (Phantom, Solflare)
- **Package Manager**: npm

## Development Commands

### Frontend Development
```bash
npm run dev          # Start Next.js development server
npm run build        # Build Next.js application
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Anchor/Solana Development
```bash
npm run anchor-build    # Build Anchor program
npm run anchor-test     # Run Anchor tests
npm run anchor-localnet # Start local Anchor validator

# Or directly in anchor directory:
cd anchor
anchor build                              # Build program
anchor deploy --provider.cluster devnet   # Deploy to devnet
anchor test                               # Run tests
```

## Environment Variables

Required in `.env` or `.env.local`:
```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Project Architecture

### Monorepo Structure

This is a hybrid Next.js + Anchor monorepo:
- `/src` - Next.js application (frontend)
- `/anchor` - Solana program (smart contract)
- Program ID is managed in `anchor/Anchor.toml` and IDL

### Path Aliases

TypeScript is configured with:
- `@/*` → `./src/*`
- `@project/anchor` → `anchor/src` (for importing program IDL and types)

### Anchor Program Architecture

**Program ID**: `5zuwXytbwB9nDBvpcP8n235F2hBJSSPc561MB25kZboX`

The voting program (`anchor/programs/votingapplication/src/lib.rs`) uses Program Derived Addresses (PDAs) with deterministic seeds:

- **Poll PDA**: Seeded with `poll_id` (u64) → stores poll metadata
- **Candidate PDA**: Seeded with `poll_id + candidate_name` → stores candidate info and vote counts

**Instructions**:
1. `initialize_poll(poll_id, description, poll_start, poll_end)` - Creates a new poll
2. `initialize_candidate(candidate_name, poll_id)` - Adds candidate to poll
3. `vote(candidate_name, poll_id)` - Cast a vote for a candidate

**Account Structures**:
- `Poll`: poll_id, description (max 280 chars), poll_start, poll_end, candidate_amount
- `Candidate`: candidate_name (max 64 chars), candidate_votes

### Frontend Architecture

**Provider Hierarchy** (in `layout.tsx`):
```
ReactQueryProvider
└── ClusterProvider
    └── SolanaProvider (wallet adapters)
        └── UiLayout
            └── Page components
```

**Component Organization** (feature-based):
- `components/{feature}/{feature}-data-access.tsx` - React Query hooks, Anchor program interactions
- `components/{feature}/{feature}-feature.tsx` - Main feature component with business logic
- `components/{feature}/{feature}-ui.tsx` - Presentational components
- `components/ui/` - Shared UI components

**Key Data Access Pattern**:
Each feature has a `*-data-access.tsx` file that:
1. Initializes the Anchor program using `getVotingapplicationProgram()`
2. Exposes React Query hooks for fetching/mutating on-chain data
3. Uses `useTransactionToast()` for transaction feedback

Example pattern:
```typescript
const program = useMemo(() => getVotingapplicationProgram(provider, programId), [provider, programId])

const mutation = useMutation({
  mutationFn: () => program.methods.instructionName().accounts({...}).rpc(),
  onSuccess: (signature) => {
    transactionToast(signature)
    return queryToRefetch.refetch()
  }
})
```

### Solana/Anchor Integration

**IDL Generation Flow**:
1. Build Rust program: `anchor build`
2. IDL auto-generated: `anchor/target/idl/votingapplication.json`
3. TypeScript types: `anchor/target/types/votingapplication.d.ts`
4. Exported via: `anchor/src/votingapplication-exports.ts`
5. Frontend imports: `import { getVotingapplicationProgram } from '@project/anchor'`

**Program ID Management**:
- Single source of truth: `anchor/target/idl/votingapplication.json` (address field)
- Helper: `getVotingapplicationProgramId(cluster)` always returns IDL address
- Do not hardcode program IDs elsewhere

### Cluster Management

The app supports switching between Solana clusters (devnet/mainnet/localnet):
- Managed via `ClusterProvider` in `components/cluster/cluster-data-access.tsx`
- Stored in localStorage for persistence
- All queries are keyed by cluster to prevent stale data

## Important Patterns

### PDA Derivation
When calling Anchor instructions, PDAs must match the program's seed structure:

```typescript
const [pollPda] = PublicKey.findProgramAddressSync(
  [new BN(pollId).toArrayLike(Buffer, 'le', 8)],
  programId
)

const [candidatePda] = PublicKey.findProgramAddressSync(
  [
    new BN(pollId).toArrayLike(Buffer, 'le', 8),
    Buffer.from(candidateName)
  ],
  programId
)
```

### Transaction Toast Pattern
Always use `transactionToast(signature)` from `useTransactionToast()` after successful transactions to provide Solana Explorer links to users.

### Query Invalidation
After mutations, refetch related queries to update UI with latest on-chain state.

## Deployment

### Deploying Anchor Program
```bash
cd anchor
anchor build
anchor deploy --provider.cluster devnet
# Update program ID in Anchor.toml if changed
```

After deployment:
- IDL is auto-updated at `anchor/target/idl/votingapplication.json`
- Frontend automatically uses new program ID from IDL

### Deploying Frontend
Standard Next.js deployment. Ensure environment variables are set for the target environment.

## Known Patterns & Gotchas

1. **Anchor Version**: Locked to v0.30.1 - do not upgrade without testing
2. **Webpack Config**: Next.js config disables `fs`, `path`, `os` for browser compatibility with Anchor
3. **Wallet Auto-connect**: Enabled by default, with retry logic for connection failures
4. **localStorage Usage**: Used for tracking votes, cluster selection, wallet persistence
5. **BN (BigNumber) Usage**: All numeric values in Anchor must use `BN` from `@coral-xyz/anchor`
6. **Poll/Candidate Names**: Respect max lengths (280 chars for description, 64 for candidate name)

## Testing

Tests are located in `anchor/tests/` using `anchor-bankrun` for on-chain program testing. Run with `npm run anchor-test` or `anchor test`.
