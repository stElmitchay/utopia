'use client'

import { IconTrash } from '@tabler/icons-react'
import { useQuery } from '@tanstack/react-query'
import { ReactNode, useState, useRef, useEffect, useMemo } from 'react'
import { AppModal } from '../ui/ui-layout'
import { ClusterNetwork, useCluster } from './cluster-data-access'
import { Connection } from '@solana/web3.js'

export function ExplorerLink({ path, label, className }: { path: string; label: string; className?: string }) {
  const { getExplorerUrl } = useCluster()
  return (
    <a
      href={getExplorerUrl(path)}
      target="_blank"
      rel="noopener noreferrer"
      className={className ? className : `link font-mono`}
    >
      {label}
    </a>
  )
}

export function ClusterChecker({ children }: { children: ReactNode }) {
  const { cluster } = useCluster()
  const connection = useMemo(() => new Connection(cluster.endpoint, 'confirmed'), [cluster.endpoint])

  const query = useQuery({
    queryKey: ['version', { cluster, endpoint: connection.rpcEndpoint }],
    queryFn: () => connection.getVersion(),
    retry: 1,
  })

  if (query.isLoading) {
    return null
  }
  
  if (query.isError || !query.data) {
    return (
      <div className="bg-yellow-500/10 border-2 border-yellow-500/40 p-4 flex items-center justify-center gap-4">
        <span className="text-foreground">
          Error connecting to cluster <strong>{cluster.name}</strong>
        </span>
        <button
          className="px-3 py-1 text-sm font-bold uppercase tracking-wide bg-card border-2 border-border hover:border-accent transition-colors"
          onClick={() => query.refetch()}
        >
          Refresh
        </button>
      </div>
    )
  }
  
  return children
}

export function ClusterUiSelect() {
  const { clusters, setCluster, cluster } = useCluster()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span>{cluster.name}</span>
        <svg
          className={`ml-1.5 h-4 w-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {showDropdown && (
        <div 
          className="absolute right-0 mt-2 w-40 rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 z-10"
        >
          {clusters.map((item) => (
            <button
              key={item.name}
              className={`flex w-full items-center px-4 py-2 text-sm ${
                item.active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => {
                setCluster(item)
                setShowDropdown(false)
              }}
            >
              {item.active && (
                <svg className="mr-2 h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              <span className={item.active ? 'ml-2' : ''}>{item.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ClusterUiModal({ hideModal, show }: { hideModal: () => void; show: boolean }) {
  const { addCluster } = useCluster()
  const [name, setName] = useState('')
  const [network, setNetwork] = useState<ClusterNetwork | undefined>()
  const [endpoint, setEndpoint] = useState('')

  return (
    <AppModal
      title={'Add Cluster'}
      hide={hideModal}
      show={show}
      submit={() => {
        try {
          new Connection(endpoint)
          if (name) {
            addCluster({ name, network, endpoint })
            hideModal()
          } else {
            console.log('Invalid cluster name')
          }
        } catch {
          console.log('Invalid cluster endpoint')
        }
      }}
      submitLabel="Save"
    >
      <input
        type="text"
        placeholder="Name"
        className="w-full px-4 py-2 bg-background border-2 border-border text-foreground focus:outline-none focus:border-accent"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Endpoint"
        className="w-full px-4 py-2 bg-background border-2 border-border text-foreground focus:outline-none focus:border-accent"
        value={endpoint}
        onChange={(e) => setEndpoint(e.target.value)}
      />
      <select
        className="w-full px-4 py-2 bg-background border-2 border-border text-foreground focus:outline-none focus:border-accent"
        value={network}
        onChange={(e) => setNetwork(e.target.value as ClusterNetwork)}
      >
        <option value={undefined}>Select a network</option>
        <option value={ClusterNetwork.Devnet}>Devnet</option>
        <option value={ClusterNetwork.Testnet}>Testnet</option>
        <option value={ClusterNetwork.Mainnet}>Mainnet</option>
      </select>
    </AppModal>
  )
}

export function ClusterUiTable() {
  const { clusters, setCluster, deleteCluster } = useCluster()
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-2 border-border">
        <thead>
          <tr className="border-b-2 border-border bg-card">
            <th className="text-left p-4 font-bold text-foreground uppercase text-sm tracking-wide">Name / Network / Endpoint</th>
            <th className="text-center p-4 font-bold text-foreground uppercase text-sm tracking-wide">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clusters.map((item) => (
            <tr key={item.name} className={`border-b border-border ${item?.active ? 'bg-accent/5' : ''}`}>
              <td className="p-4 space-y-2">
                <div className="whitespace-nowrap space-x-2">
                  <span className="text-xl font-bold text-foreground">
                    {item?.active ? (
                      item.name
                    ) : (
                      <button
                        title="Select cluster"
                        className="text-accent hover:underline"
                        onClick={() => setCluster(item)}
                      >
                        {item.name}
                      </button>
                    )}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">Network: {item.network ?? 'custom'}</span>
                <div className="whitespace-nowrap text-muted-foreground text-xs font-mono">{item.endpoint}</div>
              </td>
              <td className="p-4 space-x-2 whitespace-nowrap text-center">
                <button
                  disabled={item?.active}
                  className="p-2 border-2 border-border hover:border-destructive hover:text-destructive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    if (!window.confirm('Are you sure?')) return
                    deleteCluster(item)
                  }}
                >
                  <IconTrash size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
