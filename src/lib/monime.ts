/**
 * Monime API Service Layer
 *
 * This module provides a type-safe interface to interact with Monime's API
 * for managing financial accounts, internal transfers, checkout sessions, and webhooks.
 *
 * @see https://docs.monime.io/api-reference
 */

// ============================================================================
// Types
// ============================================================================

export interface MonimeConfig {
  apiKey: string
  spaceId: string
  mainFinancialAccountId: string
  apiUrl?: string
  apiVersion?: string
}

export interface MonimeAmount {
  currency: string  // e.g., "SLE" for Sierra Leone Leone
  value: number     // Amount in minor units (cents)
}

export interface MonimeFinancialAccount {
  id: string
  name: string
  currency: string
  balance: {
    available: MonimeAmount
  }
  status?: 'active' | 'inactive' | 'frozen'
  metadata?: Record<string, any>
  createTime: string
  updateTime: string
}

export interface MonimeInternalTransfer {
  id: string
  amount: MonimeAmount
  sourceFinancialAccount: { id: string }
  destinationFinancialAccount: { id: string }
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled'
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface MonimeCheckoutSession {
  id: string
  amount: MonimeAmount
  financialAccountId: string
  checkoutUrl: string
  status: 'active' | 'completed' | 'expired' | 'cancelled'
  allowedPaymentMethods?: string[]
  successUrl?: string
  cancelUrl?: string
  metadata?: Record<string, any>
  createdAt: string
  expiresAt: string
}

export interface MonimeMomo {
  id: string
  name: string
  code: string
  country: string
  logo?: string
}

export interface MonimeWebhook {
  id: string
  url: string
  events: string[]
  enabled: boolean
  secret: string
  createdAt: string
}

export interface MonimeError {
  type: string
  code: string
  message: string
  param?: string
}

// ============================================================================
// Monime Client Class
// ============================================================================

export class MonimeClient {
  private config: Required<MonimeConfig>

  constructor(config: MonimeConfig) {
    this.config = {
      apiKey: config.apiKey,
      spaceId: config.spaceId,
      mainFinancialAccountId: config.mainFinancialAccountId,
      apiUrl: config.apiUrl || 'https://api.monime.io',
      apiVersion: config.apiVersion || 'v1'
    }

    if (!this.config.apiKey) {
      throw new Error('Monime API key is required')
    }
    if (!this.config.spaceId) {
      throw new Error('Monime Space ID is required')
    }
    if (!this.config.mainFinancialAccountId) {
      throw new Error('Monime Main Financial Account ID is required')
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private get baseUrl(): string {
    return `${this.config.apiUrl}/${this.config.apiVersion}`
  }

  private get headers(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Monime-Version': `caph.2025-08-23`,
      'Monime-Space-Id': this.config.spaceId
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers
      }
    })

    const data = await response.json()

    if (!response.ok || data.success === false) {
      // Monime wraps errors in { success: false, messages: [...] }
      const errorMessage = data.messages?.[0] || data.message || 'Unknown error'
      const errorCode = data.code || response.status
      throw new Error(
        `Monime API Error: ${errorMessage} (${errorCode})`
      )
    }

    // Monime wraps successful responses in { success: true, result: {...} }
    return (data.result !== undefined ? data.result : data) as T
  }

  /**
   * Convert major units (SLE) to minor units (cents)
   * Example: 100 SLE → 10000 cents
   */
  public static toMinorUnits(amount: number): number {
    return Math.round(amount * 100)
  }

  /**
   * Convert minor units (cents) to major units (SLE)
   * Example: 10000 cents → 100 SLE
   */
  public static toMajorUnits(amount: number): number {
    return amount / 100
  }

  // ==========================================================================
  // Financial Accounts
  // ==========================================================================

  /**
   * Create a new financial account for a user
   */
  async createFinancialAccount(params: {
    name: string
    currency?: string
    metadata?: Record<string, any>
  }): Promise<MonimeFinancialAccount> {
    // Generate idempotency key from metadata or random UUID
    const idempotencyKey = params.metadata?.utopia_user_id || crypto.randomUUID()

    return this.request<MonimeFinancialAccount>('/financial-accounts', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify({
        name: params.name,
        currency: params.currency || 'SLE',
        metadata: params.metadata || {}
      })
    })
  }

  /**
   * Get financial account details including balance
   */
  async getFinancialAccount(
    accountId: string
  ): Promise<MonimeFinancialAccount> {
    return this.request<MonimeFinancialAccount>(
      `/financial-accounts/${accountId}?withBalance=true`
    )
  }

  /**
   * Get balance of a financial account (returns amount in major units)
   */
  async getBalance(accountId: string): Promise<number> {
    const account = await this.getFinancialAccount(accountId)
    return MonimeClient.toMajorUnits(account.balance.available.value)
  }

  /**
   * List all financial accounts
   */
  async listFinancialAccounts(params?: {
    limit?: number
    offset?: number
  }): Promise<{ data: MonimeFinancialAccount[], hasMore: boolean }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.offset) queryParams.set('offset', params.offset.toString())

    return this.request<{ data: MonimeFinancialAccount[], hasMore: boolean }>(
      `/financial-accounts?${queryParams.toString()}`
    )
  }

  /**
   * Update financial account metadata
   */
  async updateFinancialAccount(
    accountId: string,
    params: {
      name?: string
      metadata?: Record<string, any>
    }
  ): Promise<MonimeFinancialAccount> {
    return this.request<MonimeFinancialAccount>(
      `/financial-accounts/${accountId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(params)
      }
    )
  }

  // ==========================================================================
  // Internal Transfers
  // ==========================================================================

  /**
   * Create an internal transfer between financial accounts
   * @param amount - Amount in major units (SLE)
   */
  async createInternalTransfer(params: {
    sourceAccountId: string
    destinationAccountId: string
    amount: number
    currency?: string
    metadata?: Record<string, any>
  }): Promise<MonimeInternalTransfer> {
    return this.request<MonimeInternalTransfer>('/internal-transfers', {
      method: 'POST',
      body: JSON.stringify({
        amount: {
          currency: params.currency || 'SLE',
          value: MonimeClient.toMinorUnits(params.amount)
        },
        sourceFinancialAccount: { id: params.sourceAccountId },
        destinationFinancialAccount: { id: params.destinationAccountId },
        metadata: params.metadata || {}
      })
    })
  }

  /**
   * Get internal transfer details
   */
  async getInternalTransfer(
    transferId: string
  ): Promise<MonimeInternalTransfer> {
    return this.request<MonimeInternalTransfer>(
      `/internal-transfers/${transferId}`
    )
  }

  /**
   * List internal transfers
   */
  async listInternalTransfers(params?: {
    sourceAccountId?: string
    destinationAccountId?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ data: MonimeInternalTransfer[], hasMore: boolean }> {
    const queryParams = new URLSearchParams()
    if (params?.sourceAccountId) {
      queryParams.set('source_account_id', params.sourceAccountId)
    }
    if (params?.destinationAccountId) {
      queryParams.set('destination_account_id', params.destinationAccountId)
    }
    if (params?.status) queryParams.set('status', params.status)
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.offset) queryParams.set('offset', params.offset.toString())

    return this.request<{ data: MonimeInternalTransfer[], hasMore: boolean }>(
      `/internal-transfers?${queryParams.toString()}`
    )
  }

  // ==========================================================================
  // Checkout Sessions (Payment Collection)
  // ==========================================================================

  /**
   * Create a checkout session for user to deposit credits
   * @param amount - Amount in major units (SLE)
   */
  async createCheckoutSession(params: {
    amount: number
    financialAccountId: string
    currency?: string
    allowedPaymentMethods?: string[]
    successUrl?: string
    cancelUrl?: string
    metadata?: Record<string, any>
  }): Promise<MonimeCheckoutSession> {
    return this.request<MonimeCheckoutSession>('/checkout-sessions', {
      method: 'POST',
      body: JSON.stringify({
        amount: {
          currency: params.currency || 'SLE',
          value: MonimeClient.toMinorUnits(params.amount)
        },
        financialAccountId: params.financialAccountId,
        allowedPaymentMethods: params.allowedPaymentMethods || [
          'orange_money',
          'afrimoney'
        ],
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        metadata: params.metadata || {}
      })
    })
  }

  /**
   * Get checkout session details
   */
  async getCheckoutSession(sessionId: string): Promise<MonimeCheckoutSession> {
    return this.request<MonimeCheckoutSession>(
      `/checkout-sessions/${sessionId}`
    )
  }

  /**
   * List checkout sessions
   */
  async listCheckoutSessions(params?: {
    financialAccountId?: string
    status?: string
    limit?: number
    offset?: number
  }): Promise<{ data: MonimeCheckoutSession[], hasMore: boolean }> {
    const queryParams = new URLSearchParams()
    if (params?.financialAccountId) {
      queryParams.set('financial_account_id', params.financialAccountId)
    }
    if (params?.status) queryParams.set('status', params.status)
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.offset) queryParams.set('offset', params.offset.toString())

    return this.request<{ data: MonimeCheckoutSession[], hasMore: boolean }>(
      `/checkout-sessions?${queryParams.toString()}`
    )
  }

  // ==========================================================================
  // Mobile Money Providers (Momos)
  // ==========================================================================

  /**
   * Get list of available mobile money providers for a country
   */
  async listMomos(country: string = 'SL'): Promise<MonimeMomo[]> {
    const response = await this.request<{ data: MonimeMomo[] }>(
      `/momos?country=${country}`
    )
    return response.data
  }

  /**
   * Get specific mobile money provider details
   */
  async getMomo(momoId: string): Promise<MonimeMomo> {
    return this.request<MonimeMomo>(`/momos/${momoId}`)
  }

  // ==========================================================================
  // Webhooks
  // ==========================================================================

  /**
   * Create a webhook endpoint
   */
  async createWebhook(params: {
    url: string
    events: string[]
    enabled?: boolean
  }): Promise<MonimeWebhook> {
    return this.request<MonimeWebhook>('/webhooks', {
      method: 'POST',
      body: JSON.stringify({
        url: params.url,
        events: params.events,
        enabled: params.enabled ?? true
      })
    })
  }

  /**
   * List all webhooks
   */
  async listWebhooks(): Promise<{ data: MonimeWebhook[] }> {
    return this.request<{ data: MonimeWebhook[] }>('/webhooks')
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request<void>(`/webhooks/${webhookId}`, {
      method: 'DELETE'
    })
  }

  // ==========================================================================
  // Webhook Signature Verification
  // ==========================================================================

  /**
   * Verify webhook signature using HMAC
   * @param payload - The raw webhook payload as string
   * @param signature - The signature from the webhook header
   * @param secret - Your webhook secret from Monime
   */
  static async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    try {
      const encoder = new TextEncoder()
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )

      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(payload)
      )

      const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      return signature === expectedSignature
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      return false
    }
  }
}

// ============================================================================
// Singleton Instance (Server-side only)
// ============================================================================

let monimeClientInstance: MonimeClient | null = null

/**
 * Get Monime client instance (singleton)
 * Should only be used on server-side (API routes, server components)
 */
export function getMonimeClient(): MonimeClient {
  if (!monimeClientInstance) {
    const apiKey = process.env.MONIME_SECRET_KEY
    const spaceId = process.env.MONIME_SPACE_ID
    const mainAccountId = process.env.MONIME_MAIN_FINANCIAL_ACCOUNT_ID

    if (!apiKey || !spaceId || !mainAccountId) {
      throw new Error(
        'Missing Monime configuration. Please set MONIME_SECRET_KEY, MONIME_SPACE_ID, and MONIME_MAIN_FINANCIAL_ACCOUNT_ID environment variables.'
      )
    }

    monimeClientInstance = new MonimeClient({
      apiKey,
      spaceId,
      mainFinancialAccountId: mainAccountId,
      apiUrl: process.env.MONIME_API_URL,
      apiVersion: process.env.MONIME_API_VERSION
    })
  }

  return monimeClientInstance
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Deduct credits from user account and transfer to main account
 * @param userAccountId - User's Monime financial account ID
 * @param amount - Amount in credits (major units)
 * @param metadata - Additional metadata for the transfer
 */
export async function deductCredits(
  userAccountId: string,
  amount: number,
  metadata?: Record<string, any>
): Promise<MonimeInternalTransfer> {
  const client = getMonimeClient()

  return client.createInternalTransfer({
    sourceAccountId: userAccountId,
    destinationAccountId: client['config'].mainFinancialAccountId,
    amount,
    metadata
  })
}

/**
 * Refund credits back to user account
 * @param userAccountId - User's Monime financial account ID
 * @param amount - Amount in credits (major units)
 * @param metadata - Additional metadata for the refund
 */
export async function refundCredits(
  userAccountId: string,
  amount: number,
  metadata?: Record<string, any>
): Promise<MonimeInternalTransfer> {
  const client = getMonimeClient()

  return client.createInternalTransfer({
    sourceAccountId: client['config'].mainFinancialAccountId,
    destinationAccountId: userAccountId,
    amount,
    metadata: { ...metadata, type: 'refund' }
  })
}

/**
 * Check if user has sufficient credits
 * @param userAccountId - User's Monime financial account ID
 * @param requiredAmount - Required amount in credits (major units)
 */
export async function hasSufficientCredits(
  userAccountId: string,
  requiredAmount: number
): Promise<boolean> {
  const client = getMonimeClient()
  const balance = await client.getBalance(userAccountId)
  return balance >= requiredAmount
}
