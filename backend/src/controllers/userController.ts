import { Request, Response } from 'express';
import { db } from '../config/firebase.js';

// No changes to getUserProfile, getUserBalance, or updateUserBalance
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's balance from Firestore
    const balanceDoc = await db.collection('balance').doc(userId).get();
    const balance = balanceDoc.exists ? balanceDoc.data() : { amount: 0, currency: 'INR' };

    res.json({
      username: userDoc.data()?.username,
      email: userDoc.data()?.email,
      balance: balance
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

export const getUserBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const balanceDoc = await db.collection('balance').doc(userId).get();
    
    if (balanceDoc.exists) {
      return res.json(balanceDoc.data());
    } else {
      // Create balance document if it doesn't exist
      const defaultBalance = {
        amount: 0,
        currency: 'INR',
        lastUpdated: new Date().toISOString(),
      };
      
      await db.collection('balance').doc(userId).set(defaultBalance);
      return res.json(defaultBalance);
    }
  } catch (error) {
    console.error('Error getting user balance:', error);
    return res.status(500).json({ error: 'Failed to get user balance' });
  }
};

export const updateUserBalance = async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || amount === undefined) {
      return res.status(400).json({ error: 'User ID and amount are required' });
    }

    const balanceRef = db.collection('balance').doc(userId);
    
    // Use a transaction to ensure data consistency
    const newBalance = await db.runTransaction(async (transaction) => {
      const balanceDoc = await transaction.get(balanceRef);
      
      if (balanceDoc.exists) {
        const currentBalance = balanceDoc.data()?.amount || 0;
        const updatedBalance = currentBalance + Number(amount);
        
        if (amount < 0 && updatedBalance < 0) {
          throw new Error(`Insufficient balance: current balance ${currentBalance}, attempted withdrawal ${Math.abs(amount)}`);
        }
        
        transaction.update(balanceRef, {
          amount: updatedBalance,
          lastUpdated: new Date().toISOString(),
        });
        
        return updatedBalance;
      } else {
        if (amount < 0) {
          throw new Error(`Insufficient balance: no balance document exists, attempted withdrawal ${Math.abs(amount)}`);
        }
        
        const newBalance = {
          amount: Number(amount),
          currency: 'INR',
          lastUpdated: new Date().toISOString(),
        };
        
        transaction.set(balanceRef, newBalance);
        return Number(amount);
      }
    });
    
    return res.json({ success: true, newBalance });
  } catch (error: unknown) {
    console.error('Error updating user balance:', error);
    
    if (error instanceof Error && error.message.includes('Insufficient balance')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Failed to update user balance' });
  }
};

/**
 * [REVISED V3] Captures the user's IP address and identifies its version (IPv4/IPv6).
 */
export const captureUserIP = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    let userIpAddress: string | undefined;
    const forwardedForHeader = req.headers['x-forwarded-for'];

    if (typeof forwardedForHeader === 'string') {
      userIpAddress = forwardedForHeader.split(',')[0].trim();
    }

    if (!userIpAddress) {
      userIpAddress = req.ip;
    }

    if (!userIpAddress) {
        console.error('CRITICAL: Could not determine any IP address from headers.');
        return res.status(400).json({ error: 'Could not determine IP address.' });
    }
    
    // --- NEW: Identify if the IP is IPv4 or IPv6 ---
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipVersion = ipv4Regex.test(userIpAddress) ? 'IPv4' : 'IPv6';

    console.log(`Determined IP Address: ${userIpAddress} (Version: ${ipVersion})`);
    
    const timestamp = new Date().toISOString();
    
    // Store IP address and its version in Firestore
    const ipLogRef = db.collection('userIPLogs').doc(userId);
    await ipLogRef.set({
      ipAddress: userIpAddress,
      ipVersion: ipVersion, // Store the version
      rawXForwardedFor: forwardedForHeader || 'not-set',
      reqIp: req.ip,
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: timestamp,
    }, { merge: true });

    // Also update the user's main document
    const userRef = db.collection('users').doc(userId);
    await userRef.set({
        currentIP: userIpAddress,
        currentIPVersion: ipVersion, // Store the version here too
        lastIPUpdate: timestamp
    }, { merge: true });

    res.json({ 
      success: true, 
      ipAddress: userIpAddress,
      ipVersion: ipVersion, // Return the version in the API response
      timestamp: timestamp 
    });
  } catch (error) {
    console.error('Error capturing user IP:', error);
    res.status(500).json({ error: 'Failed to capture IP address' });
  }
};