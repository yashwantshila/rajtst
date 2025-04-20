import axios from 'axios';
import { expect } from 'chai';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
let authToken: string;
let testUserId: string;

// These tests should be run on a test environment with sample data
describe('User Balance API', function() {
  this.timeout(10000); // 10 second timeout
  
  before(async () => {
    // Setup: Get authentication token for testing
    // This depends on your auth implementation
    // For example:
    /*
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword'
    });
    authToken = loginResponse.data.token;
    testUserId = loginResponse.data.user.uid;
    */
    
    // Replace this with actual implementation
    console.log('Set up your test authentication here');
  });
  
  it('should get user balance', async function() {
    if (!authToken || !testUserId) {
      this.skip();
    }
    
    const response = await axios.get(`${API_URL}/user/balance/${testUserId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    expect(response.status).to.equal(200);
    expect(response.data).to.have.property('amount');
    expect(response.data).to.have.property('currency');
  });
  
  it('should update user balance', async function() {
    if (!authToken || !testUserId) {
      this.skip();
    }
    
    // First get current balance
    const balanceResponse = await axios.get(`${API_URL}/user/balance/${testUserId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    const currentBalance = balanceResponse.data.amount;
    const amountToAdd = 10; // Add 10 to balance
    
    // Update balance
    const updateResponse = await axios.post(
      `${API_URL}/user/balance/update`,
      {
        userId: testUserId,
        amount: amountToAdd
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
    
    expect(updateResponse.status).to.equal(200);
    expect(updateResponse.data).to.have.property('success', true);
    expect(updateResponse.data).to.have.property('newBalance', currentBalance + amountToAdd);
    
    // Then verify it was updated correctly
    const verifyResponse = await axios.get(`${API_URL}/user/balance/${testUserId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    expect(verifyResponse.data.amount).to.equal(currentBalance + amountToAdd);
    
    // Cleanup: revert the balance back
    await axios.post(
      `${API_URL}/user/balance/update`,
      {
        userId: testUserId,
        amount: -amountToAdd
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      }
    );
  });
}); 