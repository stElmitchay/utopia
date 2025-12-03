'use client'

import { usePrivy } from '@privy-io/react-auth'
import { useWallets } from '@privy-io/react-auth/solana'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
import { IconRefresh } from '@tabler/icons-react'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { AppModal, ellipsify } from '../ui/ui-layout'
import { useCluster } from '../cluster/cluster-data-access'
import { ExplorerLink } from '../cluster/cluster-ui'
import {
  useGetBalance,
  useGetSignatures,
  useGetTokenAccounts,
  useRequestAirdrop,
  useTransferSol,
} from './account-data-access'

export function AccountBalance({ address }: { address: PublicKey }) {
  const query = useGetBalance({ address })

  return (
    <div>
      <h1 className="text-5xl font-bold cursor-pointer text-foreground" onClick={() => query.refetch()}>
        {query.data ? <BalanceSol balance={query.data} /> : '...'} SOL
      </h1>
    </div>
  )
}
export function AccountChecker() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const solanaWallet = useMemo(() => wallets[0], [wallets])

  const publicKey = useMemo(() => {
    if (!authenticated || !solanaWallet?.address) return null
    return new PublicKey(solanaWallet.address)
  }, [authenticated, solanaWallet])

  if (!publicKey) {
    return null
  }
  return <AccountBalanceCheck address={publicKey} />
}
export function AccountBalanceCheck({ address }: { address: PublicKey }) {
  const { cluster } = useCluster()
  const mutation = useRequestAirdrop({ address })
  const query = useGetBalance({ address })

  if (query.isLoading) {
    return null
  }
  if (query.isError || !query.data) {
    return (
      <div className="bg-yellow-500/10 border-2 border-yellow-500/40 p-4 flex items-center justify-center gap-4">
        <span className="text-foreground">
          You are connected to <strong>{cluster.name}</strong> but your account is not found on this cluster.
        </span>
        <button
          className="px-3 py-1 text-sm font-bold uppercase tracking-wide bg-card border-2 border-border hover:border-accent transition-colors"
          onClick={() => mutation.mutateAsync(1).catch((err) => console.log(err))}
        >
          Request Airdrop
        </button>
      </div>
    )
  }
  return null
}

export function AccountButtons({ address }: { address: PublicKey }) {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const solanaWallet = useMemo(() => wallets[0], [wallets])
  const { cluster } = useCluster()
  const [showAirdropModal, setShowAirdropModal] = useState(false)
  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [showSendModal, setShowSendModal] = useState(false)

  const isOwnWallet = useMemo(() => {
    if (!authenticated || !solanaWallet?.address) return false
    return solanaWallet.address === address.toString()
  }, [authenticated, solanaWallet, address])

  return (
    <div>
      <ModalAirdrop hide={() => setShowAirdropModal(false)} address={address} show={showAirdropModal} />
      <ModalReceive address={address} show={showReceiveModal} hide={() => setShowReceiveModal(false)} />
      <ModalSend address={address} show={showSendModal} hide={() => setShowSendModal(false)} />
      <div className="space-x-2">
        <button
          disabled={cluster.network?.includes('mainnet')}
          className="px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-border hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowAirdropModal(true)}
        >
          Airdrop
        </button>
        <button
          disabled={!isOwnWallet}
          className="px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-border hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => setShowSendModal(true)}
        >
          Send
        </button>
        <button
          className="px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-border hover:border-accent transition-colors"
          onClick={() => setShowReceiveModal(true)}
        >
          Receive
        </button>
      </div>
    </div>
  )
}

export function AccountTokens({ address }: { address: PublicKey }) {
  const [showAll, setShowAll] = useState(false)
  const query = useGetTokenAccounts({ address })
  const client = useQueryClient()
  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 5)
  }, [query.data, showAll])

  return (
    <div className="space-y-2">
      <div className="justify-between">
        <div className="flex justify-between">
          <h2 className="text-2xl font-bold text-foreground">Token Accounts</h2>
          <div className="space-x-2">
            {query.isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>
            ) : (
              <button
                className="p-2 border-2 border-border hover:border-accent transition-colors"
                onClick={async () => {
                  await query.refetch()
                  await client.invalidateQueries({
                    queryKey: ['getTokenAccountBalance'],
                  })
                }}
              >
                <IconRefresh size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
      {query.isError && (
        <div className="bg-destructive/10 border-2 border-destructive p-4 text-destructive">
          Error: {query.error?.message.toString()}
        </div>
      )}
      {query.isSuccess && (
        <div>
          {query.data.length === 0 ? (
            <div className="text-muted-foreground">No token accounts found.</div>
          ) : (
            <table className="w-full border-2 border-border">
              <thead>
                <tr className="border-b-2 border-border bg-card">
                  <th className="text-left p-4 font-bold text-foreground uppercase text-sm tracking-wide">Public Key</th>
                  <th className="text-left p-4 font-bold text-foreground uppercase text-sm tracking-wide">Mint</th>
                  <th className="text-right p-4 font-bold text-foreground uppercase text-sm tracking-wide">Balance</th>
                </tr>
              </thead>
              <tbody>
                {items?.map(({ account, pubkey }) => (
                  <tr key={pubkey.toString()} className="border-b border-border">
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <span className="font-mono">
                          <ExplorerLink label={ellipsify(pubkey.toString())} path={`account/${pubkey.toString()}`} />
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        <span className="font-mono">
                          <ExplorerLink
                            label={ellipsify(account.data.parsed.info.mint)}
                            path={`account/${account.data.parsed.info.mint.toString()}`}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="text-right p-4">
                      <span className="font-mono text-foreground">{account.data.parsed.info.tokenAmount.uiAmount}</span>
                    </td>
                  </tr>
                ))}

                {(query.data?.length ?? 0) > 5 && (
                  <tr>
                    <td colSpan={4} className="text-center p-4">
                      <button
                        className="px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-border hover:border-accent transition-colors"
                        onClick={() => setShowAll(!showAll)}
                      >
                        {showAll ? 'Show Less' : 'Show All'}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export function AccountTransactions({ address }: { address: PublicKey }) {
  const query = useGetSignatures({ address })
  const [showAll, setShowAll] = useState(false)

  const items = useMemo(() => {
    if (showAll) return query.data
    return query.data?.slice(0, 5)
  }, [query.data, showAll])

  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <h2 className="text-2xl font-bold text-foreground">Transaction History</h2>
        <div className="space-x-2">
          {query.isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent"></div>
          ) : (
            <button
              className="p-2 border-2 border-border hover:border-accent transition-colors"
              onClick={() => query.refetch()}
            >
              <IconRefresh size={16} />
            </button>
          )}
        </div>
      </div>
      {query.isError && (
        <div className="bg-destructive/10 border-2 border-destructive p-4 text-destructive">
          Error: {query.error?.message.toString()}
        </div>
      )}
      {query.isSuccess && (
        <div>
          {query.data.length === 0 ? (
            <div className="text-muted-foreground">No transactions found.</div>
          ) : (
            <table className="w-full border-2 border-border">
              <thead>
                <tr className="border-b-2 border-border bg-card">
                  <th className="text-left p-4 font-bold text-foreground uppercase text-sm tracking-wide">Signature</th>
                  <th className="text-right p-4 font-bold text-foreground uppercase text-sm tracking-wide">Slot</th>
                  <th className="text-left p-4 font-bold text-foreground uppercase text-sm tracking-wide">Block Time</th>
                  <th className="text-right p-4 font-bold text-foreground uppercase text-sm tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {items?.map((item) => (
                  <tr key={item.signature} className="border-b border-border">
                    <td className="p-4 font-mono">
                      <ExplorerLink path={`tx/${item.signature}`} label={ellipsify(item.signature, 8)} />
                    </td>
                    <td className="font-mono text-right p-4">
                      <ExplorerLink path={`block/${item.slot}`} label={item.slot.toString()} />
                    </td>
                    <td className="p-4 text-muted-foreground">{new Date((item.blockTime ?? 0) * 1000).toISOString()}</td>
                    <td className="text-right p-4">
                      {item.err ? (
                        <span className="px-2 py-1 text-xs font-bold bg-destructive/10 text-destructive border border-destructive/30" title={JSON.stringify(item.err)}>
                          Failed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-bold bg-accent/10 text-accent border border-accent/30">
                          Success
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {(query.data?.length ?? 0) > 5 && (
                  <tr>
                    <td colSpan={4} className="text-center p-4">
                      <button
                        className="px-4 py-2 text-sm font-bold uppercase tracking-wide border-2 border-border hover:border-accent transition-colors"
                        onClick={() => setShowAll(!showAll)}
                      >
                        {showAll ? 'Show Less' : 'Show All'}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

function BalanceSol({ balance }: { balance: number }) {
  return <span>{Math.round((balance / LAMPORTS_PER_SOL) * 100000) / 100000}</span>
}

function ModalReceive({ hide, show, address }: { hide: () => void; show: boolean; address: PublicKey }) {
  return (
    <AppModal title="Receive" hide={hide} show={show}>
      <p className="text-muted-foreground">Receive assets by sending them to your public key:</p>
      <code className="block p-4 bg-background border-2 border-border text-foreground font-mono text-sm break-all">{address.toString()}</code>
    </AppModal>
  )
}

function ModalAirdrop({ hide, show, address }: { hide: () => void; show: boolean; address: PublicKey }) {
  const mutation = useRequestAirdrop({ address })
  const [amount, setAmount] = useState('2')

  return (
    <AppModal
      hide={hide}
      show={show}
      title="Airdrop"
      submitDisabled={!amount || mutation.isPending}
      submitLabel="Request Airdrop"
      submit={() => mutation.mutateAsync(parseFloat(amount)).then(() => hide())}
    >
      <input
        disabled={mutation.isPending}
        type="number"
        step="any"
        min="1"
        placeholder="Amount"
        className="w-full px-4 py-2 bg-background border-2 border-border text-foreground focus:outline-none focus:border-accent disabled:opacity-50"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
    </AppModal>
  )
}

function ModalSend({ hide, show, address }: { hide: () => void; show: boolean; address: PublicKey }) {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const solanaWallet = useMemo(() => wallets[0], [wallets])
  const mutation = useTransferSol({ address })
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('1')

  if (!address || !authenticated || !solanaWallet) {
    return <div className="text-muted-foreground">Wallet not connected</div>
  }

  return (
    <AppModal
      hide={hide}
      show={show}
      title="Send"
      submitDisabled={!destination || !amount || mutation.isPending}
      submitLabel="Send"
      submit={() => {
        mutation
          .mutateAsync({
            destination: new PublicKey(destination),
            amount: parseFloat(amount),
          })
          .then(() => hide())
      }}
    >
      <input
        disabled={mutation.isPending}
        type="text"
        placeholder="Destination"
        className="w-full px-4 py-2 bg-background border-2 border-border text-foreground focus:outline-none focus:border-accent disabled:opacity-50"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />
      <input
        disabled={mutation.isPending}
        type="number"
        step="any"
        min="1"
        placeholder="Amount"
        className="w-full px-4 py-2 bg-background border-2 border-border text-foreground focus:outline-none focus:border-accent disabled:opacity-50"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
    </AppModal>
  )
}
