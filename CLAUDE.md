# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Utopia is a no-code, decentralized voting platform built on Solana blockchain. It enables universities, organizations, and event managers to create transparent, tamper-proof elections with features like self-serve poll creation, configurable voting rules, real-time on-chain results, and voter verification.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components (Radix UI, tailwindcss-animate)
- **Blockchain**: Solana (devnet), Anchor Framework v0.32.1
- **State Management**: TanStack React Query (v5), Jotai
- **Wallet Integration**: Privy Auth (@privy-io/react-auth), Solana Wallet Adapter
- **Database**: Supabase (PostgreSQL)
- **UI Libraries**: Lucide React (icons), Tabler Icons, Framer Motion (animations)
- **3D Graphics**: Three.js with React Three Fiber
- **Additional**: html2canvas (screenshot/export), react-hot-toast (notifications)
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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Note: `NEXT_PUBLIC_SOLANA_ENDPOINT` can also be used as an alternative to `NEXT_PUBLIC_SOLANA_RPC_URL` (configured in `next.config.mjs`).

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

**Program ID**: `7WFb9od2tkd4F9hs7FLJLhuEVzV925KTmGRVyFqkL3if`

The voting program (`anchor/programs/votingapplication/src/lib.rs`) uses Program Derived Addresses (PDAs) with deterministic seeds:

- **Poll PDA**: Seeded with `poll_id` (u64) → stores poll metadata
- **Candidate PDA**: Seeded with `poll_id + candidate_name` → stores candidate info and vote counts
- **VoterRecord PDA**: Seeded with `poll_id + voter_pubkey` → tracks individual votes and prevents double voting

**Instructions**:
1. `initialize_poll(poll_id, description, poll_start, poll_end)` - Creates a new poll with admin authority
2. `initialize_candidate(candidate_name, poll_id)` - Adds candidate to poll (admin only)
3. `vote(candidate_name, poll_id)` - Cast a vote for a candidate (requires 1 SOL minimum balance, creates voter record)
4. `close_poll_early(poll_id)` - Allows poll admin to close poll before end time

**Account Structures**:
- `Poll`: poll_id, description (max 280 chars), poll_start, poll_end, candidate_amount, poll_admin (pubkey)
- `Candidate`: candidate_name (max 64 chars), candidate_votes (u64)
- `VoterRecord`: poll_id, voter (pubkey), candidate_voted_for, timestamp (i64)

**Custom Errors**:
- `PollNotStarted` (6000): Poll has not started yet
- `PollEnded` (6001): Poll has ended
- `AlreadyVoted` (6002): Voter has already voted in this poll
- `Unauthorized` (6003): Not authorized to perform this action
- `InsufficientBalance` (6004): Voter needs at least 1 SOL to vote
- `PollAlreadyEnded` (6005): Cannot close poll that already ended

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
- `components/ui/` - Shared UI components (shadcn/ui based)
  - `button.tsx` - Reusable button component with variants
  - `input.tsx` - Form input component
  - `textarea.tsx` - Multi-line text input
  - `confirmation-modal.tsx` - Modal for user confirmations
  - `vote-receipt.tsx` - Visual receipt for completed votes
  - `poll-results-card.tsx` - Display component for poll results
  - `ui-layout.tsx` - Main layout wrapper

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
// Poll PDA
const [pollPda] = PublicKey.findProgramAddressSync(
  [new BN(pollId).toArrayLike(Buffer, 'le', 8)],
  programId
)

// Candidate PDA
const [candidatePda] = PublicKey.findProgramAddressSync(
  [
    new BN(pollId).toArrayLike(Buffer, 'le', 8),
    Buffer.from(candidateName)
  ],
  programId
)

// VoterRecord PDA
const [voterRecordPda] = PublicKey.findProgramAddressSync(
  [
    new BN(pollId).toArrayLike(Buffer, 'le', 8),
    voterPublicKey.toBuffer()
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

1. **Anchor Version**: Using v0.32.1 (Anchor CLI) with v0.30.1 (@coral-xyz/anchor package). The CLI and package versions can differ.
2. **Webpack Config**: Next.js config disables `fs`, `path`, `os` for browser compatibility with Anchor
3. **Authentication**: Uses Privy for wallet integration and user authentication with social logins
4. **Voter Eligibility**: Voters must have at least 1 SOL balance to cast votes (enforced on-chain)
5. **Double Voting Prevention**: VoterRecord PDAs are created on-chain to prevent duplicate votes per poll
6. **localStorage Usage**: Used for tracking votes (client-side), cluster selection, wallet persistence
7. **BN (BigNumber) Usage**: All numeric values in Anchor must use `BN` from `@coral-xyz/anchor`
8. **Poll/Candidate Names**: Respect max lengths (280 chars for description, 64 for candidate name)
9. **Admin Authority**: Only poll creators (poll_admin) can add candidates and close polls early
10. **Timestamp Handling**: Poll times use Unix timestamps (u64), voter records use i64 for timestamp
11. **Supabase Integration**: Used for off-chain data storage (user profiles, poll metadata, analytics)
12. **shadcn/ui Components**: Custom UI components follow the shadcn/ui pattern with Radix UI primitives
13. **3D Graphics**: Three.js integration available for visual enhancements (via @react-three/fiber)
14. **Export Functionality**: html2canvas used for generating visual receipts and poll result exports

## Database Architecture

### Supabase Integration

The application uses Supabase as an off-chain database for:
- **User Profiles**: Storing user metadata, preferences, and authentication data
- **Poll Metadata**: Additional poll information that doesn't need to be on-chain (images, extended descriptions)
- **Analytics**: Tracking voting patterns, user engagement, and poll statistics
- **Caching**: Reducing RPC calls by caching frequently accessed on-chain data

**Key Patterns**:
- On-chain data (votes, poll state) remains the source of truth for voting logic
- Off-chain database supplements with enhanced features (user profiles, images, analytics)
- Use `@supabase/supabase-js` client for database operations
- Supabase credentials are stored in environment variables

## Security Considerations

1. **Voter Verification**: 1 SOL minimum balance requirement prevents spam and sybil attacks
2. **Double Voting Prevention**: On-chain VoterRecord PDAs ensure each wallet can only vote once per poll
3. **Admin Authorization**: Poll admin pubkey stored on-chain, verified before sensitive operations
4. **Timestamp Validation**: Poll start/end times enforced on-chain to prevent early/late voting
5. **Environment Variables**: Sensitive keys (Privy, Supabase) must never be committed to git

## Testing

Tests are located in `anchor/tests/` using `anchor-bankrun` for on-chain program testing. Run with `npm run anchor-test` or `anchor test`.

## Key Dependencies

### Production Dependencies
- `@coral-xyz/anchor`: ^0.30.1 - Solana Anchor framework client
- `@privy-io/react-auth`: ^3.7.0 - Authentication and wallet management
- `@supabase/supabase-js`: ^2.86.0 - Database client
- `@tanstack/react-query`: ^5.51.11 - Server state management
- `@solana/web3.js`: 1.98.0 - Solana blockchain interactions
- `@solana/spl-token`: 0.4.9 - SPL token operations
- `jotai`: 2.9.1 - Atomic state management
- `framer-motion`: 10.18.0 - Animation library
- `react-hot-toast`: 2.5.2 - Toast notifications
- `html2canvas`: ^1.4.1 - Screenshot/export functionality
- `three`: ^0.160.1 - 3D graphics library
- `@react-three/fiber`: ^8.18.0 - React renderer for Three.js
- `lucide-react`: ^0.555.0 - Icon library
- `@tabler/icons-react`: ^3.11.0 - Additional icons

### UI Component Libraries
- `@radix-ui/react-slot`: ^1.2.4 - Primitive components
- `class-variance-authority`: ^0.7.1 - Component variant management
- `clsx`: ^2.1.1 - Conditional classnames
- `tailwind-merge`: ^3.2.0 - Tailwind class merging
- `tailwindcss-animate`: ^1.0.7 - Animation utilities

## Recent Updates & Migration Notes

### Anchor 0.30.1 → 0.32.1 Migration
- Updated Anchor.toml to 0.32.1
- Program ID changed to `7WFb9od2tkd4F9hs7FLJLhuEVzV925KTmGRVyFqkL3if`
- Added VoterRecord account type for double-vote prevention
- Added close_poll_early instruction
- Enhanced error handling with custom errors

### UI Library Migration (DaisyUI → shadcn/ui)
- Removed DaisyUI dependency
- Implemented shadcn/ui components using Radix UI primitives
- Custom component structure in `src/components/ui/`
- Tailwind CSS configuration updated with design tokens
- Uses CSS variables for theming (supports dark mode via class strategy)

### Authentication Upgrade
- Integrated Privy for enhanced wallet connection and social login
- Supports multiple wallet adapters (Phantom, Solflare, etc.)
- Privy App ID required in environment variables
